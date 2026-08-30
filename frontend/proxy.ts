import { NextResponse, type NextRequest } from 'next/server';

/**
 * Gives every visitor one anonymous identity, so analytics can count people.
 *
 * Named `proxy` and living in `proxy.ts`: Next 16 renamed the middleware
 * convention and warns on every start while the old name is used.
 *
 * The catalogue pages are rendered on the server, which means the API sees one
 * request per page from this server and nothing distinguishing the person who
 * asked for it. Before this cookie existed every signed-out view was stored
 * with no identity whatsoever: the rows could be counted, but the number of
 * people behind them was unknowable, and one visitor pressing refresh was
 * indistinguishable from a crowd.
 *
 * What is stored is a random identifier and nothing else — no name, no address,
 * no browsing history. It is first-party, it is never sent anywhere but this
 * site's own API, and clearing it makes the visitor a new one.
 */

export const VISITOR_COOKIE = 'visitor_id';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export default function proxy(request: NextRequest) {
  const existing = request.cookies.get(VISITOR_COOKIE)?.value;
  if (existing) return NextResponse.next();

  const visitorId = crypto.randomUUID();

  /*
   * Set on the request as well as the response. Without the first line the
   * cookie only exists from the *next* page onwards, so a visitor's first page
   * — the one that matters most, the one they landed on — would be recorded as
   * having no identity at all.
   */
  request.cookies.set(VISITOR_COOKIE, visitorId);
  const response = NextResponse.next({ request });

  response.cookies.set(VISITOR_COOKIE, visitorId, {
    /*
     * Readable by the page, deliberately.
     *
     * The browser is what reports a view now — it is the only place that knows
     * who is looking — and it has to send this id with that report. The value
     * is a random number and nothing else: it identifies no one, grants no
     * access, and is worth nothing to anybody who reads it. A session cookie
     * would stay httpOnly; this is not one.
     */
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ONE_YEAR_SECONDS,
    path: '/',
  });

  return response;
}

export const config = {
  /*
   * Pages only. Static assets, uploads and Next's own internals are not
   * visits, and running middleware for them would cost every image a
   * round trip through this function for nothing.
   */
  matcher: ['/((?!_next/static|_next/image|backend/|uploads/|images/|favicon.ico|robots.txt|sitemap.xml).*)'],
};
