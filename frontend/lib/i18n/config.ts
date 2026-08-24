/** Spec §7 — French, Arabic and English. */
export const LOCALES = ['en', 'fr', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'cp_locale';

export const LOCALE_META: Record<Locale, { label: string; native: string; dir: 'ltr' | 'rtl' }> = {
  en: { label: 'English', native: 'English', dir: 'ltr' },
  fr: { label: 'French', native: 'Français', dir: 'ltr' },
  ar: { label: 'Arabic', native: 'العربية', dir: 'rtl' },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * The route map defines no locale segment, so the language is carried in a
 * cookie rather than the URL. This keeps every documented path exactly as
 * specified while still switching the whole interface.
 */
export function localeDirection(locale: Locale): 'ltr' | 'rtl' {
  return LOCALE_META[locale].dir;
}
