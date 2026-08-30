import { apiRequest, type RequestOptions } from './api-client';
import type { AuthResponse, AuthUser } from '@/types/api';

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  acceptTerms: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Auth calls always send credentials: the refresh token lives in an httpOnly
 * cookie that the browser must include.
 */
const withCredentials = (options: RequestOptions): RequestOptions => ({
  ...options,
  credentials: 'include',
});

/**
 * Refresh is single-flight.
 *
 * Concurrent callers — StrictMode's double mount, two components mounting at
 * once, a navigation overlapping an in-flight request — share one request.
 * Without this, the second call presents an already-rotated token and the
 * server treats it as replay.
 */
let inFlightRefresh: Promise<AuthResponse> | null = null;

export const authService = {
  register(body: RegisterPayload, options: RequestOptions = {}) {
    return apiRequest<AuthResponse>('/auth/register', { ...withCredentials(options), method: 'POST', body });
  },

  login(body: LoginPayload, options: RequestOptions = {}) {
    return apiRequest<AuthResponse>('/auth/login', { ...withCredentials(options), method: 'POST', body });
  },

  refresh(options: RequestOptions = {}) {
    inFlightRefresh ??= apiRequest<AuthResponse>('/auth/refresh', {
      ...withCredentials(options),
      method: 'POST',
    }).finally(() => {
      inFlightRefresh = null;
    });

    return inFlightRefresh;
  },

  logout(options: RequestOptions = {}) {
    return apiRequest<void>('/auth/logout', { ...withCredentials(options), method: 'POST' });
  },

  /** Which sign-in providers the server actually has configured. */
  providers(options: RequestOptions = {}) {
    return apiRequest<{ google: boolean }>('/auth/providers', options);
  },

  me(options: RequestOptions = {}) {
    return apiRequest<AuthUser>('/auth/me', options);
  },

  forgotPassword(email: string, options: RequestOptions = {}) {
    return apiRequest<{ message: string }>('/auth/forgot-password', {
      ...options,
      method: 'POST',
      body: { email },
    });
  },

  resetPassword(body: { token: string; password: string; confirmPassword: string }, options: RequestOptions = {}) {
    return apiRequest<{ message: string }>('/auth/reset-password', { ...options, method: 'POST', body });
  },
};
