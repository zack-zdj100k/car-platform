import { generateOrderReference } from './reference';

describe('generateOrderReference', () => {
  it('uses the ORD-year-suffix shape', () => {
    expect(generateOrderReference(new Date('2026-05-01T00:00:00Z'))).toMatch(/^ORD-2026-[A-Z2-9]{6}$/);
  });

  it('omits ambiguous characters so a reference can be read aloud', () => {
    const suffixes = Array.from({ length: 200 }, () => generateOrderReference().split('-')[2]).join('');
    expect(suffixes).not.toMatch(/[01OI]/);
  });

  it('is non-guessable — 200 references produce no collisions', () => {
    const references = new Set(Array.from({ length: 200 }, () => generateOrderReference()));
    expect(references.size).toBe(200);
  });
});
