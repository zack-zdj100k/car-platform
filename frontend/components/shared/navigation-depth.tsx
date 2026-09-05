'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * How many times the reader has moved around inside the site.
 *
 * "Back" needs to know one thing: is there somewhere of ours to go back to? The
 * obvious answer, `document.referrer`, is wrong here — it is set when the
 * document loads and never again, so every click that the router handles
 * without a page load leaves it pointing at wherever the tab started. A reader
 * who came to a vehicle from their favourites still had a referrer naming the
 * page they had opened ten minutes earlier.
 *
 * `history.length` is no better: it counts the whole tab, other sites included.
 *
 * So this counts our own navigations. Zero means the reader arrived here
 * directly — a shared link, a search result, a new tab — and "back" has to fall
 * back to a sensible address instead of leaving the site.
 *
 * Module state rather than context: one number, read by a leaf component,
 * changing on every navigation. A provider would re-render the tree beneath it
 * each time to deliver something no layout is interested in.
 */
let visits = 0;
/*
 * The last path counted.
 *
 * React runs an effect twice on mount in development, which counted the page
 * the reader arrived on as two visits and made "back" believe there was
 * somewhere to go — on a tab opened straight onto a vehicle, it went back to
 * about:blank. Counting a path only when it changes is true under either
 * behaviour.
 */
let lastPath: string | null = null;

/** Navigations *after* the page the reader arrived on. */
export function navigationDepth(): number {
  return Math.max(0, visits - 1);
}

/** Mounted once, in the root layout. */
export function NavigationDepthTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // The route the reader arrived on counts as one, and is subtracted above.
    if (lastPath === pathname) return;
    lastPath = pathname;
    visits += 1;
  }, [pathname]);

  return null;
}

/** Reset between tests, and when a fresh document is loaded. */
export function resetNavigationDepth(): void {
  visits = 0;
  lastPath = null;
}
