import { slugify } from './slug';

describe('slugify', () => {
  it('joins parts into a lowercase hyphenated slug', () => {
    expect(slugify('Chery', 'Tiggo 8 Pro Max', 2024)).toBe('chery-tiggo-8-pro-max-2024');
  });

  it('strips diacritics so French and transliterated input stay clean', () => {
    expect(slugify('Citroën Élysée', 2023)).toBe('citroen-elysee-2023');
  });

  it('ignores null and undefined parts', () => {
    expect(slugify('MG', null, undefined, 2024)).toBe('mg-2024');
  });

  it('collapses punctuation and trims stray hyphens', () => {
    expect(slugify('  MG4  EV!! ', '2024')).toBe('mg4-ev-2024');
  });

  it('caps length so a slug can never overflow the column', () => {
    expect(slugify('a'.repeat(300)).length).toBeLessThanOrEqual(120);
  });
});
