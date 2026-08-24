import { Injectable } from '@nestjs/common';
import { ImageKind, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const cardCarSelect = {
  id: true,
  slug: true,
  model: true,
  year: true,
  price: true,
  currency: true,
  bodyType: true,
  brand: { select: { name: true, slug: true } },
  engine: { select: { engineType: true, fuelType: true, powerHp: true } },
  images: { where: { kind: ImageKind.MAIN }, select: { url: true, alt: true }, take: 1 },
} satisfies Prisma.CarSelect;

/**
 * Customer dashboard home (spec §40).
 *
 * One request returns the greeting data, the four summary cards and the recent
 * vehicles strip — all read from the database, none hard-coded.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(userId: string) {
    const [user, favoriteCount, recentCount, comparisonCount, orderCount, pendingOrders, recentlyViewed, favorites] =
      await this.prisma.$transaction([
        this.prisma.user.findUniqueOrThrow({
          where: { id: userId },
          select: { id: true, fullName: true, email: true, profileImage: true, createdAt: true },
        }),
        this.prisma.favorite.count({ where: { userId, car: { deletedAt: null } } }),
        this.prisma.recentlyViewed.count({ where: { userId, car: { deletedAt: null } } }),
        this.prisma.comparison.count({ where: { userId } }),
        this.prisma.order.count({ where: { userId } }),
        this.prisma.order.count({ where: { userId, status: OrderStatus.PENDING } }),
        this.prisma.recentlyViewed.findMany({
          where: { userId, car: { deletedAt: null } },
          select: { viewedAt: true, car: { select: cardCarSelect } },
          orderBy: { viewedAt: 'desc' },
          take: 6,
        }),
        this.prisma.favorite.findMany({
          where: { userId, car: { deletedAt: null } },
          select: { createdAt: true, car: { select: cardCarSelect } },
          orderBy: { createdAt: 'desc' },
          take: 4,
        }),
      ]);

    return {
      user,
      summary: {
        favorites: favoriteCount,
        recentlyViewed: recentCount,
        savedComparisons: comparisonCount,
        orders: orderCount,
        pendingOrders,
      },
      recentlyViewed,
      favorites,
    };
  }
}
