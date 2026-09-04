import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CarStatus, ImageKind, OrderStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { paginate } from '../common/dto/paginated-result';
import { generateOrderReference } from '../common/utils/reference';
import type { Configuration } from '../config/configuration';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import type { SetMeetingPlaceDto } from './dto/set-meeting-place.dto';
import type { QueryOrdersDto } from './dto/query-orders.dto';

const orderCarSelect = {
  id: true,
  slug: true,
  model: true,
  year: true,
  price: true,
  currency: true,
  brand: { select: { name: true, slug: true } },
  images: { where: { kind: ImageKind.MAIN }, select: { url: true, alt: true }, take: 1 },
} satisfies Prisma.CarSelect;

/**
 * Which statuses an order can be moved to: any of them, bar the one it is in.
 *
 * This was a fixed table of permitted moves in which COMPLETED was a dead end
 * and CANCELLED could only return to PENDING. The intention was that a finished
 * order could not quietly un-finish itself.
 *
 * Real sales do not behave like that. A customer who confirmed changes their
 * mind, a delivery falls through, an order is marked completed by mistake, or
 * one that was cancelled comes back weeks later — and the person who has to
 * record it is the one who was locked out. A rule that forces the owner of the
 * business to lie about what happened protects nothing.
 *
 * The safeguard was never the table. It is the history: every move is written
 * to `order_status_history` with who made it, when, and any note — so a
 * correction is visible as a correction, which is exactly what an audit needs.
 */
