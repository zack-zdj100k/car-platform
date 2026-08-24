'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/services/api-client';

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  isLoading: boolean;
  isEmpty: boolean;
  reload: () => void;
}

interface Settled<T> {
  key: string;
  data: T | null;
  error: string | null;
}

/**
 * Client-side data loading with the four states spec §58 and §72 require:
 * loading, success, empty and error. Never leaves a blank screen.
 *
 * The loading state is *derived* by comparing the settled result's key against
 * the current one, rather than set from inside the effect. That avoids the extra
 * render pass a `setState`-in-effect would cause, and it means a dependency
 * change shows loading immediately instead of one frame late.
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: unknown[],
  options: { enabled?: boolean; isEmpty?: (data: T) => boolean } = {},
): AsyncState<T> {
  const { enabled = true, isEmpty } = options;
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  const key = JSON.stringify({ deps, enabled, nonce });

  // Written in an effect, never during render.
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    loaderRef
      .current()
      .then((result) => {
        if (!cancelled) setSettled({ key, data: result, error: null });
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setSettled({
          key,
          data: null,
          error: caught instanceof ApiError ? caught.message : 'Something went wrong',
        });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  const isCurrent = settled?.key === key;
  const status: AsyncState<T>['status'] = !enabled
    ? 'idle'
    : !isCurrent
      ? 'loading'
      : settled.error
        ? 'error'
        : 'success';

  const data = isCurrent ? settled.data : null;

  return {
    data,
    error: isCurrent ? settled.error : null,
    status,
    isLoading: status === 'loading',
    isEmpty: status === 'success' && data !== null && (isEmpty ? isEmpty(data) : false),
    reload,
  };
}
