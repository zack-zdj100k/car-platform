'use client';

import { MediaImage } from '@/components/shared/media-image';
import Link from 'next/link';
import { useState } from 'react';
import { Loader2, Package, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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

  /*
   * Which appointment is being withdrawn, if any. Held by id rather than as a
   * boolean: the list can be long, and a spinner on every row while one of them
   * is cancelling would say the wrong thing about all the others.
   */
  const [cancelling, setCancelling] = useState<string | null>(null);

  const cancel = async (id: string) => {
    if (!window.confirm(t.order.cancelConfirm)) return;

    setCancelling(id);
    try {
      await ordersService.cancel(id, { token });
      toast.success(t.order.cancelled);
      orders.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.order.cancelFailed);
    } finally {
      setCancelling(null);
    }
  };

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
                  <MediaImage
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
                  {t.orderStatus[order.status] ?? order.status}
                </Badge>
                <p className="text-muted-foreground text-xs">{formatDate(order.createdAt, locale)}</p>

                {/*
                  Withdrawing is the customer's to do, while the appointment is
                  still open. Booking the wrong colour late at night should not
                  mean telephoning a showroom in the morning to undo it — and an
                  appointment list nobody can correct is a list nobody trusts.
                */}
                {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive -me-2 h-7 px-2 text-xs"
                    disabled={cancelling === order.id}
                    onClick={() => void cancel(order.id)}
                  >
                    {cancelling === order.id ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <X className="size-3.5" aria-hidden="true" />
                    )}
                    {cancelling === order.id ? t.order.cancelling : t.order.cancel}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
