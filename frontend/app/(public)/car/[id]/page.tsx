import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CarDetailView } from '@/components/cars/car-detail-view';
import { RecordView } from '@/components/cars/record-view';
import { carsService } from '@/services/cars.service';
import { ApiError } from '@/services/api-client';
import type { CarDetail } from '@/types/api';

/**
 * Reads the car. Nothing else — the view is reported by the browser, which is
 * the only place that knows who is reading (see `RecordView`).
 */
async function loadCar(id: string): Promise<CarDetail | null> {
  try {
    // Short-lived rather than no-store: a price or a photograph changing within
    // the minute does not matter, and this way two readers share one fetch.
    return await carsService.detail(id, { next: { revalidate: 30 } });
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const car = await loadCar(id).catch(() => null);
  if (!car) return { title: 'Vehicle not found' };

  return {
    title: `${car.brand.name} ${car.model} ${car.year}`,
    description: car.marketingDescription ?? undefined,
    openGraph: {
      title: `${car.brand.name} ${car.model} ${car.year}`,
      description: car.marketingDescription ?? undefined,
      images: car.images[0] ? [car.images[0].url] : undefined,
    },
  };
}

/** Car detail (spec §13–§23). Route per the final route map: /car/:id */
export default async function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const car = await loadCar(id);
  if (!car) notFound();

  return (
    <>
      <RecordView slug={car.slug} />
      <CarDetailView car={car} />
    </>
  );
}
