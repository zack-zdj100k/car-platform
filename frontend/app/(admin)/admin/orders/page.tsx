'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingState, ErrorState, EmptyState } from '@/components/shared/states';
import { useAsync } from '@/hooks/use-async';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';
import { adminOrdersService } from '@/services/admin.service';
import { ApiError } from '@/services/api-client';
import { formatDateTime } from '@/lib/format';
import { ORDER_STATUSES, ORDER_STATUS_CLASS } from '@/lib/order-status';
import type { AdminOrderRow, OrderDetail, OrderStatus, Paginated } from '@/types/api';

/** Admin order management (spec §25, §46). */
export default function AdminOrdersPage() {
  const { token } = useAuth();
  const { t, locale } = useLocale();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const debounced = useDebouncedValue(search, 350);

  const [active, setActive] = useState<AdminOrderRow | null>(null);
  const [nextStatus, setNextStatus] = useState<OrderStatus | ''>('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const orders = useAsync<Paginated<AdminOrderRow>>(
    () =>
      adminOrdersService.list(
        {
          pageSize: 50,
          search: debounced || undefined,
          status: statusFilter === 'all' ? undefined : [statusFilter],
        },
        { token },
      ),
    [token, debounced, statusFilter],
    { enabled: Boolean(token), isEmpty: (result) => result.data.length === 0 },
  );

  /**
   * The dialog needs the full order, because the list deliberately omits status
   * history to keep the table query light.
   */
  const detail = useAsync<OrderDetail>(
    () => adminOrdersService.detail(active?.id ?? '', { token }),
    [active?.id, token],
    { enabled: Boolean(active && token) },
  );

  /** Only transitions the backend permits are offered (spec §25). */
  const transitions = useAsync(
    () => adminOrdersService.transitions(active?.id ?? '', { token }),
    [active?.id, token],
    { enabled: Boolean(active && token) },
  );

  const submitStatus = async () => {
    if (!active || !nextStatus) return;
    setSaving(true);
    try {
      await adminOrdersService.updateStatus(active.id, { status: nextStatus, note: note || undefined }, { token });
      toast.success(t.admin.updateStatus);
      setActive(null);
      setNextStatus('');
      setNote('');
      orders.reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.error);
    } finally {
      setSaving(false);
    }
  };

  const statuses = ORDER_STATUSES;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">{t.admin.orders}</h1>
      </header>

      <div className="flex flex-wrap items-end gap-4">
        <div className="max-w-sm flex-1 space-y-2">
          <Label htmlFor="order-search">{t.common.search}</Label>
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              id="order-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Reference, name, email or phone"
              className="ps-9"
            />
          </div>
        </div>

        <div className="w-44 space-y-2">
          <Label htmlFor="order-status">{t.dashboard.status}</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="order-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.common.all}</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {orders.status === 'loading' && <LoadingState />}
      {orders.status === 'error' && <ErrorState message={orders.error} onRetry={orders.reload} />}
      {orders.status === 'success' && orders.isEmpty && <EmptyState title={t.dashboard.noOrders} />}

      {orders.status === 'success' && !orders.isEmpty && (
        <div className="border-border overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.dashboard.reference}</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>{t.dashboard.vehicle}</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>{t.dashboard.status}</TableHead>
                <TableHead>{t.dashboard.submitted}</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.data?.data.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">{order.reference}</TableCell>
                  <TableCell>
                    <p className="font-medium">{order.buyerName}</p>
                    {!order.userId && (
                      <span className="text-muted-foreground text-xs">guest</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={`/car/${order.car.slug}`} className="hover:underline underline-offset-4">
                      {order.car.brand.name} {order.car.model}
                    </Link>
                    {order.selectedColorName && (
                      <p className="text-muted-foreground text-xs">{order.selectedColorName}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <a href={`mailto:${order.buyerEmail}`} className="hover:underline">
                      {order.buyerEmail}
                    </a>
                    <p className="text-muted-foreground text-xs">{order.buyerPhone}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={ORDER_STATUS_CLASS[order.status]}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatDateTime(order.createdAt, locale)}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActive(order);
                        setNextStatus('');
                        setNote('');
                      }}
                    >
                      {t.admin.updateStatus}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={Boolean(active)} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.admin.updateStatus}</DialogTitle>
            <DialogDescription>
              {active?.reference} · {active?.buyerName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="next-status">{t.dashboard.status}</Label>
              <Select value={nextStatus} onValueChange={(value) => setNextStatus(value as OrderStatus)}>
                <SelectTrigger id="next-status" className="w-full">
                  <SelectValue placeholder={t.admin.updateStatus} />
                </SelectTrigger>
                <SelectContent>
                  {(transitions.data?.allowed ?? []).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/*
                * No status is a dead end any more. COMPLETED used to offer an
                * empty list and a line saying so, which left a real sale that
                * fell through afterwards impossible to record.
                */}
              <p className="text-muted-foreground text-xs">{t.admin.statusFreeEdit}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-note">{t.order.messageOptional}</Label>
              <Textarea
                id="status-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>

            {detail.data && detail.data.statusHistory.length > 0 && (
              <div className="border-border border-t pt-3">
                <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-widest uppercase">
                  History
                </h3>
                <ol className="space-y-1.5 text-xs">
                  {detail.data.statusHistory.map((entry) => (
                    <li key={entry.id} className="text-muted-foreground flex justify-between gap-3">
                      <span>
                        {entry.fromStatus ? `${entry.fromStatus} → ` : ''}
                        <span className="text-foreground font-medium">{entry.toStatus}</span>
                        {entry.changedBy ? ` · ${entry.changedBy.fullName}` : ''}
                      </span>
                      <span className="whitespace-nowrap">{formatDateTime(entry.createdAt, locale)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>
              {t.common.cancel}
            </Button>
            <Button disabled={!nextStatus || saving} onClick={() => void submitStatus()}>
              {t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
