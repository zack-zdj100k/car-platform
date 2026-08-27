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
