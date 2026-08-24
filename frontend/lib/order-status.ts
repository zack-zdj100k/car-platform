import type { OrderStatus } from '@/types/api';

/**
 * One status colour scale shared by the customer and admin views (spec §59).
 * Each pairs a tint with a text label, so status is never conveyed by colour
 * alone (spec §65).
 */
export const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  PENDING: 'bg-warning/15 text-warning-foreground border-warning/30',
  CONTACTED: 'bg-chart-3/15 text-foreground border-chart-3/30',
  CONFIRMED: 'bg-primary/15 text-foreground border-primary/30',
  COMPLETED: 'bg-success/15 text-foreground border-success/30',
  CANCELLED: 'bg-muted text-muted-foreground border-border',
};

export const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONTACTED',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
];
