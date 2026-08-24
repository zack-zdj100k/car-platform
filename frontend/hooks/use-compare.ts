'use client';

import { useCallback, useMemo } from 'react';
import { useLocalStorageValue, writeLocalStorageValue } from './use-client-store';

const STORAGE_KEY = 'cp_compare';
const MAX_CARS = 4;

function parse(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string').slice(0, MAX_CARS);
  } catch {
    return [];
  }
}

/**
 * Comparison tray (spec §43, §53).
 *
 * Selections live in localStorage so an anonymous visitor can build a
 * comparison before signing in; the dashboard then persists it through the API.
 * Read as external state, so it stays in sync across tabs.
 */
export function useCompare() {
  const raw = useLocalStorageValue(STORAGE_KEY);
  const ids = useMemo(() => parse(raw), [raw]);

  const persist = useCallback((next: string[]) => {
    writeLocalStorageValue(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const has = useCallback((carId: string) => ids.includes(carId), [ids]);

  const toggle = useCallback(
    (carId: string): { added: boolean; full?: boolean } => {
      if (ids.includes(carId)) {
        persist(ids.filter((entry) => entry !== carId));
        return { added: false };
      }
      if (ids.length >= MAX_CARS) {
        return { added: false, full: true };
      }
      persist([...ids, carId]);
      return { added: true };
    },
    [ids, persist],
  );

  const remove = useCallback((carId: string) => persist(ids.filter((entry) => entry !== carId)), [ids, persist]);
  const clear = useCallback(() => persist([]), [persist]);

  return { ids, has, toggle, remove, clear, count: ids.length, max: MAX_CARS };
}
