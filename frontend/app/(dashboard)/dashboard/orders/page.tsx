'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CarGridSkeleton, EmptyState, ErrorState } from '@/components/shared/states';
import { useAsync } from '@/hooks/use-async';
import { useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';
import { ordersService } from '@/services/customer.service';
import { formatDate, formatPrice } from '@/lib/format';
import { ORDER_STATUS_CLASS } from '@/lib/order-status';
import type { OrderSummary, Paginated } from '@/types/api';

/** Spec §38 — customers may view their own order history and status. */
export default function MyOrdersPage() {
  const { token } = useAuth();
  const { t, locale } = useLocale();

  const orders = useAsync<Paginated<OrderSummary>>(
    () => ordersService.mine({ pageSize: 50 }, { token }),
    [token],
    { enabled: Boolean(token), isEmpty: (result) => result.data.length === 0 },
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">{t.dashboard.orders}</h1>
      </header>

      {orders.status === 'loading' && <CarGridSkeleton count={2} />}
      {orders.status === 'error' && <ErrorState message={orders.error} onRetry={orders.reload} />}

      {orders.status === 'success' && orders.isEmpty && (
        <EmptyState
          icon={Package}
          title={t.dashboard.noOrders}
          actionLabel={t.dashboard.exploreCars}
          actionHref="/cars"
        />
      )}

      {orders.status === 'success' && !orders.isEmpty && (
        <ul className="space-y-3">
          {orders.data?.data.map((order) => (
            <li
              key={order.id}
              className="border-border bg-card flex flex-wrap items-center gap-4 rounded-xl border p-4 shadow-[var(--shadow-card)]"
            >
              <div className="bg-secondary relative size-20 shrink-0 overflow-hidden rounded-lg">
                {order.car.images[0] && (
                  <Image
                    src={order.car.images[0].url}
                    alt={order.car.images[0].alt ?? order.car.model}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground font-mono text-xs">{order.reference}</p>
                <h2 className="truncate font-semibold">
                  <Link href={`/car/${order.car.slug}`} className="hover:underline underline-offset-4">
                    {order.car.brand.name} {order.car.model} {order.car.year}
                  </Link>
                </h2>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {formatPrice(order.car.price, order.car.currency, locale)}
                  {order.selectedColorName ? ` · ${order.selectedColorName}` : ''}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <Badge variant="outline" className={ORDER_STATUS_CLASS[order.status]}>
                  {order.status}
                </Badge>
                <p className="text-muted-foreground text-xs">{formatDate(order.createdAt, locale)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
