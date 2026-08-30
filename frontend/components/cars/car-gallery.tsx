'use client';

import { MediaImage } from '@/components/shared/media-image';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, Rotate3d } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CarSpin } from '@/components/cars/car-spin';
import { useLocale } from '@/providers/locale-provider';
import { cn } from '@/lib/utils';
import type { CarImage } from '@/types/api';

/**
 * Car gallery (spec §13): main image plus thumbnails. Keyboard operable — the
 * thumbnails are a real tablist, and arrow keys move between them.
 *
 * A car with a 360° set gets it as the first slide, ahead of the photographs.
 * It belongs here rather than on the cards in the listing: sixteen cards would
 * mean several hundred frames on one page, and a horizontal drag inside a small
 * card fights the reader's attempt to scroll. By the time somebody opens this
 * page they have already decided to look properly.
 */
export function CarGallery({
  images,
  alt,
  spinFrames = [],
  caption,
}: {
  images: CarImage[];
  alt: string;
  spinFrames?: string[];
  /** The chosen colour's name, shown briefly when it changes. */
  caption?: string;
}) {
  const { t } = useLocale();
  const reduced = useReducedMotion();
  const hasSpin = spinFrames.length > 0;
  // Slide 0 is the spin when there is one, so the photographs shift along by one.
  const [index, setIndex] = useState(0);

  /*
   * A new set of photographs starts at its beginning.
   *
   * This used to be done by keying the whole component on the colour, which
   * remounted it — discarding the picture and rebuilding it, the exact white
   * flash the cross-fade exists to prevent. Watching the pictures themselves
   * achieves the same thing without throwing anything away: choose a colour
   * while looking at photograph four and you are shown the new colour's first,
   * not its fourth.
   *
   * Somebody spinning the car when the colour changes is left on the spin.
   */
  const signature = images.map((image) => image.url).join('|');
  const previousSignature = useRef(signature);

  useEffect(() => {
    if (previousSignature.current === signature) return;
    previousSignature.current = signature;
    setIndex((current) => (hasSpin && current === 0 ? 0 : hasSpin ? 1 : 0));
  }, [signature, hasSpin]);

  /*
   * Nothing to show at all — no photographs *and* nothing to turn.
   *
   * This used to check the photographs alone, so a car with a 360° set and no
   * pictures yet showed an empty grey box and no viewer. That is exactly the
   * state a car is in the minute after it is created.
   */
  if (images.length === 0 && !hasSpin) {
    return (
      <div className="bg-secondary text-muted-foreground grid aspect-16/10 place-items-center rounded-xl text-sm">
        —
      </div>
    );
  }

  const slides = hasSpin ? images.length + 1 : images.length;
  const showingSpin = hasSpin && index === 0;
  const photoIndex = hasSpin ? index - 1 : index;
  const current = images[Math.min(Math.max(photoIndex, 0), images.length - 1)];
  const go = (next: number) => setIndex((next + slides) % slides);

  const detail = !showingSpin ? current?.label?.trim() : undefined;
  const visibleCaption = [caption, detail].filter(Boolean).join(' · ') || undefined;

  return (
    <div className="space-y-3">
      <div className="bg-secondary relative aspect-16/10 overflow-hidden rounded-xl">
        {showingSpin ? (
          <CarSpin frames={spinFrames} alt={alt} className="absolute inset-0" />
        ) : current ? (
          /*
           * Cross-faded rather than swapped.
           *
           * Choosing a colour is the moment a customer commits to one, and a
           * hard cut through a white flash makes two photographs of the same
           * car look like two different cars. The outgoing picture stays until
           * the incoming one has arrived.
           */
          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={current.url}
              className="absolute inset-0"
              initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 1.015 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduced ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <MediaImage
                src={current.url}
                alt={current.alt ?? alt}
                fill
                sizes="(min-width: 1024px) 60vw, 92vw"
                priority
                className="object-cover"
              />
            </motion.div>
          </AnimatePresence>
        ) : null}

        {/*
          * The colour's name, and what this particular picture is.
          *
          * The second half matters for the free groups: a photograph an
          * administrator filed under "Scratch on the rear bumper" should say so
          * rather than leave a customer guessing what they are looking at.
          */}
        {visibleCaption && !showingSpin && (
          <AnimatePresence mode="wait">
            <motion.p
              key={visibleCaption}
              initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.35 }}
              className="bg-background/85 text-foreground absolute bottom-3 start-3 rounded-full px-3 py-1 text-xs font-medium backdrop-blur"
            >
              {visibleCaption}
            </motion.p>
          </AnimatePresence>
        )}

        {/*
          * The arrows are hidden while the car is being spun. They sit exactly
          * where the drag happens, and a reader reaching for the car would keep
          * catching a button instead.
          */}
        {slides > 1 && !showingSpin && (
          <>
            <Button
              size="icon"
              variant="secondary"
              aria-label={t.cars.previous}
              onClick={() => go(index - 1)}
              className="bg-background/85 absolute start-3 top-1/2 size-9 -translate-y-1/2 backdrop-blur"
            >
              <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              aria-label={t.cars.next}
              onClick={() => go(index + 1)}
              className="bg-background/85 absolute end-3 top-1/2 size-9 -translate-y-1/2 backdrop-blur"
            >
              <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Button>
            <p className="bg-background/85 absolute bottom-3 end-3 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur">
              {index + 1} / {slides}
            </p>
          </>
        )}
      </div>

      {slides > 1 && (
        <div role="tablist" aria-label={t.car.gallery} className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {hasSpin && (
            <button
              type="button"
              role="tab"
              aria-selected={showingSpin}
              aria-label={t.car.spinLabel}
              onClick={() => setIndex(0)}
              className={cn(
                'bg-secondary text-foreground relative grid aspect-4/3 place-items-center gap-1 overflow-hidden rounded-lg transition-all',
                showingSpin
                  ? 'ring-primary ring-offset-background ring-2 ring-offset-2'
                  : 'opacity-70 hover:opacity-100',
              )}
            >
              <Rotate3d className="text-primary size-5" aria-hidden="true" />
              <span className="text-[10px] font-semibold tracking-wider">360°</span>
            </button>
          )}

          {images.map((image, imageIndex) => (
            <button
              key={image.url}
              type="button"
              role="tab"
              aria-selected={!showingSpin && imageIndex === photoIndex}
              aria-label={image.alt ?? `${alt} ${imageIndex + 1}`}
              onClick={() => setIndex(hasSpin ? imageIndex + 1 : imageIndex)}
              className={cn(
                'bg-secondary relative aspect-4/3 overflow-hidden rounded-lg transition-all',
                !showingSpin && imageIndex === photoIndex
                  ? 'ring-primary ring-2 ring-offset-2 ring-offset-background'
                  : 'opacity-70 hover:opacity-100',
              )}
            >
              <MediaImage
                src={image.url}
                alt=""
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
