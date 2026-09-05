'use client';

import { MediaImage } from '@/components/shared/media-image';
import Link from 'next/link';
import { useMemo } from 'react';
import { GitCompare, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CarGridSkeleton, EmptyState, ErrorState } from '@/components/shared/states';
import { useAsync } from '@/hooks/use-async';
import { useCompare } from '@/hooks/use-compare';
import { useLocale } from '@/providers/locale-provider';
import { carsService } from '@/services/cars.service';
import { formatAcronym, formatMeasure, formatPrice, humaniseEnum } from '@/lib/format';
import { specLabels } from '@/lib/i18n/spec';
import type { CarDetail } from '@/types/api';

/**
 * Car comparison (spec §43).
 *
 * The tray is held locally so it works before signing in, and each vehicle's
 * full record is fetched for the table. Every attribute the spec lists is
 * compared: identity, engine, wheels, tyres, dimensions, interior, technology
 * and safety.
 */
export default function ComparePage() {
  const { t, locale } = useLocale();
  const compare = useCompare();

  const ids = compare.ids;
  const key = ids.join(',');

  const cars = useAsync<CarDetail[]>(
    () => Promise.all(ids.map((id) => carsService.detail(id, { cache: 'no-store' }))),
    [key],
    { enabled: ids.length > 0, isEmpty: (result) => result.length === 0 },
  );

  const rows = useMemo(() => {
    const list = cars.data ?? [];
    if (list.length === 0) return [];

    const boolLabel = (value: boolean | undefined) => (value ? t.car.fitted : t.car.notFitted);
    // The same field names the vehicle page and the editor use.
    const s = specLabels(locale);

    return [
      { label: t.cars.brand, values: list.map((car) => car.brand.name) },
      { label: t.cars.model, values: list.map((car) => car.model) },
      { label: t.cars.year, values: list.map((car) => String(car.year)) },
      { label: t.cars.bodyType, values: list.map((car) => humaniseEnum(car.bodyType, locale)) },
      { label: s.seats, values: list.map((car) => (car.seats ? String(car.seats) : '—')) },
      { label: s.price, values: list.map((car) => formatPrice(car.price, car.currency, locale)) },
      { label: s.engineType, values: list.map((car) => car.engine?.engineType ?? '—') },
      {
        label: s.displacement,
        values: list.map((car) => (car.engine?.displacementL ? `${car.engine.displacementL} L` : '—')),
      },
      { label: s.power, values: list.map((car) => (car.engine?.powerHp ? `${car.engine.powerHp} hp` : '—')) },
      { label: s.torque, values: list.map((car) => (car.engine?.torqueNm ? `${car.engine.torqueNm} Nm` : '—')) },
      { label: s.transmission, values: list.map((car) => formatAcronym(car.engine?.transmission, locale)) },
      { label: s.drivetrain, values: list.map((car) => formatAcronym(car.engine?.drivetrain, locale)) },
      { label: t.cars.fuelType, values: list.map((car) => humaniseEnum(car.engine?.fuelType, locale)) },
      {
        label: s.acceleration,
        values: list.map((car) => (car.engine?.acceleration0100 ? `${car.engine.acceleration0100} s` : '—')),
      },
      {
        label: s.wheelSize,
        values: list.map((car) => (car.wheels?.wheelSizeInch ? `${car.wheels.wheelSizeInch}"` : '—')),
      },
      { label: s.frontTyres, values: list.map((car) => car.wheels?.frontTyreSize ?? '—') },
      { label: s.rearTyres, values: list.map((car) => car.wheels?.rearTyreSize ?? '—') },
      { label: s.length, values: list.map((car) => formatMeasure(car.dimensions?.lengthMm, 'mm', locale)) },
      { label: s.wheelbase, values: list.map((car) => formatMeasure(car.dimensions?.wheelbaseMm, 'mm', locale)) },
      { label: s.bootCapacity, values: list.map((car) => formatMeasure(car.dimensions?.bootCapacityL, 'L', locale)) },
      { label: s.seatMaterial, values: list.map((car) => car.interior?.seatMaterial ?? '—') },
      { label: s.infotainment, values: list.map((car) => car.interior?.infotainmentScreen ?? '—') },
      { label: s.appleCarPlay, values: list.map((car) => boolLabel(car.technology?.appleCarPlay)) },
      { label: s.camera360, values: list.map((car) => boolLabel(car.technology?.camera360)) },
      {
        label: s.adaptiveCruiseControl,
        values: list.map((car) => boolLabel(car.technology?.adaptiveCruiseControl)),
      },
      { label: s.emergencyBraking, values: list.map((car) => boolLabel(car.safety?.autonomousEmergencyBraking)) },
      { label: s.laneKeepingAssist, values: list.map((car) => boolLabel(car.safety?.laneKeepingAssist)) },
      { label: s.airbags, values: list.map((car) => (car.safety?.airbagCount ? String(car.safety.airbagCount) : '—')) },
    ];
  }, [cars.data, locale, t]);

  const list = cars.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{t.dashboard.compare}</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            {compare.count} / {compare.max}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/cars">
              <Plus className="size-4" aria-hidden="true" />
              {t.dashboard.addCar}
            </Link>
          </Button>
          {compare.count > 0 && (
            <Button variant="ghost" size="sm" onClick={compare.clear}>
              <Trash2 className="size-4" aria-hidden="true" />
              {t.dashboard.clearComparison}
            </Button>
          )}
        </div>
      </header>

      {compare.count === 0 && (
        <EmptyState
          icon={GitCompare}
          title={t.dashboard.noComparisons}
          body={t.car.compare}
          actionLabel={t.dashboard.exploreCars}
          actionHref="/cars"
        />
      )}

      {compare.count > 0 && cars.status === 'loading' && <CarGridSkeleton count={compare.count} />}
      {cars.status === 'error' && <ErrorState message={cars.error} onRetry={cars.reload} />}

      {list.length > 0 && (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full min-w-3xl border-collapse text-sm">
            <caption className="sr-only">{t.dashboard.compare}</caption>
            <thead>
              <tr>
                {/*
                  `z-20` on the frozen column, and a solid background.

                  A sticky cell with no z-index of its own is painted in
                  document order, so every scrolling cell after it — the
                  photographs, the values — slid over the top of it instead of
                  under. The column of labels appeared to be printed on the cars.
                */}
                <th
                  scope="col"
                  className="bg-card sticky start-0 z-20 w-40 p-4 text-start align-bottom"
                >
                  <span className="sr-only">{t.car.specifications}</span>
                </th>
                {list.map((car) => (
                  <th key={car.id} scope="col" className="min-w-56 p-4 text-start align-bottom">
                    <div className="bg-secondary relative mb-3 aspect-16/10 overflow-hidden rounded-lg">
                      {car.images[0] && (
                        <MediaImage
                          src={car.images[0].url}
                          alt={car.images[0].alt ?? car.model}
                          fill
                          sizes="240px"
                          className="object-cover"
                        />
                      )}
                      <Button
                        size="icon"
                        variant="secondary"
                        aria-label={`${t.dashboard.removeCar}: ${car.model}`}
                        onClick={() => compare.remove(car.id)}
                        className="bg-background/85 absolute end-2 top-2 size-7 backdrop-blur"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                    <Link href={`/car/${car.slug}`} className="font-semibold hover:underline">
                      {car.brand.name} {car.model}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.label} className={index % 2 === 1 ? 'bg-secondary/40' : undefined}>
                  <th
                    scope="row"
                    className="bg-card text-muted-foreground sticky start-0 z-20 p-3 text-start font-normal"
                  >
                    {row.label}
                  </th>
                  {row.values.map((value, valueIndex) => (
                    <td key={`${row.label}-${valueIndex}`} className="p-3 font-medium">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {list.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {list.map((car) => (
            <Button key={car.id} asChild variant="outline" size="sm">
              <Link href={`/car/${car.slug}`}>
                {t.dashboard.viewFullDetails}: {car.model}
              </Link>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
