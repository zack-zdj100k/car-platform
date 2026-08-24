'use client';

import { useCallback, useMemo, useState } from 'react';
import { favoritesService } from '@/services/customer.service';
import { ApiError } from '@/services/api-client';
import { useAuth } from '@/providers/auth-provider';
import { useAsync } from './use-async';

const EMPTY: string[] = [];

/**
 * Favourite state for the whole session, fetched once as a set of ids so every
 * card can render its heart without its own request (spec §66).
 *
 * Server truth is loaded through useAsync; local overrides hold the optimistic
 * result of a toggle until the next load, so nothing is set from an effect.
 */
export function useFavorites() {
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<string[]>([]);

  const enabled = !authLoading && isAuthenticated && Boolean(token);

  const { data, isLoading } = useAsync<string[]>(
    () => favoritesService.ids({ token }),
    [token, enabled],
    { enabled },
  );

  const ids = useMemo(() => {
    const base = new Set(enabled ? (data ?? EMPTY) : EMPTY);
    for (const [carId, favorited] of Object.entries(overrides)) {
      if (favorited) base.add(carId);
      else base.delete(carId);
    }
    return base;
  }, [data, enabled, overrides]);

  const isFavorite = useCallback((carId: string) => ids.has(carId), [ids]);
  const isPending = useCallback((carId: string) => pending.includes(carId), [pending]);

  /** Optimistic toggle that rolls back if the request fails. */
  const toggle = useCallback(
    async (carId: string): Promise<{ favorited: boolean } | { error: string }> => {
      if (!token) return { error: 'unauthenticated' };

      const wasFavorite = ids.has(carId);
      setPending((current) => [...current, carId]);
      setOverrides((current) => ({ ...current, [carId]: !wasFavorite }));

      try {
        if (wasFavorite) await favoritesService.remove(carId, { token });
        else await favoritesService.add(carId, { token });
        return { favorited: !wasFavorite };
      } catch (error) {
        setOverrides((current) => ({ ...current, [carId]: wasFavorite }));
        return { error: error instanceof ApiError ? error.message : 'Could not update favourites' };
      } finally {
        setPending((current) => current.filter((entry) => entry !== carId));
      }
    },
    [ids, token],
  );

  return { ids, isFavorite, isPending, toggle, isLoading };
}
