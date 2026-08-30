import { carsService } from '@/services/cars.service';
import { settingsService } from '@/services/admin.service';
import { ApiError } from '@/services/api-client';
import type { CarListItem, MarketingStat } from '@/types/api';

/**
 * Server-side fetch helpers.
 *
 * Every one degrades gracefully: if the API is unreachable the page still
 * renders with an empty section rather than a crash (spec §72).
 */

const REVALIDATE_CATALOGUE = 60;

export async function fetchFeaturedCars(): Promise<CarListItem[]> {
  try {
    return await carsService.featured({ next: { revalidate: REVALIDATE_CATALOGUE } });
  } catch (error) {
    logFailure('featured cars', error);
    return [];
  }
}

/** Every published vehicle that has a clip, for the videos page. */
export async function fetchCarsWithVideo(): Promise<CarListItem[]> {
  try {
    const page = await carsService.list(
      { hasVideo: true, pageSize: 100, sort: 'newest' },
      { next: { revalidate: REVALIDATE_CATALOGUE } },
    );
    return page.data;
  } catch (error) {
    logFailure('cars with video', error);
    return [];
  }
}

export async function fetchPublicSettings(): Promise<Record<string, Record<string, unknown>>> {
  try {
    /*
     * Thirty seconds, not five minutes.
     *
     * These are the values an administrator edits and then looks at the site to
     * check — the site name, the address, the marketing figures. Five minutes of
     * staring at the old value is long enough to conclude the save did not work
     * and to save it again.
     */
    return await settingsService.public({ next: { revalidate: 30 } });
  } catch (error) {
    logFailure('public settings', error);
    return {};
  }
}

/** Spec §33 — the four configurable marketing figures, in a fixed order. */
export function readMarketingStats(settings: Record<string, Record<string, unknown>>): MarketingStat[] {
  const group = settings['marketing-stats'] ?? {};
  const order = ['stats.carsListed', 'stats.brands', 'stats.visitors', 'stats.availability'];

  return order
    .map((key) => group[key])
    .filter((value): value is MarketingStat => {
      if (typeof value !== 'object' || value === null) return false;
      const candidate = value as Partial<MarketingStat>;
      return typeof candidate.label === 'string' && typeof candidate.caption === 'string';
    });
}

export function readSetting(
  settings: Record<string, Record<string, unknown>>,
  group: string,
  key: string,
): string {
  const value = settings[group]?.[key];
  return typeof value === 'string' ? value : '';
}

function logFailure(what: string, error: unknown): void {
  const detail = error instanceof ApiError ? `${error.status} ${error.message}` : String(error);
  // Server-side log only; the user sees an empty state, never a stack trace.
  console.error(`[server-api] could not load ${what}: ${detail}`);
}
