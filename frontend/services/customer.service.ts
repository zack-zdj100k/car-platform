import { apiRequest, buildPath, type RequestOptions } from './api-client';
import type {
  Comparison,
  DashboardOverview,
  FavoriteEntry,
  OrderDetail,
  OrderSummary,
  Paginated,
  RecentEntry,
  UserProfile,
} from '@/types/api';

export const dashboardService = {
  overview(options: RequestOptions = {}) {
    return apiRequest<DashboardOverview>('/dashboard', options);
  },
};

export const favoritesService = {
  list(query: { page?: number; pageSize?: number } = {}, options: RequestOptions = {}) {
    return apiRequest<Paginated<FavoriteEntry>>(buildPath('/favorites', query), options);
  },
  ids(options: RequestOptions = {}) {
    return apiRequest<string[]>('/favorites/ids', options);
  },
  add(carId: string, options: RequestOptions = {}) {
    return apiRequest<{ carId: string; favorited: true }>(`/favorites/${carId}`, { ...options, method: 'POST' });
  },
  remove(carId: string, options: RequestOptions = {}) {
    return apiRequest<{ carId: string; favorited: false }>(`/favorites/${carId}`, { ...options, method: 'DELETE' });
  },
};

export const recentlyViewedService = {
  list(query: { page?: number; pageSize?: number } = {}, options: RequestOptions = {}) {
    return apiRequest<Paginated<RecentEntry>>(buildPath('/recently-viewed', query), options);
  },
  clear(options: RequestOptions = {}) {
    return apiRequest<{ cleared: number }>('/recently-viewed', { ...options, method: 'DELETE' });
  },
};

export const comparisonsService = {
  list(options: RequestOptions = {}) {
    return apiRequest<Comparison[]>('/comparisons', options);
  },
  detail(id: string, options: RequestOptions = {}) {
    return apiRequest<Comparison>(`/comparisons/${id}`, options);
  },
  create(body: { name?: string; carIds?: string[] }, options: RequestOptions = {}) {
    return apiRequest<Comparison>('/comparisons', { ...options, method: 'POST', body });
  },
  addCar(id: string, carId: string, options: RequestOptions = {}) {
    return apiRequest<Comparison>(`/comparisons/${id}/cars`, { ...options, method: 'POST', body: { carId } });
  },
  replaceCars(id: string, carIds: string[], options: RequestOptions = {}) {
    return apiRequest<Comparison>(`/comparisons/${id}/cars`, { ...options, method: 'PUT', body: { carIds } });
  },
  removeCar(id: string, carId: string, options: RequestOptions = {}) {
    return apiRequest<Comparison>(`/comparisons/${id}/cars/${carId}`, { ...options, method: 'DELETE' });
  },
  clear(id: string, options: RequestOptions = {}) {
    return apiRequest<Comparison>(`/comparisons/${id}/clear`, { ...options, method: 'PATCH' });
  },
  remove(id: string, options: RequestOptions = {}) {
    return apiRequest<{ id: string; deleted: boolean }>(`/comparisons/${id}`, { ...options, method: 'DELETE' });
  },
};

export interface CreateOrderPayload {
  carId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  selectedColorId?: string;
  message?: string;
}

export const ordersService = {
  create(body: CreateOrderPayload, options: RequestOptions = {}) {
    return apiRequest<OrderDetail>('/orders', { ...options, method: 'POST', body });
  },
  mine(query: { page?: number; pageSize?: number; status?: string[] } = {}, options: RequestOptions = {}) {
    return apiRequest<Paginated<OrderSummary>>(buildPath('/orders/mine', query as Record<string, unknown>), options);
  },
  detail(id: string, options: RequestOptions = {}) {
    return apiRequest<OrderDetail>(`/orders/${id}`, options);
  },
  /**
   * Withdraws one's own appointment. Not the administrator's status route with
   * a different argument — the API keeps them apart, and this one can only ever
   * cancel, and only the caller's own.
   */
  cancel(id: string, options: RequestOptions = {}) {
    return apiRequest<OrderDetail>(`/orders/${id}/cancel`, { ...options, method: 'PATCH' });
  },
};

export const profileService = {
  me(options: RequestOptions = {}) {
    return apiRequest<UserProfile>('/users/me', options);
  },
  update(body: { fullName?: string; phone?: string; profileImage?: string; locale?: 'EN' | 'FR' | 'AR' }, options: RequestOptions = {}) {
    return apiRequest<UserProfile>('/users/me', { ...options, method: 'PATCH', body });
  },
  changePassword(
    body: { currentPassword: string; newPassword: string; confirmPassword: string },
    options: RequestOptions = {},
  ) {
    return apiRequest<{ message: string }>('/users/me/password', { ...options, method: 'PATCH', body });
  },
};
