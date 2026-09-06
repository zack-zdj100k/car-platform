'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useLocale } from '@/providers/locale-provider';
import { cn } from '@/lib/utils';

/**
 * 360° viewer: drag to turn the car.
 *
 * Notes on the parts that are easy to get wrong:
 *
 *   1. **Vertical scrolling still works.** On a phone, a viewer that swallows
 *      every gesture traps the reader: they try to move down the page and the
 *      car spins instead. `touch-action: pan-y` hands vertical movement back to
 *      the page and keeps only the horizontal for turning.
 *
 *   2. **One plain `<img>`, not twenty-four.** Every frame is fetched into the
 *      browser's cache on mount, then a single element's `src` is swapped as the
 *      angle changes — instant, because each frame is already cached. Mounting
 *      all of them would put two dozen elements in the DOM for one visible
 *      picture; swapping without preloading would flash white on every frame.
 *
 *   3. **It works without a mouse.** The control is a slider over the angle, so
 *      arrow keys turn the car and a screen reader is told where it points
 *      rather than being handed an image that silently changes.
 *
 *   4. **Reduced motion is respected.** No hint animation and no opening nudge;
 *      the car simply sits still until it is dragged, which still works.
 */

/** A full drag across the viewer turns the car about one and a half times. */
const TURNS_PER_WIDTH = 1.5;

