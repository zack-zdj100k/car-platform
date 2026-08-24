import { randomBytes } from 'node:crypto';

/**
 * Human-quotable order reference, e.g. ORD-2026-4F7K2A.
 * The random suffix keeps references non-guessable, so one cannot be used to
 * probe for other customers' orders.
 */
export function generateOrderReference(now: Date = new Date()): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
  const bytes = randomBytes(6);
  const suffix = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  return `ORD-${now.getUTCFullYear()}-${suffix}`;
}
