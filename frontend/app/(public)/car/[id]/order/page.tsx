import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { OrderForm } from '@/components/orders/order-form';
import { carsService } from '@/services/cars.service';
import { ApiError } from '@/services/api-client';
import type { CarDetail } from '@/types/api';

export const metadata: Metadata = { title: 'Order request', robots: { index: false, follow: false } };

/** Order form route from the final route map: /car/:id/order (spec §24). */
export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ color?: string }>;
}) {
  const [{ id }, { color }] = await Promise.all([params, searchParams]);

  // Data is resolved first, so no JSX is constructed inside the try block.
  let car: CarDetail;
  try {
    car = await carsService.detail(id, { next: { revalidate: 60 } });
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  return <OrderForm car={car} initialColorId={color} />;
}
