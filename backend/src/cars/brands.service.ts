import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CarStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/utils/slug';
import type { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const brands = await this.prisma.brand.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { cars: { where: { status: CarStatus.PUBLISHED, deletedAt: null } } } },
      },
    });

    return brands.map(({ _count, ...brand }) => ({ ...brand, publishedCars: _count.cars }));
  }

  async findOne(idOrSlug: string) {
    const brand = await this.prisma.brand.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    return brand;
  }

  async create(dto: CreateBrandDto) {
    const slug = slugify(dto.name);
    const existing = await this.prisma.brand.findFirst({
      where: { OR: [{ slug }, { name: dto.name }] },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('A brand with that name already exists');
    }

    return this.prisma.brand.create({
      data: {
        name: dto.name,
        slug,
        country: dto.country ?? null,
        logoUrl: dto.logoUrl ?? null,
        description: dto.description ?? null,
        isFeatured: dto.isFeatured ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateBrandDto) {
    const brand = await this.prisma.brand.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    return this.prisma.brand.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name, slug: slugify(dto.name) } : {}),
        ...(dto.country !== undefined ? { country: dto.country } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {}),
      },
    });
  }

  async remove(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      select: { id: true, _count: { select: { cars: true } } },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    // Cars reference brands with onDelete: Restrict — refuse clearly rather than
    // surfacing a raw database error.
    if (brand._count.cars > 0) {
      throw new ConflictException(
        `This brand still has ${brand._count.cars} vehicle(s). Move or remove them before deleting the brand.`,
      );
    }

    await this.prisma.brand.delete({ where: { id } });
    return { id, deleted: true };
  }
}
