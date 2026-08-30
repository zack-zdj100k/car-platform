'use client';

import { formatPrice } from '@/lib/format';
import { useLocale } from '@/providers/locale-provider';
import { cn } from '@/lib/utils';

/**
 * A vehicle's price, with its promotion when one is running.
 *
 * While a promotional price is set it is the price: it takes the prominent
 * position, the normal price sits beside it struck through, and a badge states
 * the reduction. One component for every place a price appears, so a promotion
 * cannot show on the card and be missed on the vehicle's own page.
 *
 * Struck-through text alone says nothing to a screen reader, so each figure
 * carries a short label that only assistive technology reads.
 */
export function Price({
  price,
  promoPrice,
  currency,
  size = 'md',
  className,
}: {
  price: string | number;
  promoPrice?: string | number | null;
  currency: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const { t, locale } = useLocale();

  const normal = Number(price);
  const promo = promoPrice === null || promoPrice === undefined ? null : Number(promoPrice);
  const onOffer = promo !== null && Number.isFinite(promo) && promo > 0 && promo < normal;

  const amounts = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl sm:text-4xl',
  } as const;

  if (!onOffer) {
    return (
      <p className={cn('font-display font-semibold tracking-tight', amounts[size], className)}>
        {formatPrice(normal, currency, locale)}
      </p>
    );
  }

  const saved = Math.round(((normal - promo) / normal) * 100);

  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2.5 gap-y-1', className)}>
      <p className={cn('font-display text-primary font-semibold tracking-tight', amounts[size])}>
        <span className="sr-only">{t.car.promoPriceLabel} </span>
        {formatPrice(promo, currency, locale)}
      </p>

      <s className="text-muted-foreground text-sm font-medium">
        <span className="sr-only">{t.car.normalPriceLabel} </span>
        {formatPrice(normal, currency, locale)}
      </s>

      {saved > 0 && (
        <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-semibold">
          {t.car.promoSaving.replace('{percent}', String(saved))}
        </span>
      )}
    </div>
  );
}
