'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingState, ErrorState, EmptyState } from '@/components/shared/states';
import { DemoBadge } from '@/components/shared/demo-badge';
import { useAsync } from '@/hooks/use-async';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';
import { carsService } from '@/services/cars.service';
import { ApiError } from '@/services/api-client';
import { formatPrice } from '@/lib/format';
import type { CarListItem, Paginated } from '@/types/api';

/** Admin car management (spec §46). */
export default function AdminCarsPage() {
  const { token } = useAuth();
  const { t, locale } = useLocale();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search, 350);

  const cars = useAsync<Paginated<CarListItem>>(
    () => carsService.adminList({ page, pageSize: 20, search: debounced || undefined }, { token }),
    [token, page, debounced],
    { enabled: Boolean(token), isEmpty: (result) => result.data.length === 0 },
  );

  const setPublished = async (car: CarListItem, publish: boolean) => {
    try {
      if (publish) await carsService.publish(car.id, { token });
      else await carsService.unpublish(car.id, { token });
      toast.success(publish ? t.admin.publish : t.admin.unpublish);
      cars.reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.error);
    }
  };

  const remove = async (car: CarListItem) => {
    // A vehicle referenced by orders is archived rather than deleted (spec §55),
    // and the API says which happened — so the message reflects reality.
    if (!window.confirm(`${t.admin.delete}: ${car.brand.name} ${car.model}?`)) return;

    try {
      const result = await carsService.remove(car.id, { token });
      toast.success(result.message);
      cars.reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.error);
    }
  };

  const statusVariant = (status: string) =>
    status === 'PUBLISHED'
      ? 'bg-success/15 text-foreground border-success/30'
      : status === 'ARCHIVED'
        ? 'bg-muted text-muted-foreground border-border'
        : 'bg-warning/15 text-warning-foreground border-warning/30';

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold sm:text-3xl">{t.admin.cars}</h1>
        <Button asChild>
          <Link href="/admin/cars/add">
            <Plus className="size-4" aria-hidden="true" />
            {t.admin.addCar}
          </Link>
        </Button>
      </header>

      <div className="max-w-sm space-y-2">
        <Label htmlFor="admin-car-search">{t.common.search}</Label>
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id="admin-car-search"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={t.cars.searchPlaceholder}
            className="ps-9"
          />
        </div>
      </div>

      {cars.status === 'loading' && <LoadingState />}
      {cars.status === 'error' && <ErrorState message={cars.error} onRetry={cars.reload} />}
      {cars.status === 'success' && cars.isEmpty && <EmptyState title={t.cars.noResults} />}

      {cars.status === 'success' && !cars.isEmpty && (
        <>
          <div className="border-border overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">{t.admin.view}</TableHead>
                  <TableHead>{t.cars.brand}</TableHead>
                  <TableHead>{t.cars.model}</TableHead>
                  <TableHead className="text-end">{t.cars.year}</TableHead>
                  <TableHead className="text-end">Price</TableHead>
                  <TableHead>{t.dashboard.status}</TableHead>
                  <TableHead className="text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cars.data?.data.map((car) => (
                  <TableRow key={car.id}>
                    <TableCell>
                      <div className="bg-secondary relative size-10 overflow-hidden rounded-md">
                        {car.images[0] && (
                          <Image src={car.images[0].url} alt="" fill sizes="40px" className="object-cover" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{car.brand.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/car/${car.slug}`} className="hover:underline underline-offset-4">
                          {car.model}
                        </Link>
                        {car.isDemoData && <DemoBadge label={t.admin.demoData} />}
                      </div>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{car.year}</TableCell>
                    <TableCell className="text-end tabular-nums">
                      {formatPrice(car.price, car.currency, locale)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusVariant(car.status)}>
                        {car.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={car.status === 'PUBLISHED' ? t.admin.unpublish : t.admin.publish}
                          title={car.status === 'PUBLISHED' ? t.admin.unpublish : t.admin.publish}
                          onClick={() => void setPublished(car, car.status !== 'PUBLISHED')}
                        >
                          {car.status === 'PUBLISHED' ? (
                            <EyeOff className="size-4" aria-hidden="true" />
                          ) : (
                            <Eye className="size-4" aria-hidden="true" />
                          )}
                        </Button>
                        <Button size="icon" variant="ghost" asChild aria-label={t.admin.edit}>
                          <Link href={`/admin/cars/${car.id}/edit`}>
                            <Pencil className="size-4" aria-hidden="true" />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={t.admin.delete}
                          title={t.admin.delete}
                          onClick={() => void remove(car)}
                        >
                          <Trash2 className="text-destructive size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {(cars.data?.meta.totalPages ?? 0) > 1 && (
            <nav aria-label={t.cars.page} className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!cars.data?.meta.hasPreviousPage}
                onClick={() => setPage((current) => current - 1)}
              >
                {t.cars.previous}
              </Button>
              <span className="text-muted-foreground px-2 text-sm">
                {page} / {cars.data?.meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!cars.data?.meta.hasNextPage}
                onClick={() => setPage((current) => current + 1)}
              >
                {t.cars.next}
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
