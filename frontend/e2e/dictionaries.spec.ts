import { expect, test } from '@playwright/test';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/config';

/**
 * Every string a component asks for actually exists.
 *
 * TypeScript cannot catch this: the English dictionary is typed with an index
 * signature, so `t.home.somethingMissing` compiles happily and yields
 * `undefined` at runtime. That is not a harmless blank — a caption missing from
 * English left every tile in the home page gallery with no accessible name,
 * which a screen reader announces as "button" and the audit failed on.
 *
 * French and Arabic are partial by design and fall back to English, so what
 * matters is that no leaf resolves to anything other than a non-empty string.
 */
const LOCALES: Locale[] = ['en', 'fr', 'ar'];

test.describe('Translations', () => {
  for (const locale of LOCALES) {
    test(`${locale} resolves every string`, () => {
      const dictionary = getDictionary(locale) as unknown as Record<string, Record<string, unknown>>;
      const empty: string[] = [];

      for (const [section, entries] of Object.entries(dictionary)) {
        for (const [key, value] of Object.entries(entries)) {
          if (typeof value !== 'string' || value.trim() === '') {
            empty.push(`${section}.${key}`);
          }
        }
      }

      expect(empty, `${locale} has strings that resolve to nothing`).toEqual([]);
    });
  }
});

/**
 * What a first-time visitor is shown.
 *
 * The rest of the suite runs with the language pinned to English by a cookie
 * in `playwright.config.ts`, so without this nothing would notice if the
 * default reverted. This clears that cookie and asks for the page the way a
 * stranger does.
 */
test.describe('The default language', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('is French for somebody arriving with no preference', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    // The switch reads "FR", and the navigation is in French.
    await expect(page.getByRole('link', { name: 'Accueil' }).first()).toBeVisible();
    await expect(page).toHaveTitle(/voitures/i);
  });

  test('an Arabic reader who chooses it gets a right-to-left page', async ({ page }) => {
    await page.context().addCookies([
      { name: 'cp_locale', value: 'ar', domain: 'localhost', path: '/' },
    ]);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});
