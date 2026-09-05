'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { MediaImage } from '@/components/shared/media-image';
import { cn } from '@/lib/utils';

/**
 * Elastic gallery: panels that expand as you point at them.
 *
 * Departures from the reference implementation, all deliberate:
 *
 *   1. The panels are buttons. The reference puts `onClick` and `onMouseEnter`
 *      on a `div`, which cannot be reached by Tab, cannot be opened with Enter
 *      and announces nothing — the gallery is simply unusable without a mouse.
 *      Focus expands a panel here, exactly as hovering does.
 *
 *   2. Content is passed in. The reference hard-codes five stock photographs of
 *      neon and brutalist architecture; here the photographs and captions are
 *      the ones an administrator uploads.
 *
 *   3. Images go through the project's image component, so an upload and a
 *      bundled asset both resolve and Next optimises them — the reference's
 *      remote URLs would need a whitelist and would ship unoptimised.
 *
 *   4. The action is a real link rather than decorative text saying "View
 *      Project". Text that looks like a button and does nothing is worse than
 *      no text at all.
 */

export interface ElasticItem {
  id: string;
  title: string;
  /** Small chip above the title. */
  category?: string;
  src: string;
  alt: string;
  /** Where the panel's action leads. */
  href?: string;
}

export function ElasticGallery({
  items,
  actionLabel,
  className,
}: {
  items: ElasticItem[];
  actionLabel: string;
  className?: string;
}) {
  // The middle panel starts open, so the gallery reads as a gallery at rest.
  const [activeId, setActiveId] = useState<string | null>(
    items[Math.floor(items.length / 2)]?.id ?? null,
  );

  if (items.length === 0) return null;

  return (
    <div className={cn('w-full', className)}>
      <div className="mx-auto flex h-[32rem] w-full flex-col gap-2 md:h-[37.5rem] md:flex-row md:gap-4">
        {items.map((item) => {
          const active = activeId === item.id;

          return (
            <div
              key={item.id}
              onMouseEnter={() => setActiveId(item.id)}
              className={cn(
                'border-border bg-card relative overflow-hidden rounded-2xl border',
                'transition-[flex,filter] duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]',
                // Four parts of the row when open, one when closed: the panels
                // share the space, so opening one closes the rest.
                active ? 'flex-[4]' : 'flex-[1]',
                active ? 'brightness-100' : 'brightness-50 hover:brightness-75',
              )}
            >
              {/* The whole panel is the control: click or focus to open it. */}
              <button
                type="button"
                aria-pressed={active}
                aria-label={item.title}
                onClick={() => setActiveId(item.id)}
                onFocus={() => setActiveId(item.id)}
                className="focus-visible:outline-primary absolute inset-0 z-10 h-full w-full cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-4"
              />

              <div className="absolute inset-0 h-full w-full">
                <MediaImage
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(min-width: 48rem) 60vw, 92vw"
                  className={cn(
                    'object-cover transition-transform duration-1000',
                    active ? 'scale-100' : 'scale-110',
                  )}
                />
                <div
                  className={cn(
                    'absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-500',
                    active ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </div>

              <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-4 md:p-8">
                <div
                  className={cn(
                    /*
                     * `z-20` on this wrapper, not only on the link inside it.
                     *
                     * The wrapper fades, and an element with opacity below 1
                     * creates its own stacking context — which trapped the
                     * link's z-20 inside a box that had no z-index of its own,
                     * and left it underneath the panel's full-size button. The
                     * link was visible, and every click opened the panel
                     * instead of following it.
                     */
                    'relative z-20 flex flex-col gap-2 transition-all duration-500',
                    active ? 'translate-y-0 opacity-100 delay-200' : 'translate-y-12 opacity-0',
                  )}
                >
                  {item.category && (
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/30 bg-white/10 px-2 py-1 text-[10px] font-medium tracking-wider text-white uppercase backdrop-blur-md md:px-3 md:text-xs">
                        {item.category}
                      </span>
                    </div>
                  )}

                  <h3 className="text-2xl leading-none font-black text-white uppercase md:text-5xl">
                    {item.title}
                  </h3>

                  {item.href && (
                    <Link
                      href={item.href}
                      /*
                       * Reachable only on the open panel. The wrapper turns
                       * pointer events off so the photograph does not swallow
                       * this link — and a closed panel's link is invisible, so
                       * it should not be clickable or reachable by tab either.
                       */
                      tabIndex={active ? undefined : -1}
                      aria-hidden={!active}
                      className={cn(
                        'relative z-20 mt-2 inline-flex w-fit items-center gap-2 text-xs font-bold tracking-widest text-white/85 uppercase transition-colors hover:text-white md:mt-4 md:text-sm',
                        active ? 'pointer-events-auto' : 'pointer-events-none',
                      )}
                    >
                      {actionLabel}
                      <ArrowUpRight className="size-3 md:size-4 rtl:-scale-x-100" aria-hidden="true" />
                    </Link>
                  )}
                </div>

                {/* Closed state: the title turned on its side, as designed. */}
                <div
                  aria-hidden="true"
                  className={cn(
                    'absolute bottom-4 left-1/2 -translate-x-1/2 transition-all duration-500 md:bottom-8',
                    active ? 'scale-50 opacity-0' : 'opacity-100 delay-500',
                  )}
                >
                  <span className="hidden text-xl font-bold tracking-widest whitespace-nowrap text-white uppercase [writing-mode:vertical-rl] md:block">
                    {item.title}
                  </span>
                  <span className="block text-xs font-bold text-white md:hidden">{item.id}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ElasticGallery;
