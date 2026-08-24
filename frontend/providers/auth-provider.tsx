'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authService, type LoginPayload, type RegisterPayload } from '@/services/auth.service';
import { ApiError } from '@/services/api-client';
import type { AuthUser } from '@/types/api';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  /** True until the initial silent refresh resolves — gate redirects on this. */
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Session state.
 *
 * The access token is held in memory only — never in localStorage, where an XSS
 * payload could read it. Durability comes from the httpOnly refresh cookie: on
 * load, and shortly before expiry, the provider silently exchanges it for a new
 * access token.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Indirection so the scheduler can call the latest refresh function without
   * referring to it before it is declared.
   */
  const refreshRef = useRef<(() => Promise<AuthUser | null>) | null>(null);

  const clearTimer = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback(
    (expiresIn: number) => {
      clearTimer();
      // Refresh a minute early, never sooner than 15 seconds from now.
      const delay = Math.max((expiresIn - 60) * 1000, 15_000);
      refreshTimer.current = setTimeout(() => {
        void refreshRef.current?.();
      }, delay);
    },
    [clearTimer],
  );

  const silentRefresh = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const result = await authService.refresh();
      setUser(result.user);
      setToken(result.accessToken);
      scheduleRefresh(result.expiresIn);
      return result.user;
    } catch (error) {
      // A missing or expired cookie simply means "not signed in" — expected on
      // a first visit, so it must not be reported as a failure.
      if (error instanceof ApiError && !error.isUnauthorised) {
        console.warn('Session refresh failed:', error.message);
      }
      setUser(null);
      setToken(null);
      clearTimer();
      return null;
    }
  }, [clearTimer, scheduleRefresh]);

  useEffect(() => {
    refreshRef.current = silentRefresh;
  });

  /**
   * Bootstraps the session from the httpOnly refresh cookie on first load.
   *
   * This is the "subscribe to an external system" case effects exist for: the
   * cookie is outside React, and the state updates land in promise callbacks,
   * not in the effect body. The lint rule cannot see through the promise, so it
   * is disabled here deliberately rather than because the warning is correct.
   */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void silentRefresh().finally(() => setIsLoading(false));
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const result = await authService.login(payload);
      setUser(result.user);
      setToken(result.accessToken);
      scheduleRefresh(result.expiresIn);
      return result.user;
    },
    [scheduleRefresh],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const result = await authService.register(payload);
      setUser(result.user);
      setToken(result.accessToken);
      scheduleRefresh(result.expiresIn);
      return result.user;
    },
    [scheduleRefresh],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setToken(null);
      clearTimer();
    }
  }, [clearTimer]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'ADMIN',
      login,
      register,
      logout,
      refresh: silentRefresh,
    }),
    [user, token, isLoading, login, register, logout, silentRefresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
