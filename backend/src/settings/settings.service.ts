import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CarStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateSettingDto, UpdateSettingsDto } from './dto/update-setting.dto';

/**
 * Website settings (spec §33, §75).
 *
 * Public settings are readable without authentication so the frontend can render
 * social links and the About page copy. Private settings — such as the order
 * notification address — are admin-only.
 */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Grouped key/value map of every public setting. */
  async findPublic() {
    const rows = await this.prisma.setting.findMany({
      where: { isPublic: true },
      select: { key: true, value: true, group: true },
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });

    const grouped: Record<string, Record<string, Prisma.JsonValue>> = {};
    for (const row of rows) {
      grouped[row.group] ??= {};
      grouped[row.group][row.key] = row.value;
    }

    if (grouped['marketing-stats']) {
      grouped['marketing-stats'] = await this.withRealFigures(grouped['marketing-stats']);
    }

    return grouped;
  }

  /**
   * Replaces the headline figures on the public pages with the true ones.
   *
   * These four numbers were stored as text and said "500+ Cars Listed", "50+
   * Brands" and "10K+ Visitors" on a catalogue of seventeen cars that had never
   * been published to anyone. A customer reading that is being told something
   * untrue, and it is the first thing they read.
   *
   * The counts are now taken from the database at the moment the page is built.
   * The wording beside each number stays editable in Administration › Settings,
   * so the labels can be translated or reworded; the number itself is no longer
   * something anybody has to remember to update.
   *
   * A figure of zero is dropped rather than displayed. On the day the site
   * opens there will genuinely have been no visitors, and "0 Visitors" is a
   * true statement that helps nobody — it returns on its own with the first
   * real one.
   */
  private async withRealFigures(
    stored: Record<string, Prisma.JsonValue>,
  ): Promise<Record<string, Prisma.JsonValue>> {
    const publishedScope = { status: CarStatus.PUBLISHED, deletedAt: null };
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [cars, brands, visitors] = await Promise.all([
      this.prisma.car.count({ where: publishedScope }),
      this.prisma.brand.count({ where: { cars: { some: publishedScope } } }),
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT COALESCE(user_id, anonymous_id))::bigint AS count
        FROM car_views WHERE viewed_at >= ${thirtyDaysAgo}`,
    ]);

    const real: Record<string, number> = {
      'stats.carsListed': cars,
      'stats.brands': brands,
      'stats.visitors': Number(visitors[0]?.count ?? 0),
    };

    const result: Record<string, Prisma.JsonValue> = {};

    for (const [key, value] of Object.entries(stored)) {
      const count = real[key];

      // Not a counted figure — "24/7 Platform Access" and the like. Kept as written.
      if (count === undefined) {
        result[key] = value;
        continue;
      }

      if (count === 0) continue;

      const caption =
        typeof value === 'object' && value !== null && !Array.isArray(value)
          ? (value as Record<string, unknown>).caption
          : undefined;

      result[key] = { label: String(count), caption: typeof caption === 'string' ? caption : key };
    }

    return result;
  }

  async findAllForAdmin() {
    return this.prisma.setting.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
      include: { updatedBy: { select: { id: true, fullName: true } } },
    });
  }

  async findOne(key: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) {
      throw new NotFoundException(`Setting "${key}" not found`);
    }
    return setting;
  }

  /**
   * Updates an existing key. Settings are seeded rather than created ad hoc, so
   * an unknown key is a client error rather than an implicit insert.
   */
  async update(key: string, dto: UpdateSettingDto, adminId: string) {
    await this.findOne(key);

    const updated = await this.prisma.setting.update({
      where: { key },
      data: {
        value: dto.value as Prisma.InputJsonValue,
        ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        updatedById: adminId,
      },
    });

    this.logger.log(`Setting "${key}" updated by admin ${adminId}`);
    return updated;
  }

  /** Bulk update in one transaction, so a partial save cannot occur. */
  async updateMany(dto: UpdateSettingsDto, adminId: string) {
    const keys = dto.settings.map((entry) => entry.key);
    const existing = await this.prisma.setting.findMany({
      where: { key: { in: keys } },
      select: { key: true },
    });

    const known = new Set(existing.map((row) => row.key));
    const unknown = keys.filter((key) => !known.has(key));
    if (unknown.length > 0) {
      throw new NotFoundException(`Unknown setting key(s): ${unknown.join(', ')}`);
    }

    await this.prisma.$transaction(
      dto.settings.map((entry) =>
        this.prisma.setting.update({
          where: { key: entry.key },
          data: { value: entry.value as Prisma.InputJsonValue, updatedById: adminId },
        }),
      ),
    );

    this.logger.log(`${dto.settings.length} setting(s) updated by admin ${adminId}`);
    return this.findAllForAdmin();
  }

  /** Typed read used by other services. */
  async getValue<T>(key: string, fallback: T): Promise<T> {
    const setting = await this.prisma.setting.findUnique({ where: { key }, select: { value: true } });
    return (setting?.value as T | undefined) ?? fallback;
  }
}
