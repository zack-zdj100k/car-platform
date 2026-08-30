import { apiRequest, type RequestOptions } from './api-client';
import type { Brand } from '@/types/api';

export const brandsService = {
  list(options: RequestOptions = {}) {
    return apiRequest<Brand[]>('/brands', options);
  },
  detail(idOrSlug: string, options: RequestOptions = {}) {
    return apiRequest<Brand>(`/brands/${encodeURIComponent(idOrSlug)}`, options);
  },
  /** Admin only — creates a marque that is not in the catalogue yet. */
  create(payload: { name: string; country?: string }, options: RequestOptions = {}) {
    return apiRequest<Brand>('/brands', { ...options, method: 'POST', body: payload });
  },
};
