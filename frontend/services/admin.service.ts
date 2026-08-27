import { apiRequest, buildPath, type RequestOptions } from './api-client';
import type {
  AdminOrderRow,
  AdminUser,
  AnalyticsDashboard,
  OrderDetail,
  OrderStatus,
  Paginated,
  Setting,
} from '@/types/api';

export const analyticsService = {
  dashboard(options: RequestOptions = {}) {
    return apiRequest<AnalyticsDashboard>('/analytics/dashboard', options);
  },
  growth(days: number, options: RequestOptions = {}) {
    return apiRequest<AnalyticsDashboard['growth']>(buildPath('/analytics/growth', { days }), options);
  },
  emailHealth(options: RequestOptions = {}) {
    return apiRequest<{ counts: Record<string, number>; recentFailures: unknown[] }>(
      '/analytics/email-health',
      options,
    );
  },
};

export const adminUsersService = {
  list(
    query: { page?: number; pageSize?: number; search?: string; role?: string; status?: string } = {},
    options: RequestOptions = {},
  ) {
    return apiRequest<Paginated<AdminUser>>(buildPath('/users', query), options);
  },
  detail(id: string, options: RequestOptions = {}) {
    return apiRequest<AdminUser>(`/users/${id}`, options);
  },
  update(id: string, body: { role?: string; status?: string }, options: RequestOptions = {}) {
    return apiRequest<AdminUser>(`/users/${id}`, { ...options, method: 'PATCH', body });
  },
};

export const adminOrdersService = {
  list(
    query: { page?: number; pageSize?: number; search?: string; status?: string[]; carId?: string } = {},
    options: RequestOptions = {},
  ) {
    // The list omits status history; fetch `detail` when that is needed.
    return apiRequest<Paginated<AdminOrderRow>>(
      buildPath('/orders/admin/all', query as Record<string, unknown>),
      options,
    );
  },
  detail(id: string, options: RequestOptions = {}) {
    return apiRequest<OrderDetail>(`/orders/${id}`, options);
  },
  transitions(id: string, options: RequestOptions = {}) {
    return apiRequest<{ status: OrderStatus; allowed: OrderStatus[] }>(`/orders/${id}/transitions`, options);
  },
  updateStatus(id: string, body: { status: OrderStatus; note?: string }, options: RequestOptions = {}) {
    return apiRequest<OrderDetail>(`/orders/${id}/status`, { ...options, method: 'PATCH', body });
  },
};

export const settingsService = {
  public(options: RequestOptions = {}) {
    return apiRequest<Record<string, Record<string, unknown>>>('/settings/public', options);
  },
  all(options: RequestOptions = {}) {
    return apiRequest<Setting[]>('/settings', options);
  },
  /** Whether order notifications are actually delivered, and to whom. */
  emailDelivery(options: RequestOptions = {}) {
    return apiRequest<{ provider: string; delivers: boolean; recipient: string }>(
      '/settings/email-delivery',
      options,
    );
  },
  update(key: string, value: unknown, options: RequestOptions = {}) {
    return apiRequest<Setting>(`/settings/${encodeURIComponent(key)}`, {
      ...options,
      method: 'PATCH',
      body: { value },
    });
  },
  updateMany(settings: { key: string; value: unknown }[], options: RequestOptions = {}) {
    return apiRequest<Setting[]>('/settings', { ...options, method: 'PUT', body: { settings } });
  },
};
