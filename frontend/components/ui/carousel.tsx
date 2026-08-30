'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A horizontal rail of cards with snap points and arrow controls.
 *
 * Adapted from the reference implementation, with these departures:
 *
 *   1. It carries content rather than defining it. The reference hard-codes a
 *      report card — image, heading, period. Here the items are whatever the
 *      caller renders, so the vehicle card the rest of the site already uses
 *      appears unchanged inside the rail.
 *
 *   2. The scroll container is focusable and named. A region that scrolls but
 *      cannot be reached by keyboard fails WCAG 2.1.1, and the audit checks
 *      for exactly that.
 *
 *   3. Positions are read as distance travelled rather than `scrollLeft`
 *      directly, because in Arabic the rail starts at the right and
 *      `scrollLeft` runs negative. The arrows are previous/next rather than
 *      left/right for the same reason, and they mirror with the writing
 *      direction.
 *
 *   4. It re-measures on resize. Listening only to scroll leaves the next
 *      arrow enabled after a window grows wide enough to show every card.
 */

export interface CarouselProps extends Omit<React.ComponentProps<'section'>, 'title'> {
  /** One entry per card. Each is placed in its own snap-aligned cell. */
  items: React.ReactNode[];
  /** Names the scrollable region for assistive technology. */
  label: string;
  previousLabel: string;
  nextLabel: string;
  /** Width of a single cell. */
  itemClassName?: string;
  className?: string;
}

export const Carousel = React.forwardRef<HTMLElement, CarouselProps>(function Carousel(
  {
    items,
    label,
    previousLabel,
    nextLabel,
    itemClassName = 'w-[17rem] sm:w-[20rem] lg:w-[22rem]',
    className,
    ...props
  },
  ref,
) {
  const railRef = React.useRef<HTMLUListElement>(null);
  const [canGoBack, setCanGoBack] = React.useState(false);
  const [canGoForward, setCanGoForward] = React.useState(false);
  const [rtl, setRtl] = React.useState(false);

  const measure = React.useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    // Distance travelled, so right-to-left — where scrollLeft is negative —
    // reads the same as left-to-right.
    const travelled = Math.abs(rail.scrollLeft);
    const total = rail.scrollWidth - rail.clientWidth;
    setCanGoBack(travelled > 1);
    setCanGoForward(travelled < total - 1);
    setRtl(getComputedStyle(rail).direction === 'rtl');
  }, []);

  React.useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    measure();
    rail.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(rail);

    return () => {
      rail.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [items, measure]);

  const move = (direction: 'back' | 'forward') => {
    const rail = railRef.current;
    if (!rail) return;

    const rtl = getComputedStyle(rail).direction === 'rtl';
    const step = rail.clientWidth * 0.8;
    const sign = (direction === 'forward' ? 1 : -1) * (rtl ? -1 : 1);
    rail.scrollBy({ left: step * sign, behavior: 'smooth' });
  };

  const arrow =
    'grid size-10 place-items-center rounded-full border transition-[background-color,transform,opacity] duration-200 ' +
    'border-border bg-card hover:bg-secondary disabled:opacity-30 ' +
    'motion-safe:active:scale-90 disabled:pointer-events-none';

  /*
   * The edge fades out on whichever side still has cards behind it, so a row
   * cut off by the container reads as continuing rather than as ending. In
   * Arabic the rail runs the other way, so the sides swap with it.
   */
  const fadeLeft = rtl ? canGoForward : canGoBack;
  const fadeRight = rtl ? canGoBack : canGoForward;
  const mask = `linear-gradient(to right, transparent 0px, black ${fadeLeft ? '3rem' : '0px'}, black calc(100% - ${fadeRight ? '3rem' : '0px'}), transparent 100%)`;

  return (
    <section ref={ref} className={cn('w-full', className)} {...props}>
      <div className="mb-4 flex justify-end gap-2">
        <button type="button" onClick={() => move('back')} disabled={!canGoBack} aria-label={previousLabel} className={arrow}>
          <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => move('forward')} disabled={!canGoForward} aria-label={nextLabel} className={arrow}>
          <ChevronRight className="size-5 rtl:rotate-180" aria-hidden="true" />
        </button>
      </div>

      {/*
        `tabIndex` makes the rail reachable by keyboard, where the arrow keys
        scroll it; the label says what it is once focus lands there. The pale
        edges hint that the row continues past the fold.
      */}
      <ul
        ref={railRef}
        tabIndex={0}
        aria-label={label}
        className={cn(
          'scrollbar-hide flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2',
          'focus-visible:outline-2 focus-visible:outline-offset-4',
          'motion-reduce:scroll-auto',
        )}
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        {items.map((item, index) => (
          <li
            key={index}
            className={cn(
              'shrink-0 snap-start transition-transform duration-200 motion-safe:active:scale-[0.98]',
              itemClassName,
            )}
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
});

export default Carousel;
