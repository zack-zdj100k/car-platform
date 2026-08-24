'use client';

import { use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CarForm } from '@/components/admin/car-form';
import { LoadingState, ErrorState } from '@/components/shared/states';
import { useAsync } from '@/hooks/use-async';
import { useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';
import { brandsService } from '@/services/brands.service';
import { carsService } from '@/services/cars.service';
import type { Brand, CarDetail } from '@/types/api';

/** Edit a vehicle (spec §46, §47). */
export default function EditCarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token } = useAuth();
  const { t } = useLocale();

  const brands = useAsync<Brand[]>(() => brandsService.list(), []);
  // The admin endpoint so drafts and archived vehicles remain editable.
  const car = useAsync<CarDetail>(() => carsService.adminDetail(id, { token }), [id, token], {
    enabled: Boolean(token),
  });

  const failed = brands.status === 'error' || car.status === 'error';

  return (
    <div className="max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{t.admin.editCar}</h1>
          {car.data && (
            <p className="text-muted-foreground mt-1.5 text-sm">
              {car.data.brand.name} {car.data.model} · {car.data.status}
            </p>
          )}
        </div>
        {car.data && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/car/${car.data.slug}`}>{t.admin.view}</Link>
          </Button>
        )}
      </header>

      {failed && (
        <ErrorState
          message={car.error ?? brands.error}
          onRetry={() => {
            car.reload();
            brands.reload();
          }}
        />
      )}

      {!failed && (!brands.data || !car.data) && <LoadingState />}
      {brands.data && car.data && <CarForm brands={brands.data} car={car.data} />}
    </div>
  );
}
