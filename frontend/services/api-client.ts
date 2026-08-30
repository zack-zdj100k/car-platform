import type { ApiErrorBody } from '@/types/api';

/**
 * The single place this application talks to the API (spec §58).
 *
 * Nothing else may call `fetch` against the backend — that keeps loading,
 * empty, error and expiry handling consistent everywhere.
 */
/**
 * The API's real address. Used by the server, and to build the URL of an
 * uploaded file, which is served by the API itself.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

/**
 * What the browser calls, which is not the same thing.
 *
 * Requests from the page go to this site's own origin and are forwarded to the
 * API by the rewrite in next.config.ts. That is not a detail of taste: the
 * session lives in a cookie, and a cookie set by a different site is a
 * third-party cookie. Safari refuses those outright, Chrome is retiring them,
 * and the symptom is the worst kind — signing in works, and the next page load
 * is signed out again, with nothing in the console to say why.
 *
 * Through the rewrite the cookie comes from the same host as the page, so it is
 * kept and sent like any other first-party cookie.
 */
export const REQUEST_BASE = typeof window === 'undefined' ? API_URL : '/backend';

/** Structured failure carrying the status so callers can branch on 401/403/404. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fieldMessages: string[];

  constructor(status: number, message: string, options: { code?: string; fieldMessages?: string[] } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = options.code;
    this.fieldMessages = options.fieldMessages ?? [];
  }

  get isUnauthorised(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Bearer token. Server components pass it explicitly; the browser client injects it. */
  token?: string | null;
  /** Forwarded to fetch — used by server components for revalidation. */
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
  /** Send cookies. Required for the refresh endpoint. */
  credentials?: RequestCredentials;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

function toQuery(params: Record<string, unknown> | undefined): string {
  if (!params) return '';
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      const joined = value.filter((entry) => entry !== undefined && entry !== null && entry !== '');
      if (joined.length > 0) search.set(key, joined.join(','));
      continue;
    }
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : '';
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody | null = null;
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    body = null;
  }

  const raw = body?.message;
  const fieldMessages = Array.isArray(raw) ? raw : [];
  const message =
    (Array.isArray(raw) ? raw[0] : raw) ??
    (response.status >= 500 ? 'The server could not complete this request.' : response.statusText);

  return new ApiError(response.status, message, { code: body?.code, fieldMessages });
}

/** Low-level request. Prefer the typed helpers in the other service modules. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, cache, next, credentials, headers = {}, signal } = options;

  const response = await fetch(`${REQUEST_BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache,
    next,
    credentials,
    signal,
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function buildPath(path: string, params?: Record<string, unknown>): string {
  return `${path}${toQuery(params)}`;
}