function allowedFrom(status: OrderStatus): OrderStatus[] {
  return Object.values(OrderStatus).filter((candidate) => candidate !== status);
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService<Configuration, true>,
  ) {}

  /**
   * Whether a signed-in account is required to submit an order.
   *
   * The system graph gates ordering behind authentication; master prompt §24/§54
   * allow guest orders. The setting decides, falling back to the environment
   * default — see docs/DECISIONS.md D-1.2.
   */
  private async requiresAuth(): Promise<boolean> {
    const setting = await this.prisma.setting.findUnique({ where: { key: 'orders.requireAuth' } });
    if (typeof setting?.value === 'boolean') {
      return setting.value;
    }
    return this.config.get('orders', { infer: true }).requireAuth;
  }

  /** Spec §24 — submit an order. */
  async create(dto: CreateOrderDto, user: AuthenticatedUser | undefined) {
    if (!user && (await this.requiresAuth())) {
      throw new UnauthorizedException('Please sign in to submit an order');
    }

    const car = await this.prisma.car.findFirst({
      where: {
        OR: [{ id: dto.carId }, { slug: dto.carId }],
        status: CarStatus.PUBLISHED,
        deletedAt: null,
      },
      select: { id: true, model: true, year: true, price: true, currency: true, brand: { select: { name: true } } },
    });

    if (!car) {
      throw new NotFoundException('This vehicle is not available for ordering');
    }

    // The colour must belong to this car — a mismatched id would otherwise
    // attach a foreign colour to the order.
    let selectedColorName: string | null = null;
    if (dto.selectedColorId) {
      const color = await this.prisma.carColor.findFirst({
        where: { id: dto.selectedColorId, carId: car.id },
        select: { id: true, name: true },
      });
      if (!color) {
        throw new BadRequestException('The selected colour is not available for this vehicle');
      }
      selectedColorName = color.name;
    }

    const order = await this.prisma.order.create({
      data: {
        reference: generateOrderReference(),
        userId: user?.id ?? null,
        carId: car.id,
        // Buyer details are stored on the order deliberately (spec §24): the
        // record stays accurate even if the customer edits their profile later.
        buyerName: dto.buyerName,
        buyerEmail: dto.buyerEmail,
        buyerPhone: dto.buyerPhone,
        selectedColorId: dto.selectedColorId ?? null,
        selectedColorName,
        message: dto.message ?? null,
        status: OrderStatus.PENDING,
        statusHistory: {
          create: { toStatus: OrderStatus.PENDING, note: 'Order submitted', changedById: user?.id ?? null },
        },
      },
      include: { car: { select: orderCarSelect } },
    });

    this.logger.log(`Order ${order.reference} created for car ${car.id}`);

    /*
     * Spec §26: the order is already committed. Notification failures are
     * logged in email_logs and never propagate to the customer — and, since
     * nothing about the response depends on them, neither does its timing.
     */
    const siteUrl = this.config.get('app', { infer: true }).siteUrl;
    const notificationData = {
      reference: order.reference,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      buyerPhone: order.buyerPhone,
      carName: `${car.brand.name} ${car.model} ${car.year}`,
      carPrice: `${car.currency} ${car.price.toString()}`,
      selectedColor: selectedColorName,
      adminUrl: `${siteUrl}/admin/orders`,
      submittedAt: order.createdAt,
    };

    this.notifications.dispatchOrderEmails(notificationData, order.id);

    return order;
  }

  /** Spec §38, §39 — a customer sees only their own orders. */
  async findMine(userId: string, query: QueryOrdersDto) {
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(query.status?.length ? { status: { in: query.status } } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        select: {
          id: true,
          reference: true,
          status: true,
          selectedColorName: true,
          createdAt: true,
          updatedAt: true,
          meetingAddress: true,
          meetingMapUrl: true,
          meetingNote: true,
          car: { select: orderCarSelect },
        },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(
      rows.map((row) => this.withoutUnconfirmedPlace(row)),
      total,
      query.page,
      query.pageSize,
    );
  }

  /** Spec §45, §46 — admin order management. */
  async findAllForAdmin(query: QueryOrdersDto) {
    const and: Prisma.OrderWhereInput[] = [];

    if (query.status?.length) and.push({ status: { in: query.status } });
    if (query.carId) and.push({ carId: query.carId });
    if (query.search) {
      and.push({
        OR: [
          { reference: { contains: query.search, mode: 'insensitive' } },
          { buyerName: { contains: query.search, mode: 'insensitive' } },
          { buyerEmail: { contains: query.search, mode: 'insensitive' } },
          { buyerPhone: { contains: query.search } },
        ],
      });
    }

    const where: Prisma.OrderWhereInput = and.length ? { AND: and } : {};

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: {
          car: { select: orderCarSelect },
          user: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(rows, total, query.page, query.pageSize);
  }

  async findOne(id: string, requester: AuthenticatedUser) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        car: { select: orderCarSelect },
        user: { select: { id: true, fullName: true, email: true } },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: { changedBy: { select: { id: true, fullName: true } } },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Ownership check happens server-side, on the record itself.
    if (requester.role !== Role.ADMIN && order.userId !== requester.id) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return requester.role === Role.ADMIN ? order : this.withoutUnconfirmedPlace(order);
  }

  /**
   * Removes the meeting place from an appointment that is not confirmed.
   *
   * The address is written when the owner knows which of their places the car
   * will be at, which can be before the customer is told anything — and a
   * customer reading an address on a request nobody has answered, or on one
   * that was cancelled, turns up to a closed door. Confirmed is the only state
   * in which the invitation is real, so it is the only state that carries it.
   *
   * Stripped here rather than left out of the query: the administration reads
   * the same record through the same method, and one of them has to see it.
   */
  private withoutUnconfirmedPlace<
    T extends {
      status: OrderStatus;
      meetingAddress: string | null;
      meetingMapUrl: string | null;
      meetingNote: string | null;
    },
  >(order: T): T {
    if (order.status === OrderStatus.CONFIRMED) return order;
    return { ...order, meetingAddress: null, meetingMapUrl: null, meetingNote: null };
  }

  async findByReference(reference: string, requester: AuthenticatedUser) {
    const order = await this.prisma.order.findUnique({ where: { reference }, select: { id: true } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.findOne(order.id, requester);
  }

  /**
   * The customer withdrawing their own appointment.
   *
   * Separate from the administrator's status change, and deliberately narrow:
   * it only ever cancels, only ever their own, and only while the appointment
   * is still open. Somebody who booked the wrong colour at midnight should not
   * have to telephone a showroom in the morning to undo it, and the alternative
   * — a customer who cannot correct their own mistake — produces a list of
   * appointments nobody trusts.
   *
   * It is a cancellation, not a deletion. The record stays, with the
   * cancellation written into its history like any other move, because it is
   * part of what happened.
   */
  async cancelMine(id: string, requester: AuthenticatedUser) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { id: true, reference: true, status: true, userId: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== requester.id) {
      throw new ForbiddenException('You do not have access to this order');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('This appointment is already cancelled');
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException(
        'This appointment is already completed. Contact us if something is wrong with it.',
      );
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
        include: { car: { select: orderCarSelect } },
      }),
      this.prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: order.status,
          toStatus: OrderStatus.CANCELLED,
          changedById: requester.id,
          note: 'Cancelled by the customer',
        },
      }),
    ]);

    this.logger.log(`Order ${order.reference}: ${order.status} → CANCELLED by its customer`);
    return updated;
  }

  /** Spec §25 — admin updates the status; every change is recorded. */
  async updateStatus(id: string, dto: UpdateOrderStatusDto, adminId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      // The colour comes too: completing a sale takes that car off the floor.
      select: { id: true, reference: true, status: true, selectedColorId: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === dto.status) {
      throw new BadRequestException(`This order is already ${dto.status.toLowerCase()}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id },
        data: { status: dto.status, adminNote: dto.note ?? undefined },
        include: { car: { select: orderCarSelect } },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: order.status,
          toStatus: dto.status,
          changedById: adminId,
          note: dto.note ?? null,
        },
      });

      /*
       * A completed sale takes one car off the floor.
       *
       * Written here, inside the same transaction as the status, because the
       * two facts are one fact: the vehicle left in that colour. Doing it by
       * hand afterwards means a catalogue that offers a car somebody has
       * already driven away.
       *
       * Only on the way *into* COMPLETED, and only for a counted colour. A
       * colour with no count is one the owner can order in, and decrementing
       * null into -1 would invent a shortage. A correction back out of
       * COMPLETED returns the car to the floor, since the sale did not happen
       * after all — and the owner can always type over the number regardless.
       */
      if (order.selectedColorId) {
        const entering = dto.status === OrderStatus.COMPLETED;
        const leaving = order.status === OrderStatus.COMPLETED;

        if (entering !== leaving) {
          const colour = await tx.carColor.findUnique({
            where: { id: order.selectedColorId },
            select: { id: true, name: true, stock: true },
          });

          if (colour?.stock != null) {
            const next = entering ? Math.max(0, colour.stock - 1) : colour.stock + 1;
            await tx.carColor.update({ where: { id: colour.id }, data: { stock: next } });
            this.logger.log(
              `Order ${order.reference}: ${colour.name} stock ${colour.stock} → ${next}` +
                (next === 0 ? ' — that colour is now sold out' : ''),
            );
          }
        }
      }

      return result;
    });

    this.logger.log(`Order ${order.reference}: ${order.status} → ${dto.status} by admin ${adminId}`);
    return updated;
  }

  /**
   * Records where a confirmed customer should come.
   *
   * Kept apart from the status: confirming an appointment happens on the
   * telephone, and deciding which of the business's places the car will be at
   * happens afterwards. The customer sees none of this until the appointment is
   * confirmed — before that there is nothing to come to, and an address on an
   * unanswered request sends somebody to a closed door.
   */
  async setMeetingPlace(id: string, dto: SetMeetingPlaceDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { id: true, reference: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // An empty string clears the field; an absent one leaves it alone. The
    // difference matters when an address is being corrected rather than added.
    const value = (given: string | undefined) =>
      given === undefined ? undefined : given.trim() === '' ? null : given.trim();

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        meetingAddress: value(dto.meetingAddress),
        meetingMapUrl: value(dto.meetingMapUrl),
        meetingNote: value(dto.meetingNote),
      },
      include: { car: { select: orderCarSelect } },
    });

    this.logger.log(`Order ${order.reference}: meeting place updated`);
    return updated;
  }

  /** Every status the order is not already in — see `allowedFrom`. */
  allowedTransitions(status: OrderStatus): OrderStatus[] {
    return allowedFrom(status);
  }

  async countForUser(userId: string): Promise<number> {
    return this.prisma.order.count({ where: { userId } });
  }
}
