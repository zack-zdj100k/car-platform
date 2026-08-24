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
