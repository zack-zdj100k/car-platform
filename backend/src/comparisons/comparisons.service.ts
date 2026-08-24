import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CarStatus, ImageKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AddComparisonCarDto, CreateComparisonDto, SetComparisonCarsDto } from './dto/comparison.dto';

/**
 * Everything the comparison table compares (spec §43): identity, engine,
 * wheels/tyres, dimensions, interior, technology and safety.
 */
const comparisonCarSelect = {
  id: true,
  slug: true,
  model: true,
  year: true,
  trim: true,
  bodyType: true,
  segment: true,
  doors: true,
  seats: true,
  price: true,
  currency: true,
  brand: { select: { name: true, slug: true, logoUrl: true } },
  images: { where: { kind: ImageKind.MAIN }, select: { url: true, alt: true }, take: 1 },
  engine: true,
  wheels: true,
  dimensions: true,
  interior: true,
  technology: true,
  safety: true,
} satisfies Prisma.CarSelect;

const DEFAULT_MAX_CARS = 4;

@Injectable()
export class ComparisonsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Configurable via the `compare.maxCars` setting (spec §43, §75). */
  private async maxCars(): Promise<number> {
    const setting = await this.prisma.setting.findUnique({ where: { key: 'compare.maxCars' } });
    return typeof setting?.value === 'number' && setting.value > 1 ? setting.value : DEFAULT_MAX_CARS;
  }

  private async assertCarsExist(carIds: string[]): Promise<void> {
    if (carIds.length === 0) return;

    const found = await this.prisma.car.findMany({
      where: { id: { in: carIds }, status: CarStatus.PUBLISHED, deletedAt: null },
      select: { id: true },
    });

    if (found.length !== new Set(carIds).size) {
      throw new NotFoundException('One or more of the selected vehicles could not be found');
    }
  }

  private async load(userId: string, comparisonId: string) {
    const comparison = await this.prisma.comparison.findUnique({
      where: { id: comparisonId },
      include: {
        cars: { orderBy: { sortOrder: 'asc' }, include: { car: { select: comparisonCarSelect } } },
      },
    });

    if (!comparison) {
      throw new NotFoundException('Comparison not found');
    }

    // Ownership is verified server-side — a guessed id must not expose another
    // customer's comparison.
    if (comparison.userId !== userId) {
      throw new ForbiddenException('You do not have access to this comparison');
    }

    return comparison;
  }

  async findAll(userId: string) {
    return this.prisma.comparison.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        cars: { orderBy: { sortOrder: 'asc' }, include: { car: { select: comparisonCarSelect } } },
      },
    });
  }

  async findOne(userId: string, id: string) {
    return this.load(userId, id);
  }

  async create(userId: string, dto: CreateComparisonDto) {
    const carIds = [...new Set(dto.carIds ?? [])];
    const max = await this.maxCars();

    if (carIds.length > max) {
      throw new BadRequestException(`A comparison holds at most ${max} vehicles`);
    }

    await this.assertCarsExist(carIds);

    const comparison = await this.prisma.comparison.create({
      data: {
        userId,
        name: dto.name ?? null,
        cars: { create: carIds.map((carId, index) => ({ carId, sortOrder: index })) },
      },
      select: { id: true },
    });

    return this.load(userId, comparison.id);
  }

  async addCar(userId: string, comparisonId: string, dto: AddComparisonCarDto) {
    const comparison = await this.load(userId, comparisonId);
    const max = await this.maxCars();

    if (comparison.cars.some((entry) => entry.carId === dto.carId)) {
      // Already present — return the current state rather than erroring.
      return comparison;
    }

    if (comparison.cars.length >= max) {
      throw new BadRequestException(`A comparison holds at most ${max} vehicles. Remove one first.`);
    }

    await this.assertCarsExist([dto.carId]);

    await this.prisma.comparisonCar.create({
      data: { comparisonId, carId: dto.carId, sortOrder: comparison.cars.length },
    });
    await this.prisma.comparison.update({ where: { id: comparisonId }, data: { updatedAt: new Date() } });

    return this.load(userId, comparisonId);
  }

  async replaceCars(userId: string, comparisonId: string, dto: SetComparisonCarsDto) {
    await this.load(userId, comparisonId);
    const carIds = [...new Set(dto.carIds)];
    const max = await this.maxCars();

    if (carIds.length > max) {
      throw new BadRequestException(`A comparison holds at most ${max} vehicles`);
    }

    await this.assertCarsExist(carIds);

    await this.prisma.$transaction([
      this.prisma.comparisonCar.deleteMany({ where: { comparisonId } }),
      this.prisma.comparisonCar.createMany({
        data: carIds.map((carId, index) => ({ comparisonId, carId, sortOrder: index })),
      }),
    ]);

    return this.load(userId, comparisonId);
  }

  async removeCar(userId: string, comparisonId: string, carId: string) {
    await this.load(userId, comparisonId);

    const result = await this.prisma.comparisonCar.deleteMany({ where: { comparisonId, carId } });
    if (result.count === 0) {
      throw new NotFoundException('That vehicle is not part of this comparison');
    }

    return this.load(userId, comparisonId);
  }

  /** Spec §43 "Clear comparison" — empties it but keeps the saved comparison. */
  async clear(userId: string, comparisonId: string) {
    await this.load(userId, comparisonId);
    await this.prisma.comparisonCar.deleteMany({ where: { comparisonId } });
    return this.load(userId, comparisonId);
  }

  async remove(userId: string, comparisonId: string) {
    await this.load(userId, comparisonId);
    await this.prisma.comparison.delete({ where: { id: comparisonId } });
    return { id: comparisonId, deleted: true };
  }

  async count(userId: string): Promise<number> {
    return this.prisma.comparison.count({ where: { userId } });
  }
}
