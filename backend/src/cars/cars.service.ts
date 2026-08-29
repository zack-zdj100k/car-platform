import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CarStatus, Prisma, ColorKind, ImageKind, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, type PaginatedResult } from '../common/dto/paginated-result';
import { slugify } from '../common/utils/slug';
import { anonymousIdentity, isRobot } from '../common/utils/visitor';
import type { Configuration } from '../config/configuration';
import { CarSort, QueryCarsDto } from './dto/query-cars.dto';
import type { CarImageDto } from './dto/car-spec-groups.dto';
import type { CreateCarDto } from './dto/create-car.dto';
import type { UpdateCarDto } from './dto/update-car.dto';

/** Public listing shape — deliberately lighter than the detail payload. */
const listSelect = {
  id: true,
  slug: true,
  model: true,
  year: true,
  trim: true,
  bodyType: true,
  price: true,
  promoPrice: true,
  currency: true,
  marketingDescription: true,
  // Cards show a TikTok badge for the cars that have a clip.
  videoUrl: true,
  isFeatured: true,
  isDemoData: true,
  status: true,
  createdAt: true,
  publishedAt: true,
  brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
  engine: { select: { fuelType: true, transmission: true, drivetrain: true, powerHp: true, displacementL: true } },
  images: {
    where: { kind: ImageKind.MAIN },
    select: { url: true, alt: true },
    orderBy: { sortOrder: 'asc' },
    take: 1,
  },
  colors: {
    where: { kind: ColorKind.EXTERIOR },
    select: { id: true, name: true, hexCode: true, finish: true, isDefault: true, imageUrl: true },
    orderBy: { sortOrder: 'asc' },
  },
  _count: { select: { favorites: true } },
} satisfies Prisma.CarSelect;

/** Full detail payload — every specification group (spec §13–§22). */
const detailInclude = {
  brand: true,
  engine: true,
  wheels: true,
  exterior: true,
  interior: true,
  technology: true,
  safety: true,
  dimensions: true,
  colors: { orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }] },
  images: { orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }] },
  translations: true,
  _count: { select: { favorites: true, views: true } },
} satisfies Prisma.CarInclude;

@Injectable()
export class CarsService {
  private readonly logger = new Logger(CarsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Configuration, true>,
  ) {}

  /** Only published, non-deleted vehicles are ever visible to the public. */
  private get publicScope(): Prisma.CarWhereInput {
    return { status: CarStatus.PUBLISHED, deletedAt: null };
  }

