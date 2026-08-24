import { Injectable } from '@nestjs/common';
import { CarStatus, ImageKind, OrderStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Admin analytics (spec §45, §68).
 *
 * Every figure here is a database aggregate. Nothing is hard-coded, estimated
 * or padded — spec §45 explicitly forbids fake analytics. The §33 marketing
 * figures are separate, editable settings; see docs/DECISIONS.md D-2.1.
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private get publishedScope(): Prisma.CarWhereInput {
    return { status: CarStatus.PUBLISHED, deletedAt: null };
  }

  private since(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  /** Spec §45 — overview cards. */
  async overview() {
    const thirtyDaysAgo = this.since(30);

    const [
      totalCars,
      publishedCars,
      draftCars,
      archivedCars,
      demoCars,
      totalUsers,
      newUsers,
      totalFavorites,
      totalOrders,
      pendingOrders,
      totalViews,
      viewsLast30,
      brandCount,
    ] = await this.prisma.$transaction([
      this.prisma.car.count({ where: { deletedAt: null } }),
      this.prisma.car.count({ where: this.publishedScope }),
      this.prisma.car.count({ where: { status: CarStatus.DRAFT, deletedAt: null } }),
      this.prisma.car.count({ where: { status: CarStatus.ARCHIVED } }),
      this.prisma.car.count({ where: { isDemoData: true, deletedAt: null } }),
      this.prisma.user.count({ where: { role: Role.CUSTOMER } }),
      this.prisma.user.count({ where: { role: Role.CUSTOMER, createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.favorite.count(),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.carView.count(),
      this.prisma.carView.count({ where: { viewedAt: { gte: thirtyDaysAgo } } }),
      this.prisma.brand.count(),
    ]);

    return {
      cars: { total: totalCars, published: publishedCars, draft: draftCars, archived: archivedCars, demo: demoCars },
      users: { total: totalUsers, newLast30Days: newUsers },
      favorites: { total: totalFavorites },
      orders: { total: totalOrders, pending: pendingOrders },
      views: { total: totalViews, last30Days: viewsLast30 },
      brands: { total: brandCount },
      generatedAt: new Date(),
    };
  }

  /** Spec §45 — most viewed cars, from real view rows. */
  async mostViewed(limit = 10, days?: number) {
    const grouped = await this.prisma.carView.groupBy({
      by: ['carId'],
      where: days ? { viewedAt: { gte: this.since(days) } } : undefined,
      _count: { _all: true },
      orderBy: { _count: { carId: 'desc' } },
      take: limit,
    });

    return this.attachCars(grouped.map((row) => ({ carId: row.carId, count: row._count._all })));
  }

  /** Spec §45 — most favourited cars. */
  async mostFavorited(limit = 10) {
    const grouped = await this.prisma.favorite.groupBy({
      by: ['carId'],
      _count: { _all: true },
      orderBy: { _count: { carId: 'desc' } },
      take: limit,
    });

    return this.attachCars(grouped.map((row) => ({ carId: row.carId, count: row._count._all })));
  }

  async mostOrdered(limit = 10) {
    const grouped = await this.prisma.order.groupBy({
      by: ['carId'],
      _count: { _all: true },
      orderBy: { _count: { carId: 'desc' } },
      take: limit,
    });

    return this.attachCars(grouped.map((row) => ({ carId: row.carId, count: row._count._all })));
  }

  /** Resolves grouped ids to display data, preserving the ranking order. */
  private async attachCars(rows: { carId: string; count: number }[]) {
    if (rows.length === 0) return [];

    const cars = await this.prisma.car.findMany({
      where: { id: { in: rows.map((row) => row.carId) } },
      select: {
        id: true,
        slug: true,
        model: true,
        year: true,
        price: true,
        currency: true,
        status: true,
        brand: { select: { name: true, slug: true } },
        images: { where: { kind: ImageKind.MAIN }, select: { url: true, alt: true }, take: 1 },
      },
    });

    const byId = new Map(cars.map((car) => [car.id, car]));

    return rows
      .map((row) => {
        const car = byId.get(row.carId);
        return car ? { car, count: row.count } : null;
      })
      .filter((entry): entry is { car: (typeof cars)[number]; count: number } => entry !== null);
  }

  /**
   * Spec §45 — user growth and cars added, bucketed by day.
   *
   * Uses date_trunc in SQL rather than pulling every row into memory.
   */
  async growth(days = 30) {
    const since = this.since(days);

    const [users, cars, orders, views] = await Promise.all([
      this.prisma.$queryRaw<{ day: Date; count: bigint }[]>`
        SELECT date_trunc('day', created_at) AS day, COUNT(*)::bigint AS count
        FROM users WHERE created_at >= ${since} AND role = 'CUSTOMER'
        GROUP BY 1 ORDER BY 1 ASC`,
      this.prisma.$queryRaw<{ day: Date; count: bigint }[]>`
        SELECT date_trunc('day', created_at) AS day, COUNT(*)::bigint AS count
        FROM cars WHERE created_at >= ${since} AND deleted_at IS NULL
        GROUP BY 1 ORDER BY 1 ASC`,
      this.prisma.$queryRaw<{ day: Date; count: bigint }[]>`
        SELECT date_trunc('day', created_at) AS day, COUNT(*)::bigint AS count
        FROM orders WHERE created_at >= ${since}
        GROUP BY 1 ORDER BY 1 ASC`,
      this.prisma.$queryRaw<{ day: Date; count: bigint }[]>`
        SELECT date_trunc('day', viewed_at) AS day, COUNT(*)::bigint AS count
        FROM car_views WHERE viewed_at >= ${since}
        GROUP BY 1 ORDER BY 1 ASC`,
    ]);

    const toSeries = (rows: { day: Date; count: bigint }[]) =>
      rows.map((row) => ({ date: row.day.toISOString().slice(0, 10), count: Number(row.count) }));

    return {
      rangeDays: days,
      users: toSeries(users),
      cars: toSeries(cars),
      orders: toSeries(orders),
      views: toSeries(views),
    };
  }

  /** Order counts per status, for the admin orders overview. */
  async orderBreakdown() {
    const grouped = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
      orderBy: { status: 'asc' },
    });
    const byStatus = Object.fromEntries(grouped.map((row) => [row.status, row._count._all]));

    return Object.values(OrderStatus).map((status) => ({
      status,
      count: byStatus[status] ?? 0,
    }));
  }

  /** Vehicle distribution by brand, body type and fuel type. */
  async catalogueBreakdown() {
    const [byBrand, byBodyType, byFuelType] = await Promise.all([
      this.prisma.car.groupBy({
        by: ['brandId'],
        where: this.publishedScope,
        _count: true,
        orderBy: { brandId: 'asc' },
      }),
      this.prisma.car.groupBy({
        by: ['bodyType'],
        where: this.publishedScope,
        _count: true,
        orderBy: { bodyType: 'asc' },
      }),
      this.prisma.carEngine.groupBy({
        by: ['fuelType'],
        where: { car: this.publishedScope },
        _count: true,
        orderBy: { fuelType: 'asc' },
      }),
    ]);

    const brands = await this.prisma.brand.findMany({
      where: { id: { in: byBrand.map((row) => row.brandId) } },
      select: { id: true, name: true },
    });
    const brandNames = new Map(brands.map((brand) => [brand.id, brand.name]));

    return {
      byBrand: byBrand
        .map((row) => ({ brand: brandNames.get(row.brandId) ?? 'Unknown', count: row._count }))
        .sort((a, b) => b.count - a.count),
      byBodyType: byBodyType.map((row) => ({ bodyType: row.bodyType, count: row._count })),
      byFuelType: byFuelType.map((row) => ({ fuelType: row.fuelType, count: row._count })),
    };
  }

  /** Email delivery health (spec §69) — surfaces silent notification failures. */
  async emailHealth() {
    const grouped = await this.prisma.emailLog.groupBy({
      by: ['status'],
      _count: { _all: true },
      orderBy: { status: 'asc' },
    });
    const recentFailures = await this.prisma.emailLog.findMany({
      where: { status: 'FAILED' },
      select: { id: true, to: true, template: true, error: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      counts: Object.fromEntries(grouped.map((row) => [row.status, row._count._all])),
      recentFailures,
    };
  }

  /** Everything the admin overview needs, in one round trip. */
  async dashboard() {
    const [overview, mostViewed, mostFavorited, growth, orderBreakdown, catalogue] = await Promise.all([
      this.overview(),
      this.mostViewed(5),
      this.mostFavorited(5),
      this.growth(30),
      this.orderBreakdown(),
      this.catalogueBreakdown(),
    ]);

    return { overview, mostViewed, mostFavorited, growth, orderBreakdown, catalogue };
  }
}
