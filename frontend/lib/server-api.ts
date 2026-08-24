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

export async function fetchPublicSettings(): Promise<Record<string, Record<string, unknown>>> {
  try {
    return await settingsService.public({ next: { revalidate: 300 } });
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