export function CarSpin({
  frames,
  alt,
  className,
}: {
  frames: string[];
  alt: string;
  className?: string;
}) {
  const { t } = useLocale();
  const reduced = useReducedMotion();

  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(0);
  const [dragging, setDragging] = useState(false);
  /*
   * `nudged` is the opening turn having played; `hinted` is the reader having
   * actually taken hold of the car. They were one flag, which meant the
   * invitation to drag disappeared the moment the car nudged itself — telling
   * the reader it moves and simultaneously removing the words explaining that
   * they can move it.
   */
  const [nudged, setNudged] = useState(false);
  const [hinted, setHinted] = useState(false);

  const container = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; startX: number; startIndex: number } | null>(null);

  const total = frames.length;
  /*
   * `index` is fractional while a finger is down — see the blend below — so
   * this rounds, and then wraps: an index a hair short of the last frame gives
   * 359.7°, which rounds to 360, and a slider that reports 360 out of a
   * maximum of 359 is a broken slider.
   */
  const angle = total > 0 ? Math.round((index / total) * 360) % 360 : 0;

  /*
   * Which two frames are on screen, and how much of the second.
   *
   * Eight photographs are 45° apart, and cutting from one to the next at that
   * spacing does not read as a car turning — it reads as a slideshow, which is
   * exactly what it looked like. Holding both and fading between them across
   * the gap gives the eye something continuous to follow.
   *
   * The blend only exists mid-drag: releasing snaps to the nearest stop, so
   * what a reader is left looking at is always one sharp photograph rather
   * than two ghosted together.
   */
  const base = total > 0 ? ((Math.floor(index) % total) + total) % total : 0;
  const upcoming = total > 0 ? (base + 1) % total : 0;
  const blend = index - Math.floor(index);

  /* Warm the cache so swapping `src` never shows a gap. */
  useEffect(() => {
    let cancelled = false;
    let loaded = 0;

    for (const frame of frames) {
      const image = new Image();
      image.onload = image.onerror = () => {
        if (cancelled) return;
        loaded += 1;
        setReady(loaded);
      };
      image.src = frame;
    }

    return () => {
      cancelled = true;
    };
  }, [frames]);

  /*
   * One turn of a few frames when the viewer first appears, so it is obvious
   * the car moves. It runs once, only after the frames are cached, and never
   * under reduced motion.
   */
  useEffect(() => {
    if (reduced || nudged || hinted || total === 0 || ready < total) return;

    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      setIndex((current) => (Math.round(current) + 1) % total);
      if (step >= 4) {
        clearInterval(timer);
        setNudged(true);
      }
    }, 90);

    return () => clearInterval(timer);
  }, [reduced, nudged, hinted, ready, total]);

  const turnTo = useCallback(
    (clientX: number) => {
      const element = container.current;
      const state = drag.current;
      if (!element || !state || total === 0) return;

      /*
       * A width of zero would divide by it.
       *
       * Not hypothetical: measured mid-gesture in a background tab the element
       * reports zero, the division gives infinity, and the frame index becomes
       * NaN — at which point `frames[NaN]` is undefined, the picture is replaced
       * by a broken-image icon and the angle reads "NaN°" for good, because
       * every later move starts from a NaN too. One guard ends the whole class
       * of that failure.
       */
      const width = element.clientWidth;
      if (!Number.isFinite(width) || width <= 0) return;

      const travelled = (clientX - state.startX) / width;
      const moved = travelled * TURNS_PER_WIDTH * total;
      /*
       * Not rounded. The fraction is what the cross-fade needs — rounding here
       * was what made the car jump from photograph to photograph instead of
       * travelling between them.
       *
       * Dragging left turns the car towards the viewer's left, as if pushing it.
       */
      const next = state.startIndex - moved;
      if (!Number.isFinite(next)) return;

      setIndex(((next % total) + total) % total);
    },
    [total],
  );

  if (total === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <div
        ref={container}
        role="slider"
        tabIndex={0}
        aria-label={`${alt} — ${t.car.spinLabel}`}
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={angle}
        aria-valuetext={`${angle}°`}
        onPointerDown={(event) => {
          // Only the primary button; a right-click should open the menu.
          if (event.button !== 0) return;
          drag.current = { pointerId: event.pointerId, startX: event.clientX, startIndex: index };
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
          setHinted(true);
        }}
        onPointerMove={(event) => {
          if (drag.current?.pointerId !== event.pointerId) return;
          turnTo(event.clientX);
        }}
        onPointerUp={(event) => {
          if (drag.current?.pointerId !== event.pointerId) return;
          event.currentTarget.releasePointerCapture(event.pointerId);
          drag.current = null;
          setDragging(false);
          // Settle on a photograph rather than between two of them.
          setIndex((current) => Math.round(current) % total);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
          setIndex((current) => Math.round(current) % total);
        }}
        onKeyDown={(event) => {
          const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
          if (step === 0) return;
          event.preventDefault();
          setHinted(true);
          setIndex((current) => (Math.round(current) + step + total) % total);
        }}
        className={cn(
          'bg-secondary relative aspect-16/10 touch-pan-y overflow-hidden rounded-xl select-none',
          'focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2',
          dragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
      >
        {/*
          * A plain `img`, not the project's `MediaImage`. The frames are
          * pre-cached above and swapped by `src` many times a second; putting
          * that through the image optimiser would request a fresh variant of
          * every frame at every size and undo the caching entirely.
          */}
        {/* eslint-disable-next-line @next/next/no-img-element -- see note 2 above:
            the frames are pre-cached and the `src` is swapped many times a
            second, which the image optimiser would defeat rather than help. */}
        <img
          src={frames[base] ?? frames[0]}
          alt={alt}
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- as above. */}
        <img
          src={frames[upcoming] ?? frames[0]}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{ opacity: blend }}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />

        <p className="bg-background/85 text-foreground absolute bottom-3 end-3 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums backdrop-blur">
          {angle}°
        </p>

        {/* The invitation to drag, until the reader has dragged once. */}
        {!hinted && (
          <p
            className={cn(
              'bg-background/85 text-foreground pointer-events-none absolute inset-x-0 bottom-3 mx-auto flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur',
              !reduced && 'motion-safe:animate-pulse',
            )}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            {t.car.spinHint}
          </p>
        )}

        {/* Quietly shows that the remaining frames are still arriving. */}
        {ready < total && (
          <span
            aria-hidden="true"
            className="bg-primary absolute inset-x-0 top-0 h-0.5 origin-left transition-transform duration-300"
            style={{ transform: `scaleX(${ready / total})` }}
          />
        )}
      </div>
    </div>
  );
}
