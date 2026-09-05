'use client';

import { MediaImage } from '@/components/shared/media-image';
import Link from 'next/link';
import { useState } from 'react';
import { Loader2, Package, Trash2, X } from 'lucide-react';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

  /*
   * Which appointment is being asked about, in a dialog of our own rather than
   * `window.confirm`.
   *
   * The browser's dialog labels its own dismiss button "Cancel" — "Annuler" in
   * French — so a customer who has just pressed "Cancel this appointment" is
   * shown two buttons and told to press Cancel to not cancel. Pressing what
   * looks like the obvious one keeps the appointment, nothing appears to
   * happen, and the feature looks broken. Here the buttons say what they do.
   */
  const [confirming, setConfirming] = useState<string | null>(null);

  /*
   * Removing a cancelled appointment from one's own list.
   *
   * Kept separate from cancelling, and only offered once it is cancelled: a
   * list of appointments that were called off is clutter to the person who
   * called them off, but withdrawing one and erasing it are different acts and
   * the first has to happen first.
   */
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null);

  const remove = async (id: string) => {
    setConfirmingRemove(null);
    setRemoving(id);
    try {
      await ordersService.remove(id, { token });
      notify.success(t.order.removed);
      orders.reload();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : t.common.error);
    } finally {
      setRemoving(null);
    }
  };

  const cancel = async (id: string) => {
    setConfirming(null);
    setCancelling(id);
    try {
      await ordersService.cancel(id, { token });
      notify.success(t.order.cancelled);
      orders.reload();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : t.order.cancelFailed);
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
                {/*
                  To the appointment, not to the vehicle. Once it is confirmed
                  that page carries the address, and it is the thing the
                  customer opened this list to find; the car is one click on
                  from there.
                */}
                <h2 className="truncate font-semibold">
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="hover:underline underline-offset-4"
                  >
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
                {order.status === 'CANCELLED' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive -me-2 h-7 px-2 text-xs"
                    disabled={removing === order.id}
                    onClick={() => setConfirmingRemove(order.id)}
                  >
                    {removing === order.id ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    )}
                    {t.order.remove}
                  </Button>
                )}

                {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive -me-2 h-7 px-2 text-xs"
                    disabled={cancelling === order.id}
                    onClick={() => setConfirming(order.id)}
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

      <Dialog
        open={confirmingRemove !== null}
        onOpenChange={(open) => !open && setConfirmingRemove(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.order.remove}</DialogTitle>
            <DialogDescription>{t.order.removeConfirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmingRemove(null)}>
              {t.admin.deleteKeep}
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmingRemove && void remove(confirmingRemove)}
              disabled={removing !== null}
            >
              {t.admin.deleteYes}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.order.cancel}</DialogTitle>
            <DialogDescription>{t.order.cancelConfirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirming(null)}>
              {t.order.cancelKeep}
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirming && void cancel(confirming)}
              disabled={cancelling !== null}
            >
              {cancelling ? t.order.cancelling : t.order.cancelYes}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
