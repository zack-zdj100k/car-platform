import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CarDetailView } from '@/components/cars/car-detail-view';
import { carsService } from '@/services/cars.service';
import { ApiError } from '@/services/api-client';
import type { CarDetail } from '@/types/api';

async function loadCar(id: string): Promise<CarDetail | null> {
  try {
    // no-store: the request records a view, which must not be cached away.
    return await carsService.detail(id, { cache: 'no-store' });
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

  return <CarDetailView car={car} />;
}
