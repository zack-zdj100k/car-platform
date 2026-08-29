'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Price } from '@/components/shared/price';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/providers/locale-provider';
import type { CarDetail } from '@/types/api';

/**
 * The price and the order button, following the reader down the page.
 *
 * On a long specification page the price and the button scroll away within a
 * screen or two, and from there ordering means scrolling back up to find them.
 * This appears once they have gone and puts both a click away wherever the
 * reader has got to.
 *
 * It watches the real price block rather than a scroll distance: a threshold in
 * pixels is a guess that is wrong on every window size, and wrong again when
 * the wording above it changes length.
 */
export function StickyOrderBar({
  car,
  watch,
  selectedColorId,
}: {
  car: CarDetail;
  /** The price block on the page. The pill appears when this leaves the screen. */
  watch: RefObject<HTMLElement | null>;
  selectedColorId: string | null;
}) {
  const { t } = useLocale();
  const reduced = useReducedMotion();
  const [show, setShow] = useState(false);
  const seen = useRef(false);

  useEffect(() => {
    const element = watch.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        /*
         * Only after the price has been seen and passed.
         *
         * Without the `seen` guard the bar appears immediately on a phone,
         * where the price starts below the fold — announcing a price the reader
         * has not reached yet, over the photograph they are still looking at.
         */
        if (entry.isIntersecting) {
          seen.current = true;
          setShow(false);
          return;
        }
        // Gone upwards, not merely not-yet-arrived.
        setShow(seen.current && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [watch]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={reduced ? { opacity: 1 } : { y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { y: 24, opacity: 0 }}
          transition={{ duration: reduced ? 0.15 : 0.28, ease: [0.22, 1, 0.36, 1] }}
          /*
           * A small pill in the corner, not a bar across the top.
           *
           * Full width, it crossed the whole page under the header and followed
           * the reader everywhere — the price and the car's name repeated at
           * them while they were trying to read the specification. This is the
           * price and one button, tucked out of the way.
           *
           * `bottom-28` on small screens clears the floating navigation dock;
           * from `sm` up that dock is gone and it can sit lower.
           */
          className="border-border/70 bg-background/95 shadow-[var(--shadow-lifted)] fixed end-4 bottom-28 z-40 flex items-center gap-3 rounded-full border py-2 ps-4 pe-2 backdrop-blur-lg sm:bottom-6 sm:end-6"
        >
          <div className="min-w-0">
            <Price price={car.price} promoPrice={car.promoPrice} currency={car.currency} size="sm" />
          </div>

          <Button asChild size="sm" className="shrink-0 rounded-full">
            <Link
              href={`/car/${car.slug}/order${selectedColorId ? `?color=${selectedColorId}` : ''}`}
            >
              <ShoppingCart className="size-4" aria-hidden="true" />
              {t.car.order}
            </Link>
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
