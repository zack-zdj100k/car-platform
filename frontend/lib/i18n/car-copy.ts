import type { Locale } from './config';

/**
 * A vehicle's authored copy, in the reader's language.
 *
 * The car's own columns hold the text as the showroom wrote it — one language,
 * whichever they were working in. `car_translations` holds optional overlays,
 * and until now nothing read them: the interface switched language around a
 * description that stayed exactly as typed.
 *
 * Falling back field by field rather than row by row is deliberate. Somebody
 * who translates the short description this week and the long one next week
 * should see the half they have done in the new language and the other half
 * still readable — not a blank paragraph waiting for them to finish.
 */
export interface CarCopy {
  marketingDescription: string | null;
  description: string | null;
  exteriorDescription: string | null;
  interiorDescription: string | null;
}

/**
 * What this needs of a vehicle, and no more.
 *
 * Written as a shape rather than as `CarDetail` because the catalogue's cards
 * use it too, and they are sent a lighter record — the short description and
 * its overlays, without the specification groups.
 */
interface Translatable {
  marketingDescription?: string | null;
  description?: string | null;
  exterior?: { description?: string | null } | null;
  interior?: { description?: string | null } | null;
  translations?: {
    locale: string;
    marketingDescription?: string | null;
    description?: string | null;
    exteriorDescription?: string | null;
    interiorDescription?: string | null;
  }[];
}

const filled = (value: string | null | undefined) => (value?.trim() ? value : null);

export function carCopy(car: Translatable, locale: Locale): CarCopy {
  const overlay = car.translations?.find((entry) => entry.locale === locale.toUpperCase());

  return {
    marketingDescription: filled(overlay?.marketingDescription) ?? car.marketingDescription ?? null,
    description: filled(overlay?.description) ?? car.description ?? null,
    exteriorDescription: filled(overlay?.exteriorDescription) ?? car.exterior?.description ?? null,
    interiorDescription: filled(overlay?.interiorDescription) ?? car.interior?.description ?? null,
  };
}
