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
 * Permitted status transitions (spec §25).
 *
 * Encoded explicitly so a completed order cannot silently revert to pending,
 * and every move is auditable.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CONTACTED, OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONTACTED: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED, OrderStatus.COMPLETED],
  CONFIRMED: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  CANCELLED: [OrderStatus.PENDING],
  COMPLETED: [],
};

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

    // Spec §26: the order is already committed. Notification failures are
    // logged in email_logs and never propagate to the customer.
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

    await Promise.allSettled([
      this.notifications.sendOrderNotification(notificationData, order.id),
      this.notifications.sendOrderConfirmation(notificationData, order.id),
    ]);

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
          car: { select: orderCarSelect },
        },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(rows, total, query.page, query.pageSize);
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

    return order;
  }

  async findByReference(reference: string, requester: AuthenticatedUser) {
    const order = await this.prisma.order.findUnique({ where: { reference }, select: { id: true } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.findOne(order.id, requester);
  }

  /** Spec §25 — admin updates the status; every change is recorded. */
  async updateStatus(id: string, dto: UpdateOrderStatusDto, adminId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { id: true, reference: true, status: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === dto.status) {
      throw new BadRequestException(`This order is already ${dto.status.toLowerCase()}`);
    }

    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        allowed.length === 0
          ? `A ${order.status.toLowerCase()} order can no longer change status.`
          : `Cannot move an order from ${order.status} to ${dto.status}. Allowed: ${allowed.join(', ')}.`,
      );
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id },
        data: { status: dto.status, adminNote: dto.note ?? undefined },
        include: { car: { select: orderCarSelect } },
      }),
      this.prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: order.status,
          toStatus: dto.status,
          changedById: adminId,
          note: dto.note ?? null,
        },
      }),
    ]);

    this.logger.log(`Order ${order.reference}: ${order.status} → ${dto.status} by admin ${adminId}`);
    return updated;
  }

  /** Valid next statuses, so the admin UI can offer only legal transitions. */
  allowedTransitions(status: OrderStatus): OrderStatus[] {
    return ALLOWED_TRANSITIONS[status];
  }

  async countForUser(userId: string): Promise<number> {
    return this.prisma.order.count({ where: { userId } });
  }
}
