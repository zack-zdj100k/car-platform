import { generateOpaqueToken, hashToken } from './tokens';

describe('token helpers', () => {
  it('generates url-safe tokens', () => {
    expect(generateOpaqueToken()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generates a different token every time', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateOpaqueToken()));
    expect(tokens.size).toBe(50);
  });

  it('hashes deterministically to a sha-256 digest', () => {
    const token = 'a-known-token';
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('never returns the token itself, so a database leak yields nothing usable', () => {
    const token = generateOpaqueToken();
    expect(hashToken(token)).not.toContain(token);
  });
});
