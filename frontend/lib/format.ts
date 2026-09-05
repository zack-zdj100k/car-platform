import type { Locale } from './i18n/config';
import { enumLabel } from './i18n/spec';

const INTL_LOCALE: Record<Locale, string> = { en: 'en-US', fr: 'fr-FR', ar: 'ar' };

/** Price formatting. Values arrive as decimal strings, never as floats. */
export function formatPrice(value: string | number, currency: string, locale: Locale = 'en'): string {
  const amount = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(amount)) return '—';

  try {
    return new Intl.NumberFormat(INTL_LOCALE[locale], {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString(INTL_LOCALE[locale])}`;
  }
}

export function formatNumber(value: number, locale: Locale = 'en'): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale]).format(value);
}

export function formatDate(value: string | Date, locale: Locale = 'en'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: 'medium' }).format(date);
}

export function formatDateTime(value: string | Date, locale: Locale = 'en'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function formatRelative(value: string | Date, locale: Locale = 'en'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(INTL_LOCALE[locale], { numeric: 'auto' });
  const thresholds: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];

  for (const [unit, size] of thresholds) {
    if (Math.abs(seconds) >= size) {
      return formatter.format(Math.round(seconds / size), unit);
    }
  }

  return formatter.format(seconds, 'second');
}

/**
 * A database enum in the reader's language.
 *
 * `PLUG_IN_HYBRID` used to become "Plug in hybrid" by lower-casing and
 * capitalising, which read as English under a French heading and turned SUV
 * into "Suv". The translated word is used where there is one; the tidying
 * stays as the fallback so a value added to the schema is still legible
 * before anybody has translated it.
 */
export function humaniseEnum(value: string | null | undefined, locale: Locale = 'en'): string {
  if (!value) return '—';
  const translated = enumLabel(value, locale);
  if (translated) return translated;
  const spaced = value.replace(/_/g, ' ').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Drivetrain and transmission, which are acronyms in English and words in the
 * other two — "AWD" is "transmission intégrale" in French, not an acronym a
 * French reader would recognise.
 */
export function formatAcronym(value: string | null | undefined, locale: Locale = 'en'): string {
  if (!value) return '—';
  const translated = enumLabel(value, locale);
  if (translated) return translated;
  return value.replace(/_/g, ' ');
}

export function formatMeasure(
  value: number | string | null | undefined,
  unit: string,
  locale: Locale = 'en',
): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric)) return '—';
  return `${formatNumber(numeric, locale)} ${unit}`;
}