  private buildWhere(query: QueryCarsDto, scope: Prisma.CarWhereInput): Prisma.CarWhereInput {
    const and: Prisma.CarWhereInput[] = [scope];

    if (query.search) {
      // Spec §11 — search by brand and model.
      and.push({
        OR: [
          { model: { contains: query.search, mode: 'insensitive' } },
          { brand: { name: { contains: query.search, mode: 'insensitive' } } },
          { trim: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    if (query.brand?.length) and.push({ brand: { slug: { in: query.brand } } });
    if (query.model) and.push({ model: { contains: query.model, mode: 'insensitive' } });
    if (query.bodyType?.length) and.push({ bodyType: { in: query.bodyType } });
    if (query.seats) and.push({ seats: query.seats });
    if (query.featured) and.push({ isFeatured: true });

    if (query.fuelType?.length) and.push({ engine: { fuelType: { in: query.fuelType } } });
    if (query.transmission?.length) and.push({ engine: { transmission: { in: query.transmission } } });
    if (query.drivetrain?.length) and.push({ engine: { drivetrain: { in: query.drivetrain } } });

    if (query.year) {
      and.push({ year: query.year });
    } else if (query.yearMin !== undefined || query.yearMax !== undefined) {
      if (query.yearMin !== undefined && query.yearMax !== undefined && query.yearMin > query.yearMax) {
        throw new BadRequestException('yearMin cannot be greater than yearMax');
      }
      and.push({ year: { gte: query.yearMin, lte: query.yearMax } });
    }

    if (query.priceMin !== undefined || query.priceMax !== undefined) {
      if (query.priceMin !== undefined && query.priceMax !== undefined && query.priceMin > query.priceMax) {
        throw new BadRequestException('priceMin cannot be greater than priceMax');
      }
      and.push({ price: { gte: query.priceMin, lte: query.priceMax } });
    }

    // The videos page asks for the cars that actually have a clip, rather than
    // fetching the catalogue and discarding most of it in the browser.
    if (query.hasVideo) {
      and.push({ videoUrl: { not: null } });
    }

    return { AND: and };
  }

  private buildOrderBy(sort: CarSort): Prisma.CarOrderByWithRelationInput[] {
    switch (sort) {
      case CarSort.PRICE_ASC:
        return [{ price: 'asc' }, { id: 'asc' }];
      case CarSort.PRICE_DESC:
        return [{ price: 'desc' }, { id: 'asc' }];
      case CarSort.YEAR_ASC:
        return [{ year: 'asc' }, { id: 'asc' }];
      case CarSort.YEAR_DESC:
        return [{ year: 'desc' }, { id: 'asc' }];
      case CarSort.OLDEST:
        return [{ createdAt: 'asc' }, { id: 'asc' }];
      case CarSort.POPULAR:
        // Real view counts (spec §68), never an invented popularity score.
        return [{ views: { _count: 'desc' } }, { createdAt: 'desc' }];
      case CarSort.NEWEST:
      default:
        return [{ createdAt: 'desc' }, { id: 'asc' }];
    }
  }

  /** Public listing (spec §11, §12). */
  async findAll(query: QueryCarsDto, scope: Prisma.CarWhereInput = this.publicScope) {
    const where = this.buildWhere(query, scope);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.car.findMany({
        where,
        select: listSelect,
        orderBy: this.buildOrderBy(query.sort),
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.car.count({ where }),
    ]);

    return paginate(rows, total, query.page, query.pageSize);
  }

  /**
   * Filter facets for the Cars page sidebar.
   *
   * Derived from the published catalogue, so the UI never offers a filter that
   * would return nothing.
   */
  async findFacets() {
    const [brands, bodyTypes, fuelTypes, priceRange, yearRange, models] = await this.prisma.$transaction([
      this.prisma.car.groupBy({
        by: ['brandId'],
        where: this.publicScope,
        _count: true,
        orderBy: { brandId: 'asc' },
      }),
      this.prisma.car.groupBy({
        by: ['bodyType'],
        where: this.publicScope,
        _count: true,
        orderBy: { bodyType: 'asc' },
      }),
      this.prisma.carEngine.groupBy({
        by: ['fuelType'],
        where: { car: this.publicScope },
        _count: true,
        orderBy: { fuelType: 'asc' },
      }),
      this.prisma.car.aggregate({ where: this.publicScope, _min: { price: true }, _max: { price: true } }),
      this.prisma.car.aggregate({ where: this.publicScope, _min: { year: true }, _max: { year: true } }),
      this.prisma.car.findMany({
        where: this.publicScope,
        select: { model: true, brand: { select: { slug: true } } },
        orderBy: { model: 'asc' },
        distinct: ['model'],
      }),
    ]);

    const brandRows = await this.prisma.brand.findMany({
      where: { id: { in: brands.map((entry) => entry.brandId) } },
      select: { id: true, name: true, slug: true, logoUrl: true, country: true },
      orderBy: { name: 'asc' },
    });

    return {
      brands: brandRows.map((brand) => ({
        ...brand,
        count: brands.find((entry) => entry.brandId === brand.id)?._count ?? 0,
      })),
      models: models.map((entry) => ({ model: entry.model, brandSlug: entry.brand.slug })),
      bodyTypes: bodyTypes.map((entry) => ({ value: entry.bodyType, count: entry._count })),
      fuelTypes: fuelTypes.map((entry) => ({ value: entry.fuelType, count: entry._count })),
      price: { min: priceRange._min.price ?? 0, max: priceRange._max.price ?? 0 },
      year: { min: yearRange._min.year ?? 0, max: yearRange._max.year ?? 0 },
    };
  }

  /** Accepts either a cuid or a slug, so URLs stay readable (spec §13). */
  async findOne(idOrSlug: string, scope: Prisma.CarWhereInput = this.publicScope) {
    const car = await this.prisma.car.findFirst({
      where: { AND: [scope, { OR: [{ id: idOrSlug }, { slug: idOrSlug }] }] },
      include: detailInclude,
    });

    if (!car) {
      throw new NotFoundException('Vehicle not found');
    }

    return car;
  }

  async findFeatured(limit = 6) {
    return this.prisma.car.findMany({
      where: { ...this.publicScope, isFeatured: true },
      select: listSelect,
      orderBy: [{ publishedAt: 'desc' }],
      take: limit,
    });
  }

  /** Admin listing — includes drafts and archived vehicles. */
  async findAllForAdmin(query: QueryCarsDto): Promise<PaginatedResult<unknown>> {
    return this.findAll(query, { deletedAt: null });
  }

  async findOneForAdmin(idOrSlug: string) {
    return this.findOne(idOrSlug, {});
  }

  private async uniqueSlug(brandId: string, model: string, year: number, trim?: string | null, excludeId?: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id: brandId }, select: { name: true } });
    if (!brand) {
      throw new BadRequestException('The selected brand does not exist');
    }

    const base = slugify(brand.name, model, trim ?? undefined, year);
    let candidate = base;
    let suffix = 2;

    // Distinct trims of the same model would otherwise collide.
    while (
      await this.prisma.car.findFirst({
        where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
        select: { id: true },
      })
    ) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  /**
   * A promotion has to be a reduction.
   *
   * The vehicle page strikes the normal price through and shows this one
   * instead, so a promotional price at or above the normal one would read as a
   * discount while charging more. Refused with a clear message rather than
   * displayed.
   */
  private assertPromotionIsADiscount(promoPrice: number | undefined, price: Prisma.Decimal | number) {
    if (promoPrice === undefined || promoPrice === null) return;

    const normal = new Prisma.Decimal(price);
    if (new Prisma.Decimal(promoPrice).greaterThanOrEqualTo(normal)) {
      throw new BadRequestException(
        `The promotional price must be below the normal price of ${normal.toString()}.`,
      );
    }
  }

  /** Spec §46, §47 — create a vehicle with all specification groups. */
  async create(dto: CreateCarDto, adminId: string) {
    this.assertPromotionIsADiscount(dto.promoPrice, dto.price);

    const slug = await this.uniqueSlug(dto.brandId, dto.model, dto.year, dto.trim);
    const status = dto.status ?? CarStatus.DRAFT;

    const car = await this.prisma.car.create({
      data: {
        slug,
        brandId: dto.brandId,
        model: dto.model,
        year: dto.year,
        generation: dto.generation ?? null,
        trim: dto.trim ?? null,
        bodyType: dto.bodyType,
        segment: dto.segment ?? null,
        category: dto.category ?? null,
        doors: dto.doors ?? null,
        seats: dto.seats ?? null,
        price: new Prisma.Decimal(dto.price),
        promoPrice: dto.promoPrice !== undefined ? new Prisma.Decimal(dto.promoPrice) : null,
        currency: dto.currency ?? 'USD',
        marketingDescription: dto.marketingDescription ?? null,
        videoUrl: dto.videoUrl ?? null,
        description: dto.description ?? null,
        status,
        isFeatured: dto.isFeatured ?? false,
        publishedAt: status === CarStatus.PUBLISHED ? new Date() : null,
        createdById: adminId,
        ...(dto.engine ? { engine: { create: dto.engine } } : {}),
        ...(dto.wheels ? { wheels: { create: dto.wheels } } : {}),
        ...(dto.exterior ? { exterior: { create: dto.exterior } } : {}),
        ...(dto.interior ? { interior: { create: dto.interior } } : {}),
        ...(dto.technology ? { technology: { create: dto.technology } } : {}),
        ...(dto.safety ? { safety: { create: dto.safety } } : {}),
        ...(dto.dimensions ? { dimensions: { create: dto.dimensions } } : {}),
        ...(dto.colors?.length
          ? {
              colors: {
                create: dto.colors.map((color, index) => ({
                  kind: color.kind ?? ColorKind.EXTERIOR,
                  name: color.name,
                  hexCode: color.hexCode,
                  finish: color.finish ?? null,
                  imageUrl: color.imageUrl ?? null,
                  priceDelta: color.priceDelta !== undefined ? new Prisma.Decimal(color.priceDelta) : null,
                  isDefault: color.isDefault ?? index === 0,
                  sortOrder: color.sortOrder ?? index,
                })),
              },
            }
          : {}),
      },
      include: detailInclude,
    });

    /*
     * The photographs are written next, not alongside, so each can be attached
     * to the colour it shows — see `writeImages`. One transaction, so a car is
     * never left half-photographed.
     */
    if (dto.images?.length) {
      const withImages = await this.prisma.$transaction(async (tx) => {
        await this.writeImages(tx, car.id, dto.images!);
        return tx.car.findUniqueOrThrow({ where: { id: car.id }, include: detailInclude });
      });

      this.logger.log(`Car ${car.id} (${car.slug}) created by admin ${adminId}`);
      return withImages;
    }

    this.logger.log(`Car ${car.id} (${car.slug}) created by admin ${adminId}`);
    return car;
  }

  /**
   * Writes the car's photographs, attaching each to the colour it shows.
   *
   * Separate from the car write, and after it, because of an ordering problem
   * that cannot be solved inside a single nested write: supplying colours
   * replaces them, so the colours this car will have do not exist — and have no
   * ids — until that write has happened. An image can therefore only be linked
   * to a colour by reading the colours back afterwards, which is what this does.
   *
   * A name that matches no colour leaves the image attached to the car alone.
   * That is deliberate: a mistyped colour should cost a photograph its grouping,
   * not its existence.
   */
  private async writeImages(
    tx: Prisma.TransactionClient,
    carId: string,
    images: CarImageDto[],
  ): Promise<void> {
    await tx.carImage.deleteMany({ where: { carId } });
    if (images.length === 0) return;

    const colors = await tx.carColor.findMany({
      where: { carId },
      select: { id: true, name: true },
    });

    // Matched case-insensitively: "Basalt Grey" and "basalt grey" are one colour
    // to everyone except a string comparison.
    const byName = new Map(colors.map((color) => [color.name.trim().toLowerCase(), color.id]));

    await tx.carImage.createMany({
      data: images.map((image, index) => ({
        carId,
        colorId: image.colorName ? (byName.get(image.colorName.trim().toLowerCase()) ?? null) : null,
        kind: image.kind ?? ImageKind.GALLERY,
        url: image.url,
        alt: image.alt ?? null,
        label: image.label?.trim() || null,
        width: image.width ?? null,
        height: image.height ?? null,
        sortOrder: image.sortOrder ?? index,
      })),
    });
  }

  /** Spec §46 — edit. Spec groups are upserted so partial edits are safe. */
  async update(id: string, dto: UpdateCarDto, adminId: string) {
    const existing = await this.prisma.car.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        publishedAt: true,
        brandId: true,
        model: true,
        year: true,
        trim: true,
        price: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Vehicle not found');
    }

    // Compared against whatever the normal price will be after this edit.
    this.assertPromotionIsADiscount(dto.promoPrice, dto.price ?? existing.price);

    const identityChanged =
      (dto.brandId !== undefined && dto.brandId !== existing.brandId) ||
      (dto.model !== undefined && dto.model !== existing.model) ||
      (dto.year !== undefined && dto.year !== existing.year) ||
      (dto.trim !== undefined && dto.trim !== existing.trim);

    const nextStatus = dto.status ?? existing.status;
    const becomingPublished = nextStatus === CarStatus.PUBLISHED && existing.status !== CarStatus.PUBLISHED;

    const data: Prisma.CarUpdateInput = {
      ...(dto.brandId !== undefined ? { brand: { connect: { id: dto.brandId } } } : {}),
      ...(dto.model !== undefined ? { model: dto.model } : {}),
      ...(dto.year !== undefined ? { year: dto.year } : {}),
      ...(dto.generation !== undefined ? { generation: dto.generation } : {}),
      ...(dto.trim !== undefined ? { trim: dto.trim } : {}),
      ...(dto.bodyType !== undefined ? { bodyType: dto.bodyType } : {}),
      ...(dto.segment !== undefined ? { segment: dto.segment } : {}),
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      ...(dto.doors !== undefined ? { doors: dto.doors } : {}),
      ...(dto.seats !== undefined ? { seats: dto.seats } : {}),
      ...(dto.price !== undefined ? { price: new Prisma.Decimal(dto.price) } : {}),
      ...(dto.promoPrice !== undefined
        ? { promoPrice: dto.promoPrice === null ? null : new Prisma.Decimal(dto.promoPrice) }
        : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.marketingDescription !== undefined ? { marketingDescription: dto.marketingDescription } : {}),
      ...(dto.videoUrl !== undefined ? { videoUrl: dto.videoUrl || null } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {}),
      ...(becomingPublished ? { publishedAt: existing.publishedAt ?? new Date() } : {}),
      ...(identityChanged
        ? {
            slug: await this.uniqueSlug(
              dto.brandId ?? existing.brandId,
              dto.model ?? existing.model,
              dto.year ?? existing.year,
              dto.trim ?? existing.trim,
              id,
            ),
          }
        : {}),
      ...(dto.engine ? { engine: { upsert: { create: dto.engine, update: dto.engine } } } : {}),
      ...(dto.wheels ? { wheels: { upsert: { create: dto.wheels, update: dto.wheels } } } : {}),
      ...(dto.exterior ? { exterior: { upsert: { create: dto.exterior, update: dto.exterior } } } : {}),
      ...(dto.interior ? { interior: { upsert: { create: dto.interior, update: dto.interior } } } : {}),
      ...(dto.technology ? { technology: { upsert: { create: dto.technology, update: dto.technology } } } : {}),
      ...(dto.safety ? { safety: { upsert: { create: dto.safety, update: dto.safety } } } : {}),
      ...(dto.dimensions ? { dimensions: { upsert: { create: dto.dimensions, update: dto.dimensions } } } : {}),
    };

    /*
     * Supplying a collection replaces it; omitting it leaves it alone. Colours
     * referenced by an order keep that order's snapshot column intact.
     *
     * Only the kinds actually supplied are replaced. The admin form edits
     * exterior colours and sends those alone, and a blanket `deleteMany` then
     * destroyed every interior colour on the car each time it was saved — with
     * no way to notice, since the form never showed them in the first place.
     */
    if (dto.colors) {
      const kinds = [...new Set(dto.colors.map((color) => color.kind ?? ColorKind.EXTERIOR))];

      data.colors = {
        deleteMany: { kind: { in: kinds } },
        create: dto.colors.map((color, index) => ({
          kind: color.kind ?? ColorKind.EXTERIOR,
          name: color.name,
          hexCode: color.hexCode,
          finish: color.finish ?? null,
          imageUrl: color.imageUrl ?? null,
          priceDelta: color.priceDelta !== undefined ? new Prisma.Decimal(color.priceDelta) : null,
          isDefault: color.isDefault ?? index === 0,
          sortOrder: color.sortOrder ?? index,
        })),
      };
    }


    const car = await this.prisma.$transaction(async (tx) => {
      await tx.car.update({ where: { id }, data });

      // After the colours have been replaced, so an image can find its colour.
      if (dto.images) {
        await this.writeImages(tx, id, dto.images);
      }

      return tx.car.findUniqueOrThrow({ where: { id }, include: detailInclude });
    });

    this.logger.log(`Car ${id} updated by admin ${adminId}`);
    return car;
  }

  async setPublished(id: string, published: boolean, adminId: string) {
    const car = await this.prisma.car.findUnique({ where: { id }, select: { id: true, publishedAt: true } });
    if (!car) {
      throw new NotFoundException('Vehicle not found');
    }

    const updated = await this.prisma.car.update({
      where: { id },
      data: {
        status: published ? CarStatus.PUBLISHED : CarStatus.DRAFT,
        publishedAt: published ? (car.publishedAt ?? new Date()) : car.publishedAt,
      },
      select: { id: true, slug: true, status: true, publishedAt: true },
    });

    this.logger.log(`Car ${id} ${published ? 'published' : 'unpublished'} by admin ${adminId}`);
    return updated;
  }

  /**
   * Spec §46 delete, honouring spec §55.
   *
   * A vehicle with orders is archived rather than removed, so order history
   * survives. Only an untouched vehicle is deleted outright.
   */
  async remove(id: string, adminId: string) {
    const car = await this.prisma.car.findUnique({
      where: { id },
      select: { id: true, slug: true, _count: { select: { orders: true } } },
    });

    if (!car) {
      throw new NotFoundException('Vehicle not found');
    }

    if (car._count.orders > 0) {
      const archived = await this.prisma.car.update({
        where: { id },
        data: { status: CarStatus.ARCHIVED, deletedAt: new Date() },
        select: { id: true, slug: true, status: true, deletedAt: true },
      });
      this.logger.log(`Car ${id} archived (has ${car._count.orders} orders) by admin ${adminId}`);
      return {
        ...archived,
        archived: true,
        message: `This vehicle is referenced by ${car._count.orders} order(s) and has been archived instead of deleted, preserving order history.`,
      };
    }

    try {
      await this.prisma.car.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('This vehicle is referenced by other records and cannot be deleted.');
      }
      throw error;
    }

    this.logger.log(`Car ${id} deleted by admin ${adminId}`);
    return { id, slug: car.slug, archived: false, message: 'Vehicle deleted.' };
  }

  /**
   * Spec §68 — records one view by one person.
   *
   * "By one person" is the whole of the change. This used to write a row for
   * every request, with no user and no anonymous id attached, which made the
   * figures wrong in both directions at once: seven refreshes by one visitor
   * were seven views (measured, not supposed), robots were customers, and
   * because nothing identified the viewer, the number of *people* behind the
   * total could never be recovered from it.
   *
   * Three rules now, in order:
   *
   *   1. Robots are not an audience.
   *   2. Neither are you. An administrator browsing their own catalogue is not
   *      a visitor, and counting them makes a quiet site look busy to the one
   *      person who most needs the truth from it.
   *   3. The same person opening the same car again inside the dedupe window
   *      is the same visit. A second look an hour later is a new one.
   */
  async recordView(
    carId: string,
    viewer: {
      userId?: string;
      role?: Role;
      anonymousId?: string;
      referrer?: string;
      userAgent?: string;
      ip?: string;
    },
  ) {
    if (isRobot(viewer.userAgent)) return;
    if (viewer.role === Role.ADMIN) return;

    const { visitorSalt, viewDedupeMinutes: dedupeMinutes } = this.config.get('analytics', {
      infer: true,
    });

    const anonymousId = viewer.userId
      ? null
      : anonymousIdentity({
          cookieId: viewer.anonymousId,
          ip: viewer.ip,
          userAgent: viewer.userAgent,
          salt: visitorSalt,
        });

    const identity: Prisma.CarViewWhereInput = viewer.userId
      ? { userId: viewer.userId }
      : { anonymousId };

    /*
     * A viewer we cannot identify at all — no account, no cookie, no address —
     * is still counted, because they are still a visit. They simply cannot be
     * deduplicated, and `COUNT(DISTINCT …)` leaves them out of the visitor
     * figure rather than inventing a person for each row.
     */
    if (viewer.userId || anonymousId) {
      const recent = await this.prisma.carView.findFirst({
        where: {
          carId,
          ...identity,
          viewedAt: { gte: new Date(Date.now() - dedupeMinutes * 60 * 1000) },
        },
        select: { id: true },
      });

      if (recent) return;
    }

    await this.prisma.carView.create({
      data: {
        carId,
        userId: viewer.userId ?? null,
        anonymousId,
        referrer: viewer.referrer?.slice(0, 255) ?? null,
      },
    });
  }
}
