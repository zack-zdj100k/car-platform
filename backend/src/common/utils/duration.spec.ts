import { durationToMs } from './duration';

describe('durationToMs', () => {
  it.each([
    ['900', 900_000],
    ['30s', 30_000],
    ['15m', 900_000],
    ['12h', 43_200_000],
    ['30d', 2_592_000_000],
    ['250ms', 250],
  ])('converts %s', (input, expected) => {
    expect(durationToMs(input)).toBe(expected);
  });

  it('rejects a malformed duration rather than silently returning zero', () => {
    expect(() => durationToMs('soon')).toThrow(/Invalid duration/);
    expect(() => durationToMs('')).toThrow(/Invalid duration/);
  });
});
