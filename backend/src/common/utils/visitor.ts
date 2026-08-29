import { createHash } from 'node:crypto';

/**
 * Deciding who a visitor is, for analytics that count people rather than hits.
 *
 * Three things were wrong with counting every request:
 *
 *   1. Robots. Search engines, link previewers and uptime monitors visit
 *      constantly and buy nothing. Counted as customers they turn an empty site
 *      into a busy-looking one.
 *
 *   2. Reloads. One person pressing refresh seven times was seven views — a
 *      measured fact on this catalogue, not a hypothetical.
 *
 *   3. Anonymity without identity. Every signed-out view was stored with no
 *      user and no anonymous id, so the rows could be counted but never
 *      grouped: the number of *people* behind them was unknowable.
 *
 * Nothing here stores an address or a name. A visitor without a cookie is
 * reduced to an irreversible hash, which is enough to tell two people apart and
 * not enough to identify either.
 */

/**
 * Substrings that appear in the user agent of automated clients.
 *
 * Deliberately limited to things that announce themselves. A determined
 * scraper can lie, and no list would catch it; the purpose is to keep honest
 * robots out of the figures, not to win an arms race.
 */
const ROBOT_SIGNATURES = [
  'bot',
  'crawler',
  'spider',
  'slurp',
  'crawling',
  'facebookexternalhit',
  'embedly',
  'quora link preview',
  'pinterest',
  'whatsapp',
  'telegrambot',
  'discordbot',
  'headlesschrome',
  'lighthouse',
  'pagespeed',
  'gtmetrix',
  'pingdom',
  'uptimerobot',
  'statuscake',
  'semrush',
  'ahrefs',
  'mj12',
  'dotbot',
  'petalbot',
  'python-requests',
  'go-http-client',
  'curl/',
  'wget',
  'postman',
];

/**
 * Whether a user agent belongs to a robot.
 *
 * An unknown or empty agent counts as a person. That direction is chosen on
 * purpose: a browser with a stripped agent is rare but real, and refusing to
 * count them silently loses customers from the figures, which is worse than a
 * stray robot slipping in.
 */
export function isRobot(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  const agent = userAgent.toLowerCase();
  return ROBOT_SIGNATURES.some((signature) => agent.includes(signature));
}

/**
 * A stable, anonymous identity for a signed-out visitor.
 *
 * The browser's own `visitor_id` cookie is preferred — it survives a changed
 * address and distinguishes two people behind one connection. Without it the
 * address and user agent are hashed together as a fallback, so a visitor who
 * blocks cookies is still one visitor rather than one per page.
 *
 * The hash is one-way and salted with a per-installation secret, so the stored
 * value cannot be turned back into an address.
 */
export function anonymousIdentity(args: {
  cookieId?: string;
  ip?: string;
  userAgent?: string;
  salt: string;
}): string | null {
  const cookieId = args.cookieId?.trim();
  if (cookieId) return cookieId.slice(0, 64);

  if (!args.ip) return null;

  return createHash('sha256')
    .update(`${args.salt}:${args.ip}:${args.userAgent ?? ''}`)
    .digest('hex')
    .slice(0, 32);
}
