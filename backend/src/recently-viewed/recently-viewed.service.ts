import { Injectable, Logger } from '@nestjs/common';
import { ColorKind, ImageKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/paginated-result';
import type { PaginationQueryDto } from '../common/dto/pagination-query.dto';

const recentCarSelect = {
  id: true,
  slug: true,
  model: true,
  year: true,
  price: true,
  currency: true,
  bodyType: true,
  brand: { select: { name: true, slug: true } },
  engine: { select: { fuelType: true, powerHp: true } },
  images: { where: { kind: ImageKind.MAIN }, select: { url: true, alt: true }, take: 1 },
  colors: {
    where: { kind: ColorKind.EXTERIOR },
    select: { name: true, hexCode: true, isDefault: true },
    orderBy: { sortOrder: 'asc' },
  },
} satisfies Prisma.CarSelect;

@Injectable()
export class RecentlyViewedService {
  private readonly logger = new Logger(RecentlyViewedService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Spec §52 — one row per user+car, timestamp refreshed on re-view.
   *
   * Never throws: this is a side effect of opening a car page, and a failure
   * here must not turn a successful page load into an error (spec §72).
   */
  async record(userId: string, carId: string): Promise<void> {
    try {
      await this.prisma.recentlyViewed.upsert({
        where: { userId_carId: { userId, carId } },
        update: { viewedAt: new Date() },
        create: { userId, carId },
      });
    } catch (error) {
      this.logger.warn(
        `Could not record view history for user ${userId} / car ${carId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** Spec §42 — most recent first. */
  async findAll(userId: string, query: PaginationQueryDto) {
    const where: Prisma.RecentlyViewedWhereInput = { userId, car: { deletedAt: null } };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.recentlyViewed.findMany({
        where,
        select: { id: true, viewedAt: true, car: { select: recentCarSelect } },
        orderBy: { viewedAt: 'desc' },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.recentlyViewed.count({ where }),
    ]);

    return paginate(rows, total, query.page, query.pageSize);
  }

  async clear(userId: string) {
    const result = await this.prisma.recentlyViewed.deleteMany({ where: { userId } });
    return { cleared: result.count };
  }

  async count(userId: string): Promise<number> {
    return this.prisma.recentlyViewed.count({ where: { userId, car: { deletedAt: null } } });
  }
}
