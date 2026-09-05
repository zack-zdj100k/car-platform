'use client';

import { MediaImage } from '@/components/shared/media-image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Price } from '@/components/shared/price';
import { useLocale } from '@/providers/locale-provider';
import { formatAcronym, humaniseEnum } from '@/lib/format';
import type { CarEngine, CarListItem } from '@/types/api';

/**
 * Only the engine fields this row displays. Keeps it compatible with both the
 * listing payload (a narrow Pick) and the favourites payload (the full record).
 */
type RowEngine = Pick<CarEngine, 'fuelType'> &
  Partial<Pick<CarEngine, 'engineType' | 'powerHp' | 'transmission'>>;

/**
 * Compact vehicle row used across the dashboard lists (spec §40, §41, §42).
 * Shows image, brand, model, year, price — plus engine where the spec asks for it.
 */
export function CarRow({
  car,
  meta,
  showEngine = false,
  action,
}: {
  car: Omit<CarListItem, 'engine'> & { engine?: RowEngine | null };
  meta?: string;
  showEngine?: boolean;
  action?: React.ReactNode;
}) {
  const { t, locale } = useLocale();
  const image = car.images[0];

  return (
    <div className="border-border bg-card flex items-center gap-4 rounded-xl border p-3 shadow-[var(--shadow-card)]">
      <div className="bg-secondary relative size-20 shrink-0 overflow-hidden rounded-lg sm:size-24">
        {image && (
          <MediaImage
            src={image.url}
            alt={image.alt ?? `${car.brand.name} ${car.model}`}
            fill
            sizes="96px"
            className="object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          {car.brand.name}
        </p>
        <h3 className="truncate font-semibold">
          <Link href={`/car/${car.slug}`} className="hover:underline underline-offset-4">
            {car.model}
            {car.trim ? <span className="text-muted-foreground font-normal"> {car.trim}</span> : null}
          </Link>
        </h3>
        <p className="text-muted-foreground mt-0.5 truncate text-sm">
          {car.year} · {humaniseEnum(car.bodyType, locale)}
          {showEngine && car.engine
            ? ` · ${car.engine.engineType ?? humaniseEnum(car.engine.fuelType, locale)}${
                car.engine.powerHp ? ` · ${car.engine.powerHp} hp` : ''
              }`
            : ''}
          {car.engine?.transmission && !showEngine ? ` · ${formatAcronym(car.engine.transmission, locale)}` : ''}
        </p>
        {meta && <p className="text-muted-foreground mt-1 text-xs">{meta}</p>}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <Price price={car.price} promoPrice={car.promoPrice} currency={car.currency} size="sm" />
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/car/${car.slug}`}>{t.car.viewDetails}</Link>
          </Button>
          {action}
        </div>
      </div>
    </div>
  );
}
