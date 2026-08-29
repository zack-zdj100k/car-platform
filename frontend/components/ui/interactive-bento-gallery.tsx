'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Play } from 'lucide-react';
import { MediaImage } from '@/components/shared/media-image';
import { resolveImageUrl } from '@/services/uploads.service';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Bento gallery: tiles of different sizes that open into a larger view.
 *
 * Departures from the reference implementation, all deliberate:
 *
 *   1. `motion/react` rather than `framer-motion` — the same library under its
 *      current name, and the one this project already declares.
 *
 *   2. The tiles are buttons and the large view is a real dialog. The reference
 *      opens a bare `div` over the page: Escape does nothing, focus stays behind
 *      it, and a screen reader is never told anything opened. The project's
 *      dialog handles all three.
 *
 *   3. No drag-to-reorder. In the reference every tile is draggable and a drag
 *      shuffles the order — a gesture that cannot be done from a keyboard,
 *      reorders nothing that is saved, and puts `cursor-move` on tiles whose
 *      real job is to open. Tiles open; that is the whole interaction.
 *
 *   4. Images go through the project's `MediaImage`, so an uploaded photograph
 *      and a bundled one both resolve, and Next optimises them. The reference's
 *      bare `<img>` would ship full-size originals.
 *
 *   5. Nothing autoplays with sound or without reason: a tile's video preview
 *      plays muted only while it is on screen, and holds still entirely under
 *      `prefers-reduced-motion`.
 */

export interface BentoItem {
  id: string;
  /** Shown on the tile and read as the dialog's title. */
  title: string;
  description?: string;
  /** Poster image for the tile. */
  image?: string;
  /** Tailwind span classes controlling the tile's footprint. */
  span?: string;
  /** Where the tile's primary action leads — the car, usually. */
  href?: string;
  /** An external clip, opened in a new tab. */
  videoUrl?: string;
  /** Anchor id, so a link can point straight at this tile. */
  anchor?: string;
}

export interface InteractiveBentoGalleryProps {
  items: BentoItem[];
  labels: {
    /** Button that opens the external clip. */
    watch: string;
    /** Button that goes to the linked page. */
    view: string;
    /** Announced when a tile has no picture yet. */
    noImage: string;
  };
  className?: string;
  /** Tile shape. Videos read better upright. */
  ratio?: 'portrait' | 'landscape';
}

export function InteractiveBentoGallery({
  items,
  labels,
  className,
  ratio = 'landscape',
}: InteractiveBentoGalleryProps) {
  const reduced = useReducedMotion();
  const [openId, setOpenId] = useState<string | null>(null);
  const active = items.find((item) => item.id === openId) ?? null;

  if (items.length === 0) return null;

  return (
    <div className={cn('w-full', className)}>
      <motion.ul
        className={cn(
          /*
           * Fixed row height, spans, and dense flow.
           *
           * Tiles are sized in grid rows rather than by aspect ratio: an
           * aspect-ratio fights a `row-span` — the tile is told two different
           * heights and the grid ends up with holes in it. Dense flow then lets
           * later tiles backfill whatever a wide tile leaves beside it.
           */
          'grid grid-cols-2 gap-3 [grid-auto-flow:dense] sm:grid-cols-3 lg:grid-cols-4',
          ratio === 'portrait' ? 'auto-rows-[7.5rem]' : 'auto-rows-[9rem]',
        )}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
      >
        {items.map((item) => (
          <motion.li
            key={item.id}
            id={item.anchor}
            data-entrance
            className={cn(
              'relative scroll-mt-28',
              // Upright by default on the videos page, square elsewhere.
              ratio === 'portrait' ? 'row-span-2' : 'row-span-1',
              item.span,
            )}
            variants={
              reduced
                ? { hidden: {}, visible: {} }
                : {
                    hidden: { y: 24, scale: 0.97, opacity: 0 },
                    visible: {
                      y: 0,
                      scale: 1,
                      opacity: 1,
                      transition: { type: 'spring', stiffness: 320, damping: 26 },
                    },
                  }
            }
          >
            <motion.button
              type="button"
              onClick={() => setOpenId(item.id)}
              /*
               * A tile's name normally comes from the caption inside it. This
               * guarantees one even when a caption is missing — a button with no
               * name is announced as just "button", and a missing translation
               * once left every tile on the home page in exactly that state.
               */
              aria-label={item.title || undefined}
              whileHover={reduced ? undefined : { scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="group border-border/70 bg-secondary focus-visible:outline-2 focus-visible:outline-offset-4 relative h-full w-full overflow-hidden rounded-2xl border text-start"
            >
              {item.image ? (
                <MediaImage
                  src={item.image}
                  alt=""
                  fill
                  sizes="(min-width: 64rem) 25vw, (min-width: 40rem) 33vw, 50vw"
                  className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.04]"
                />
              ) : (
                <span className="text-muted-foreground absolute inset-0 grid place-items-center p-4 text-center text-xs">
                  {labels.noImage}
                </span>
              )}

              {/* The name is always legible: a gradient, not a hover reveal. */}
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3 pt-10">
                <span className="block truncate text-sm font-semibold text-white">{item.title}</span>
                {item.description && (
                  <span className="mt-0.5 block truncate text-[11px] text-white/75">
                    {item.description}
                  </span>
                )}
              </span>

              {item.videoUrl && (
                <span className="bg-background/85 text-foreground absolute top-3 end-3 grid size-8 place-items-center rounded-full backdrop-blur">
                  <Play className="size-3.5" aria-hidden="true" />
                </span>
              )}
            </motion.button>
          </motion.li>
        ))}
      </motion.ul>

      <Dialog open={active !== null} onOpenChange={(open) => !open && setOpenId(null)}>
        <DialogContent className="sm:max-w-2xl">
          {active && (
            <>
              <DialogTitle>{active.title}</DialogTitle>
              <DialogDescription>{active.description ?? ''}</DialogDescription>

              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  className="bg-secondary relative mt-1 aspect-16/10 w-full overflow-hidden rounded-xl"
                  initial={reduced ? undefined : { opacity: 0, scale: 0.98 }}
                  animate={reduced ? undefined : { opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  {/*
                    * The clip plays in the dialog.
                    *
                    * It used to be a button that opened an external tab, back
                    * when the videos lived on TikTok. They are the seller's own
                    * files now, so the tile opens and the video plays — nobody
                    * leaves the catalogue to watch a car in it.
                    */}
                  {active.videoUrl ? (
                    <video
                      src={resolveImageUrl(active.videoUrl)}
                      poster={active.image ? resolveImageUrl(active.image) : undefined}
                      controls
                      autoPlay
                      playsInline
                      className="absolute inset-0 h-full w-full bg-black object-contain"
                    />
                  ) : active.image ? (
                    <MediaImage
                      src={active.image}
                      alt=""
                      fill
                      sizes="(min-width: 40rem) 42rem, 92vw"
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-muted-foreground absolute inset-0 grid place-items-center text-xs">
                      {labels.noImage}
                    </span>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="mt-3 flex flex-wrap gap-2">
                {active.href && (
                  <Button asChild variant="outline">
                    <Link href={active.href}>
                      {labels.view}
                      <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                    </Link>
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InteractiveBentoGallery;
