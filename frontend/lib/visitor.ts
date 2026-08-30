import { cookies, headers } from 'next/headers';

/**
 * The headers that tell the API who is looking at a page.
 *
 * Catalogue pages are rendered on this server, so the request the API receives
 * comes from the server and not the browser: its address is this machine, its
 * user agent is Node, and it carries no cookie. Left alone, every visitor in
 * the world arrives at the API looking like the same anonymous stranger — which
 * is exactly what the view figures used to show.
 *
 * These four headers carry the real visitor across that gap: their anonymous
 * cookie, their browser, their address and where they came from. The API needs
 * all four — the cookie to recognise a returning visitor, the browser to
 * discard robots, the address as a fallback identity when cookies are blocked,
 * and the referrer to know how they found the site.
 */
export async function visitorHeaders(): Promise<Record<string, string>> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const result: Record<string, string> = {};

  const visitorId = cookieStore.get('visitor_id')?.value;
  if (visitorId) result['x-visitor-id'] = visitorId;

  const userAgent = headerList.get('user-agent');
  if (userAgent) result['x-visitor-agent'] = userAgent;

  const ip = clientIp(headerList);
  if (ip) result['x-visitor-ip'] = ip;

  const referrer = headerList.get('referer');
  if (referrer) result['x-visitor-referrer'] = referrer;

  return result;
}

/**
 * The visitor's address as seen by whatever sits in front of this server.
 *
 * `x-forwarded-for` accumulates a list as a request passes through proxies; the
 * first entry is the client. Only ever used as an input to a one-way hash — the
 * address itself is never stored.
 */
function clientIp(headerList: Headers): string | null {
  const forwarded = headerList.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headerList.get('x-real-ip');
}
