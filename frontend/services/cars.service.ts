import { apiRequest, buildPath, type RequestOptions } from './api-client';
import type { CarDetail, CarFacets, CarListItem, Paginated } from '@/types/api';

export interface CarQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  brand?: string[];
  model?: string;
  bodyType?: string[];
  fuelType?: string[];
  transmission?: string[];
  drivetrain?: string[];
  year?: number;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  seats?: number;
  featured?: boolean;
  /** Only vehicles that have a TikTok clip — the videos page. */
  hasVideo?: boolean;
  sort?: string;
}

export const carsService = {
  list(query: CarQuery = {}, options: RequestOptions = {}) {
    return apiRequest<Paginated<CarListItem>>(
      buildPath('/cars', query as Record<string, unknown>),
      options,
    );
  },

  facets(options: RequestOptions = {}) {
    return apiRequest<CarFacets>('/cars/facets', options);
  },

  featured(options: RequestOptions = {}) {
    return apiRequest<CarListItem[]>('/cars/featured', options);
  },

  detail(idOrSlug: string, options: RequestOptions = {}) {
    return apiRequest<CarDetail>(`/cars/${encodeURIComponent(idOrSlug)}`, options);
  },

  // ---- admin ----
  adminList(query: CarQuery = {}, options: RequestOptions = {}) {
    return apiRequest<Paginated<CarListItem>>(
      buildPath('/cars/admin/all', query as Record<string, unknown>),
      options,
    );
  },

  adminDetail(idOrSlug: string, options: RequestOptions = {}) {
    return apiRequest<CarDetail>(`/cars/admin/${encodeURIComponent(idOrSlug)}`, options);
  },

  create(body: unknown, options: RequestOptions = {}) {
    return apiRequest<CarDetail>('/cars', { ...options, method: 'POST', body });
  },

  update(id: string, body: unknown, options: RequestOptions = {}) {
    return apiRequest<CarDetail>(`/cars/${id}`, { ...options, method: 'PATCH', body });
  },

  publish(id: string, options: RequestOptions = {}) {
    return apiRequest<{ id: string; status: string }>(`/cars/${id}/publish`, { ...options, method: 'PATCH' });
  },

  unpublish(id: string, options: RequestOptions = {}) {
    return apiRequest<{ id: string; status: string }>(`/cars/${id}/unpublish`, { ...options, method: 'PATCH' });
  },

  remove(id: string, options: RequestOptions = {}) {
    return apiRequest<{ id: string; archived: boolean; message: string }>(`/cars/${id}`, {
      ...options,
      method: 'DELETE',
    });
  },
};
