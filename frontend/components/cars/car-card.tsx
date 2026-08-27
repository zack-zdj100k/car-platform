'use client';

import { MediaImage } from '@/components/shared/media-image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fuel, GaugeCircle, Heart, Scale } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Price } from '@/components/shared/price';
import { TikTokIcon } from '@/components/ui/brand-icons';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/shared/demo-badge';
import { useLocale } from '@/providers/locale-provider';
import { useAuth } from '@/providers/auth-provider';
import { formatAcronym, humaniseEnum } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CarListItem } from '@/types/api';

/**
 * Car card (spec §12): image, brand, model, year, price, colour and a favourite
 * button. The whole card is a link, so it is reachable and operable by keyboard;
 * the favourite and compare buttons sit above it and stop propagation.
 */
export function CarCard({
  car,
  isFavorite,
  isFavoritePending,
  onToggleFavorite,
  isComparing,
  onToggleCompare,
  priority = false,
}: {
  car: CarListItem;
  isFavorite?: boolean;
  isFavoritePending?: boolean;
  onToggleFavorite?: (carId: string) => void;
  isComparing?: boolean;
  onToggleCompare?: (carId: string) => void;
  priority?: boolean;
}) {
  const { t } = useLocale();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const image = car.images[0];
  const defaultColor = car.colors.find((color) => color.isDefault) ?? car.colors[0];

  const handleFavorite = () => {
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(`/car/${car.slug}`)}`);
      return;
    }
    onToggleFavorite?.(car.id);
  };

  return (
    <article
      data-testid="car-card"
      className={cn(
        'group border-border bg-card relative flex flex-col overflow-hidden rounded-xl border',
        'shadow-[var(--shadow-card)] transition-all duration-300',
        'hover:border-primary/25 hover:shadow-[var(--shadow-lifted)] focus-within:border-primary/40',
        'motion-safe:hover:-translate-y-0.5',
      )}
    >
      <div className="bg-secondary relative aspect-16/10 overflow-hidden">
        {image ? (
          <MediaImage
            src={image.url}
            alt={image.alt ?? `${car.brand.name} ${car.model} ${car.year}`}
            fill
            sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 92vw"
            priority={priority}
            className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
          />
        ) : (
          <div className="text-muted-foreground grid h-full place-items-center text-xs">—</div>
        )}

        {/*
          Above the card-covering link, or nothing here can be clicked.
          The title's `after:inset-0` pseudo-element spans the whole card and
          paints over this row, so favourite and compare silently did nothing
          on the catalogue — the click landed on the link underneath.
        */}
        <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {car.isFeatured && (
              <Badge className="bg-primary/95 text-primary-foreground shadow-sm">
                {t.home.featuredTitle}
              </Badge>
            )}
            {car.isDemoData && <DemoBadge label={t.admin.demoData} className="bg-background/85 backdrop-blur" />}
          </div>

          <div className="flex gap-1.5">
            {onToggleCompare && (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                aria-pressed={isComparing}
                aria-label={isComparing ? t.car.inCompare : t.car.compare}
                title={isComparing ? t.car.inCompare : t.car.compare}
                onClick={onToggleCompare.bind(null, car.id)}
                className={cn(
                  'bg-background/85 size-9 backdrop-blur transition-colors',
                  isComparing && 'bg-primary text-primary-foreground hover:bg-primary/90',
                )}
              >
                <Scale className="size-4" aria-hidden="true" />
              </Button>
            )}
            <Button
              type="button"
              size="icon"
              variant="secondary"
              aria-pressed={isFavorite ?? false}
              aria-label={isFavorite ? t.car.removeFavorite : t.car.addFavorite}
              title={isFavorite ? t.car.removeFavorite : t.car.addFavorite}
              disabled={isFavoritePending}
              onClick={handleFavorite}
              className="bg-background/85 size-9 backdrop-blur"
            >
              <Heart
                className={cn(
                  'size-4 transition-all',
                  isFavorite ? 'fill-destructive text-destructive scale-110' : 'text-foreground',
                )}
                aria-hidden="true"
              />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          {car.brand.name}
        </p>

        <h3 className="mt-1 text-lg font-semibold tracking-tight">
          {/* The link covers the card, keeping one tab stop per vehicle. */}
          <Link
            href={`/car/${car.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {car.model}
            {car.trim ? <span className="text-muted-foreground font-normal"> {car.trim}</span> : null}
          </Link>
        </h3>

        <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span>{car.year}</span>
          <span aria-hidden="true">·</span>
          <span>{humaniseEnum(car.bodyType)}</span>
          {car.engine?.fuelType && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Fuel className="size-3.5" aria-hidden="true" />
                {humaniseEnum(car.engine.fuelType)}
              </span>
            </>
          )}
          {car.engine?.powerHp && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <GaugeCircle className="size-3.5" aria-hidden="true" />
                {car.engine.powerHp} hp
              </span>
            </>
          )}
        </div>

        {car.marketingDescription && (
          <p className="text-muted-foreground mt-3 line-clamp-2 text-sm/6">{car.marketingDescription}</p>
        )}

        {/*
          Straight to the clip, for the cars that have one — so the badge means
          something rather than appearing on every card and disappointing
          whoever taps it. It sits after the vehicle's own link and above the
          card overlay: first tab stop stays "open this car", and this one is
          actually clickable.
        */}
        {car.tiktokUrl && (
          <a
            href={car.tiktokUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="bg-foreground text-background hover:bg-foreground/85 focus-visible:outline-2 focus-visible:outline-offset-2 relative z-10 mt-3 inline-flex w-fit items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-semibold transition-colors"
          >
            <TikTokIcon className="size-3.5" aria-hidden="true" />
            TikTok
          </a>
        )}

        <div className="mt-4 flex items-end justify-between gap-3 pt-2">
          <div>
            <Price price={car.price} promoPrice={car.promoPrice} currency={car.currency} />
            {car.engine?.transmission && (
              <p className="text-muted-foreground mt-0.5 text-xs">
                {formatAcronym(car.engine.transmission)}
                {car.engine.drivetrain ? ` · ${formatAcronym(car.engine.drivetrain)}` : ''}
              </p>
            )}
          </div>

          {car.colors.length > 0 && (
            <ul className="flex items-center gap-1.5" aria-label={t.car.colours}>
              {car.colors.slice(0, 4).map((color) => (
                <li key={color.id}>
                  <span
                    className="border-border/80 block size-4.5 rounded-full border shadow-inner"
                    style={{ backgroundColor: color.hexCode }}
                    title={color.name}
                  >
                    <span className="sr-only">{color.name}</span>
                  </span>
                </li>
              ))}
              {car.colors.length > 4 && (
                <li className="text-muted-foreground text-xs">+{car.colors.length - 4}</li>
              )}
            </ul>
          )}
        </div>

        {defaultColor && (
          <p className="text-muted-foreground mt-2 text-xs">
            {t.car.colours}: {defaultColor.name}
          </p>
        )}
      </div>
    </article>
  );
}
