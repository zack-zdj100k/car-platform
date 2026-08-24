import { Injectable, NotFoundException } from '@nestjs/common';
import { CarStatus, ColorKind, ImageKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/paginated-result';
import type { PaginationQueryDto } from '../common/dto/pagination-query.dto';

/** Fields the Favorites page displays (spec §41). */
const favoriteCarSelect = {
  id: true,
  slug: true,
  model: true,
  year: true,
  price: true,
  currency: true,
  bodyType: true,
  marketingDescription: true,
  brand: { select: { name: true, slug: true } },
  engine: { select: { engineType: true, fuelType: true, powerHp: true, displacementL: true } },
  images: { where: { kind: ImageKind.MAIN }, select: { url: true, alt: true }, take: 1 },
  colors: {
    where: { kind: ColorKind.EXTERIOR },
    select: { name: true, hexCode: true, isDefault: true },
    orderBy: { sortOrder: 'asc' },
  },
} satisfies Prisma.CarSelect;

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Spec §41 — favourites, newest first. */
  async findAll(userId: string, query: PaginationQueryDto) {
    const where: Prisma.FavoriteWhereInput = { userId, car: { deletedAt: null } };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.favorite.findMany({
        where,
        select: { id: true, createdAt: true, car: { select: favoriteCarSelect } },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.favorite.count({ where }),
    ]);

    return paginate(rows, total, query.page, query.pageSize);
  }

  /** Car ids only — lets the grid render heart states in one request. */
  async findIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.favorite.findMany({ where: { userId }, select: { carId: true } });
    return rows.map((row) => row.carId);
  }

  /** Idempotent: favouriting twice is a no-op, not a duplicate-key error. */
  async add(userId: string, carId: string) {
    const car = await this.prisma.car.findFirst({
      where: { id: carId, status: CarStatus.PUBLISHED, deletedAt: null },
      select: { id: true },
    });

    if (!car) {
      throw new NotFoundException('Vehicle not found');
    }

    const favorite = await this.prisma.favorite.upsert({
      where: { userId_carId: { userId, carId } },
      update: {},
      create: { userId, carId },
      select: { id: true, carId: true, createdAt: true },
    });

    return { ...favorite, favorited: true };
  }

  async remove(userId: string, carId: string) {
    const result = await this.prisma.favorite.deleteMany({ where: { userId, carId } });

    if (result.count === 0) {
      throw new NotFoundException('This vehicle is not in your favourites');
    }

    return { carId, favorited: false };
  }

  async count(userId: string): Promise<number> {
    return this.prisma.favorite.count({ where: { userId, car: { deletedAt: null } } });
  }
}
