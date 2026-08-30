'use client';

import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useIsClient } from '@/hooks/use-client-store';
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
  // `document` does not exist while rendering on the server, and a portal needs
  // it. The project's own hook reports this without an effect or a re-render.
  const mounted = useIsClient();

  useEffect(() => {
    const element = watch.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        /*
         * Above the viewport, not merely out of it.
         *
         * `top < 0` is the whole condition: the price has scrolled off the top,
         * so the reader has passed it. On a phone the price starts *below* the
         * fold, where `top` is positive — and announcing a price they have not
         * reached yet, over the photograph they are still looking at, is
         * backwards.
         *
         * This used to also require having seen the price intersect at least
         * once, which sounded equivalent and was not: a reader who scrolls
         * immediately after the page loads never produces that first event, and
         * the pill then never appeared again for the rest of the page.
         */
        setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [watch]);

  if (!mounted) return null;

  /*
   * Rendered into the body.
   *
   * `position: fixed` is not always relative to the window: any ancestor with a
   * transform, a filter or a backdrop-filter becomes its containing block
   * instead, and this page has several. In Safari the pill was caught by one of
   * them and appeared halfway up the page, under the gallery, rather than in the
   * corner. A portal removes the question entirely.
   */
  return createPortal(
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
          /*
           * Bottom right, in every language. `end-*` would flip it to the
           * left in Arabic, and this was asked for as the right-hand corner.
           */
          className="border-border/70 bg-background/95 shadow-[var(--shadow-lifted)] fixed right-4 bottom-28 z-50 flex items-center gap-3 rounded-full border py-2 ps-4 pe-2 backdrop-blur-lg sm:right-6 sm:bottom-6"
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
    </AnimatePresence>,
    document.body,
  );
}
