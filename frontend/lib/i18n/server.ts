import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './config';
import { getDictionary, type Dictionary } from './dictionaries';

/**
 * The visitor's language, on the server.
 *
 * The route map defines no locale segment, so the choice lives in a cookie.
 * Reading it here is what lets a page's title and description be rendered in
 * the right language on the first response — a `<title>` cannot be corrected
 * after hydration the way visible text can, and a bookmark or a shared link
 * keeps whatever it was.
 */
export async function serverLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function serverDictionary(): Promise<Dictionary> {
  return getDictionary(await serverLocale());
}
