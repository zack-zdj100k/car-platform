'use client';

import { CarForm } from '@/components/admin/car-form';
import { LoadingState, ErrorState } from '@/components/shared/states';
import { useAsync } from '@/hooks/use-async';
import { useLocale } from '@/providers/locale-provider';
import { brandsService } from '@/services/brands.service';
import type { Brand } from '@/types/api';

/** Add a vehicle (spec §47). Route per the route map: /admin/cars/add */
export default function AddCarPage() {
  const { t } = useLocale();
  const brands = useAsync<Brand[]>(() => brandsService.list(), []);

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">{t.admin.addCar}</h1>
      </header>

      {brands.status === 'loading' && <LoadingState />}
      {brands.status === 'error' && <ErrorState message={brands.error} onRetry={brands.reload} />}
      {brands.data && <CarForm brands={brands.data} />}
    </div>
  );
}
