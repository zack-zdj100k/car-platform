import { apiRequest, type RequestOptions } from './api-client';
import type { Brand } from '@/types/api';

export const brandsService = {
  list(options: RequestOptions = {}) {
    return apiRequest<Brand[]>('/brands', options);
  },
  detail(idOrSlug: string, options: RequestOptions = {}) {
    return apiRequest<Brand>(`/brands/${encodeURIComponent(idOrSlug)}`, options);
  },
};
