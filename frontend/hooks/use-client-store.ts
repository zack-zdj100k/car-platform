'use client';

import { useSyncExternalStore } from 'react';

/**
 * External-state helpers built on `useSyncExternalStore`.
 *
 * These replace the `useEffect(() => setState(...), [])` pattern. That pattern
 * triggers a second render pass on every mount, which React 19's lint rules
 * flag as a cascading render — and it tears during concurrent rendering.
 */

const noopSubscribe = () => () => undefined;

/**
 * True once running on the client. Use to gate markup that cannot be rendered
 * on the server (for example the resolved colour theme).
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

function subscribeToScroll(onChange: () => void): () => void {
  window.addEventListener('scroll', onChange, { passive: true });
  return () => window.removeEventListener('scroll', onChange);
}

/** Whether the page has scrolled past `threshold`, without any effect/setState. */
export function useScrolledPast(threshold = 8): boolean {
  return useSyncExternalStore(
    subscribeToScroll,
    () => window.scrollY > threshold,
    () => false,
  );
}

/**
 * Whether the header should step aside.
 *
 * True while the reader is moving down the page, false again the moment they
 * move back up or return to the top. It is a snapshot of a module-level value
 * rather than component state so that a scroll never schedules a render for
 * every subscriber in turn, and so the server snapshot is a plain `false`.
 *
 * `reveal` is exported for the cases a scroll position cannot describe: focus
 * arriving inside the header by keyboard, or a menu opening within it.
 */
let retreated = false;
let lastScrollY = 0;
const retreatListeners = new Set<() => void>();

function announceRetreat(next: boolean) {
  if (next === retreated) return;
  retreated = next;
  for (const listener of retreatListeners) listener();
}

function subscribeToRetreat(onChange: () => void): () => void {
  if (retreatListeners.size === 0) {
    lastScrollY = window.scrollY;
    window.addEventListener('scroll', onRetreatScroll, { passive: true });
  }
  retreatListeners.add(onChange);

  return () => {
    retreatListeners.delete(onChange);
    if (retreatListeners.size === 0) {
      window.removeEventListener('scroll', onRetreatScroll);
      announceRetreat(false);
    }
  };
}

function onRetreatScroll() {
  const y = Math.max(0, window.scrollY);
  const delta = y - lastScrollY;

  // A dead band, so a trackpad's jitter and the rubber-band at the end of a
  // page do not flap the header in and out.
  if (Math.abs(delta) < 6) return;
  lastScrollY = y;

  // The header always comes back at the top, whatever the direction of travel.
  announceRetreat(y > 96 && delta > 0);
}

export function useHeaderRetreated(): boolean {
  return useSyncExternalStore(
    subscribeToRetreat,
    () => retreated,
    () => false,
  );
}

/** Brings the header back for reasons a scroll position cannot see. */
export function revealHeader(): void {
  lastScrollY = typeof window === 'undefined' ? 0 : window.scrollY;
  announceRetreat(false);
}

const STORAGE_EVENT = 'cp:storage';

function subscribeToStorage(onChange: () => void): () => void {
  // `storage` covers other tabs; the custom event covers this one.
  window.addEventListener('storage', onChange);
  window.addEventListener(STORAGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(STORAGE_EVENT, onChange);
  };
}

/**
 * A JSON value in localStorage, read as external state so it stays in sync
 * across tabs and needs no mount effect.
 */
export function useLocalStorageValue(key: string): string | null {
  return useSyncExternalStore(
    subscribeToStorage,
    () => window.localStorage.getItem(key),
    () => null,
  );
}

export function writeLocalStorageValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
    window.dispatchEvent(new Event(STORAGE_EVENT));
  } catch {
    // A blocked or full quota must not break the interaction.
  }
}
