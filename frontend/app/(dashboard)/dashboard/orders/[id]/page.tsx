'use client';

import Link from 'next/link';
import { use } from 'react';
import { ArrowLeft, ArrowRight, Clock, MapPin } from 'lucide-react';
import { MediaImage } from '@/components/shared/media-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LocationMap } from '@/components/ui/expand-map';
import { LoadingState, ErrorState } from '@/components/shared/states';
import { useAsync } from '@/hooks/use-async';
import { useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';
import { ordersService } from '@/services/customer.service';
import { formatDateTime, formatPrice } from '@/lib/format';
import { ORDER_STATUS_CLASS } from '@/lib/order-status';
import type { OrderDetail } from '@/types/api';

/**
 * One appointment, as the customer sees it.
 *
 * What this page is for: the moment an appointment is confirmed, the customer
 * needs one thing the rest of the site cannot give them — where to go. Until
 * then it says so plainly rather than showing an address that means nothing
 * yet: somebody who reads a street name on a request nobody has answered turns
 * up to a closed door.
 *
 * The vehicle is here as a reminder, not as a listing. One photograph, the
 * price they were quoted, the colour they chose, and a way through to the full
 * page — everything else about the car is one click away and does not need
 * repeating beside an address.
 */
export default function AppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token } = useAuth();
  const { t, locale } = useLocale();

  const order = useAsync<OrderDetail>(() => ordersService.detail(id, { token }), [id, token], {
    enabled: Boolean(token),
  });

  if (order.status === 'loading') return <LoadingState />;
  if (order.status === 'error') {
    return <ErrorState message={order.error} onRetry={order.reload} />;
  }
  if (!order.data) return null;

  const appointment = order.data;
  const car = appointment.car;
  const confirmed = appointment.status === 'CONFIRMED';
  const hasPlace = Boolean(appointment.meetingAddress || appointment.meetingMapUrl);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="text-muted-foreground -ms-2">
        <Link href="/dashboard/orders">
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
          {t.dashboard.orders}
        </Link>
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground font-mono text-xs">{appointment.reference}</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{t.order.detailTitle}</h1>
        </div>
        <Badge variant="outline" className={ORDER_STATUS_CLASS[appointment.status]}>
          {t.orderStatus[appointment.status] ?? appointment.status}
        </Badge>
      </header>

      {/* ---- the vehicle, briefly ---- */}
      <section className="border-border bg-card flex flex-wrap items-center gap-5 rounded-xl border p-5 shadow-[var(--shadow-card)]">
        <div className="bg-secondary relative h-24 w-36 shrink-0 overflow-hidden rounded-lg">
          {car.images[0] && (
            <MediaImage
              src={car.images[0].url}
              alt={car.images[0].alt ?? car.model}
              fill
              sizes="144px"
              className="object-cover"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">
            {car.brand.name} {car.model} {car.year}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {formatPrice(car.price, car.currency, locale)}
            {appointment.selectedColorName ? ` · ${appointment.selectedColorName}` : ''}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t.order.requestedOn} {formatDateTime(appointment.createdAt, locale)}
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href={`/car/${car.slug}`}>
            {t.order.seeTheCar}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </Button>
      </section>

      {/* ---- where to come ---- */}
      {confirmed && hasPlace ? (
        <section className="space-y-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <MapPin className="text-primary size-5" aria-hidden="true" />
              {t.order.whereTitle}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">{t.order.whereBody}</p>
          </div>

          {/*
            The same card as the home page's, and deliberately so: a customer
            who has seen it there knows what it does before they touch it.
          */}
          {appointment.meetingMapUrl ? (
            <LocationMap
              location={appointment.meetingAddress || t.order.whereTitle}
              detail={appointment.meetingNote ?? undefined}
              href={appointment.meetingMapUrl}
              openLabel={t.order.openInMaps}
            />
          ) : (
            <div className="border-border bg-card rounded-xl border p-5">
              <p className="font-medium">{appointment.meetingAddress}</p>
              {appointment.meetingNote && (
                <p className="text-muted-foreground mt-2 flex items-center gap-2 text-sm">
                  <Clock className="size-4" aria-hidden="true" />
                  {appointment.meetingNote}
                </p>
              )}
            </div>
          )}

          {appointment.meetingMapUrl && appointment.meetingNote && (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Clock className="size-4" aria-hidden="true" />
              {appointment.meetingNote}
            </p>
          )}
        </section>
      ) : (
        /*
         * Not confirmed, or confirmed and the address not decided yet. Said
         * plainly either way — the alternative is a blank space where an
         * address should be, which reads as something having gone wrong.
         */
        <section className="border-border/70 rounded-xl border border-dashed p-5">
          <p className="text-muted-foreground text-sm">{t.order.notConfirmedYet}</p>
        </section>
      )}

      {/* ---- what we hold for them ---- */}
      <section className="border-border bg-card rounded-xl border p-5">
        <h2 className="text-sm font-semibold">{t.order.yourDetails}</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t.order.fullName}</dt>
            <dd className="font-medium">{appointment.buyerName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t.order.email}</dt>
            <dd className="font-medium">{appointment.buyerEmail}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t.order.phone}</dt>
            <dd className="font-medium">{appointment.buyerPhone}</dd>
          </div>
          {appointment.message && (
            <div className="border-border/70 border-t pt-2">
              <dt className="text-muted-foreground">{t.order.message}</dt>
              <dd className="mt-1 whitespace-pre-line">{appointment.message}</dd>
            </div>
          )}
        </dl>
      </section>
    </div>
  );
}
