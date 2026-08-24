import { createHash, randomBytes } from 'node:crypto';

/** Opaque token for refresh and password-reset flows. */
export function generateOpaqueToken(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * Tokens are stored as SHA-256 digests (spec §67): a database disclosure must
 * not hand over usable sessions or reset links.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
