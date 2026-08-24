import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CarsBrowser } from '@/components/cars/cars-browser';
import { CarGridSkeleton } from '@/components/shared/states';
import { carsService } from '@/services/cars.service';
import type { CarFacets } from '@/types/api';

export const metadata: Metadata = {
  title: 'Cars',
  description: 'Search Chinese vehicles by brand, model, year, price and body type.',
};

/** Cars listing (spec §11, §12). Facets are fetched on the server. */
export default async function CarsPage() {
  let facets: CarFacets | null = null;
  try {
    facets = await carsService.facets({ next: { revalidate: 120 } });
  } catch {
    // The browser fetches them client-side if the server call fails (spec §72).
    facets = null;
  }

  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8">
          <CarGridSkeleton count={6} />
        </div>
      }
    >
      <CarsBrowser initialFacets={facets} />
    </Suspense>
  );
}
