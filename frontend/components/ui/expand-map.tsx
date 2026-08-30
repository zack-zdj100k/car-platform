'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { ArrowUpRight, Map } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Where the showroom is: a card that opens, and a real map behind it.
 *
 * Departures from the reference implementation, all deliberate:
 *
 *   1. **The drawing is not a map, and does not pretend to be one.** The
 *      reference draws invented roads and buildings and labels the card "Live".
 *      On a page selling cars, a fabricated street plan beside a real address
 *      tells a customer something untrue about where the business is. The
 *      pattern here is decoration, the address is the fact, and clicking opens
 *      the seller's own map link — which is the thing a customer actually wants.
 *
 *   2. **It is a link.** The reference is a `div` with `onClick`: unreachable by
 *      keyboard, announced as nothing, and impossible to open in a new tab.
 *
 *   3. `motion/react`, not `framer-motion` — the same library under its current
 *      name, and the one this project already depends on. Installing the old
 *      name would ship two copies of it.
 *
 *   4. Colours come from the site's tokens. The reference mixes a hard-coded
 *      emerald with `hsl(var(--foreground) / 0.08)`, a form this project's
 *      tokens are not in — they are hex, so that expression produces nothing at
 *      all.
 *
 *   5. The tilt and the expansion stop under `prefers-reduced-motion`, and the
 *      card opens on focus as well as hover so it is not mouse-only.
 */

export interface LocationMapProps {
  /** What to call the place — "ZODIC CAR, Algiers". */
  location: string;
  /** The address, or anything else worth reading under the name. */
  detail?: string;
  /** The seller's own map link. Without it the card does not render. */
  href: string;
  /** Wording for the action, translated by the caller. */
  openLabel: string;
  className?: string;
}

export function LocationMap({ location, detail, href, openLabel, className }: LocationMapProps) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const container = useRef<HTMLAnchorElement>(null);

  /*
   * A phone gets the card at the width of its column, already open.
   *
   * The fixed 380px was wider than a 390px screen once the section's padding
   * was taken off, so the page itself scrolled sideways. And opening on hover
   * is a mouse idea: on a touch screen the first tap follows the link, so the
   * address and the map behind it were never shown at all — the card said the
   * name of the place and nothing else.
   */
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 639px), (hover: none)');
    const apply = () => setCompact(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  const isOpen = compact || expanded;

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-60, 60], [6, -6]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-60, 60], [-6, 6]), { stiffness: 300, damping: 30 });

  if (!href) return null;

  const open = () => {
    setHovered(true);
    setExpanded(true);
  };

  const close = () => {
    mouseX.set(0);
    mouseY.set(0);
    setHovered(false);
    setExpanded(false);
  };

  return (
    <motion.a
      ref={container}
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`${location}${detail ? ` — ${detail}` : ''} · ${openLabel}`}
      className={cn('group relative block max-w-full select-none', compact ? 'w-full' : 'w-fit', className)}
      style={{ perspective: 1000 }}
      onMouseMove={(event) => {
        if (reduced || !container.current) return;
        const rect = container.current.getBoundingClientRect();
        mouseX.set(event.clientX - (rect.left + rect.width / 2));
        mouseY.set(event.clientY - (rect.top + rect.height / 2));
      }}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={close}
    >
      <motion.div
        className="bg-card border-border relative overflow-hidden rounded-2xl border shadow-[var(--shadow-card)]"
        style={reduced ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' }}
        /*
         * Roughly double the reference's footprint. At 240×140 the card was a
         * label rather than a place — the address wrapped onto three lines and
         * the pin had nowhere to sit. A phone gets the width of its column
         * instead of either fixed size, so nothing scrolls sideways.
         */
        animate={
          compact
            ? { width: '100%', height: 320 }
            : { width: expanded ? 560 : 380, height: expanded ? 400 : 220 }
        }
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 35 }}
      >
        {/* Decoration, and read as such: a plan of streets, not of this street. */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.35 }}
            >
              <div className="bg-secondary absolute inset-0" />

              <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                {[35, 65].map((y, index) => (
                  <motion.line
                    key={`main-${y}`}
                    x1="0%"
                    y1={`${y}%`}
                    x2="100%"
                    y2={`${y}%`}
                    className="stroke-foreground/20"
                    strokeWidth="4"
                    initial={{ pathLength: reduced ? 1 : 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: reduced ? 0 : 0.7, delay: reduced ? 0 : 0.15 + index * 0.1 }}
                  />
                ))}
                {[30, 70].map((x, index) => (
                  <motion.line
                    key={`cross-${x}`}
                    x1={`${x}%`}
                    y1="0%"
                    x2={`${x}%`}
                    y2="100%"
                    className="stroke-foreground/15"
                    strokeWidth="3"
                    initial={{ pathLength: reduced ? 1 : 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : 0.3 + index * 0.1 }}
                  />
                ))}
                {[20, 50, 80].map((y, index) => (
                  <motion.line
                    key={`minor-h-${y}`}
                    x1="0%"
                    y1={`${y}%`}
                    x2="100%"
                    y2={`${y}%`}
                    className="stroke-foreground/10"
                    strokeWidth="1.5"
                    initial={{ pathLength: reduced ? 1 : 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 0.45 + index * 0.08 }}
                  />
                ))}
                {[15, 45, 85].map((x, index) => (
                  <motion.line
                    key={`minor-v-${x}`}
                    x1={`${x}%`}
                    y1="0%"
                    x2={`${x}%`}
                    y2="100%"
                    className="stroke-foreground/10"
                    strokeWidth="1.5"
                    initial={{ pathLength: reduced ? 1 : 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 0.5 + index * 0.08 }}
                  />
                ))}
              </svg>

              {[
                'top-[40%] left-[10%] w-[15%] h-[20%]',
                'top-[15%] left-[35%] w-[12%] h-[15%]',
                'top-[68%] left-[74%] w-[18%] h-[18%]',
                'top-[20%] right-[10%] w-[10%] h-[25%]',
              ].map((position, index) => (
                <motion.span
                  key={position}
                  className={cn('bg-muted-foreground/25 absolute rounded-sm', position)}
                  initial={{ opacity: reduced ? 1 : 0, scale: reduced ? 1 : 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: reduced ? 0 : 0.35, delay: reduced ? 0 : 0.45 + index * 0.07 }}
                />
              ))}

              {/* The pin, in the site's own accent rather than a fixed green. */}
              <motion.span
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                initial={{ scale: reduced ? 1 : 0, y: reduced ? 0 : -16 }}
                animate={{ scale: 1, y: 0 }}
                transition={
                  reduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 20, delay: 0.25 }
                }
              >
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                    className="fill-primary"
                  />
                  <circle cx="12" cy="9" r="2.5" className="fill-card" />
                </svg>
              </motion.span>

              <div className="from-card absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-70" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 flex h-full flex-col justify-between p-6">
          <div className="flex items-start justify-between gap-3">
            <Map className="text-primary size-6" aria-hidden="true" />
            <span className="border-border bg-background/60 text-muted-foreground rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase backdrop-blur-sm">
              {openLabel}
            </span>
          </div>

          <div className="space-y-1">
            <motion.h3
              className="text-foreground text-lg font-semibold tracking-tight"
              animate={{ x: hovered && !reduced ? 3 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {location}
            </motion.h3>

            <AnimatePresence>
              {isOpen && detail && (
                <motion.p
                  className="text-muted-foreground text-sm"
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  transition={{ duration: reduced ? 0 : 0.25 }}
                >
                  {detail}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.span
              aria-hidden="true"
              className="from-primary/60 via-primary/25 block h-px bg-gradient-to-r to-transparent"
              initial={{ scaleX: 0.3, originX: 0 }}
              animate={{ scaleX: hovered || isOpen ? 1 : 0.3 }}
              transition={{ duration: reduced ? 0 : 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        <ArrowUpRight
          className="text-muted-foreground group-hover:text-primary absolute end-4 bottom-4 size-4 transition-colors rtl:-scale-x-100"
          aria-hidden="true"
        />
      </motion.div>
    </motion.a>
  );
}

export default LocationMap;
