'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Tubelight navigation.
 *
 * A pill of links with a lamp that slides to whatever is active, glowing above
 * it. Labels on desktop, icons on smaller screens.
 *
 * Two departures from the reference implementation, both deliberate:
 *
 *   1. `motion/react` rather than `framer-motion`. They are the same library —
 *      motion is framer-motion's successor and ships the identical `layoutId`
 *      API — and `motion` is what this project actually declares. Importing
 *      framer-motion directly would depend on a transitive package.
 *
 *   2. The active item is derived from the current route, not from click state.
 *      Tracking clicks means arriving on a page by any other route — a typed
 *      URL, a link from elsewhere, the back button — leaves the lamp on the
 *      wrong item. `activeName` can still override it where the caller knows
 *      better.
 *
 *   3. The lamp is optional. It hangs above the pill, which only works where
 *      there is empty space above — the floating bar has it, a 64px header does
 *      not: there the bar lands on the header's own top edge and reads as a
 *      stray stripe. `indicator="pill"` marks the active item with a solid
 *      surface instead, and keeps the same sliding movement.
 */

export interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

export interface NavBarProps {
  items: NavItem[];
  className?: string;
  /** Overrides route-derived matching, for cases the caller knows better. */
  activeName?: string;
  /**
   * `floating` reproduces the reference layout: fixed to the bottom on small
   * screens and the top on larger ones. `inline` sits wherever it is placed,
   * which is what an existing header needs.
   */
  variant?: 'floating' | 'inline';
  /** Distinguishes the shared layout animation when more than one is mounted. */
  layoutGroup?: string;
  /**
   * `lamp` is the reference treatment: a glowing bar above the active item,
   * which needs clear space above the pill. `pill` marks the active item with
   * a solid surface and no overhang, for tight rows like a header.
   */
  indicator?: 'lamp' | 'pill';
}

export function NavBar({
  items,
  className,
  activeName,
  variant = 'floating',
  layoutGroup = 'tubelight',
  indicator = 'lamp',
}: NavBarProps) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  // An empty list would make the reference version throw on items[0].name.
  if (items.length === 0) return null;

  /** Longest matching url wins, so "/cars" does not also light up "/". */
  const activeFromRoute = items.reduce<NavItem | null>((best, item) => {
    const matches = item.url === '/' ? pathname === '/' : pathname.startsWith(item.url);
    if (!matches) return best;
    return !best || item.url.length > best.url.length ? item : best;
  }, null);

  const active = activeName ?? activeFromRoute?.name ?? null;

  return (
    <div
      className={cn(
        variant === 'floating'
          ? 'fixed bottom-0 left-1/2 z-50 mb-6 -translate-x-1/2 sm:top-0 sm:mb-0 sm:pt-6'
          : 'relative',
        className,
      )}
    >
      <nav
        aria-label="Primary"
        className={cn(
          'flex items-center rounded-full border p-1 backdrop-blur-lg',
          indicator === 'lamp'
            ? 'border-border bg-background/5 gap-1 shadow-lg sm:gap-3'
            : // A header row is already a surface: a heavy shadow and a wide
              // gap only make the pill fight the rest of it.
              'border-border/70 bg-background/40 gap-0.5 shadow-xs',
        )}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.name;

          return (
            <Link
              key={item.name}
              href={item.url}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative cursor-pointer rounded-full text-sm font-semibold transition-colors',
                indicator === 'lamp' ? 'px-4 py-2 sm:px-6' : 'px-4 py-1.5',
                // Violet on the translucent header failed to read as a link at
                // a glance, so the label carries full text colour and the
                // surface behind it does the marking.
                isActive ? 'text-foreground' : 'text-foreground/70 hover:text-foreground',
              )}
            >
              <span className="hidden md:inline">{item.name}</span>
              <span className="md:hidden">
                <Icon size={18} strokeWidth={2.5} aria-hidden="true" />
                {/* The icon alone carries no name, so give the link one. */}
                <span className="sr-only">{item.name}</span>
              </span>

              {isActive && (
                <motion.div
                  layoutId={`${layoutGroup}-lamp`}
                  className={cn(
                    'absolute inset-0 -z-10 w-full rounded-full',
                    indicator === 'lamp'
                      ? 'bg-primary/5'
                      : 'bg-secondary ring-border/60 ring-1 ring-inset',
                  )}
                  initial={false}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 300, damping: 30 }
                  }
                >
                  {indicator === 'lamp' && (
                    /* The lamp: a bar above the pill, with its glow beneath. */
                    <div className="bg-primary absolute -top-2 left-1/2 h-1 w-8 -translate-x-1/2 rounded-t-full">
                      <div className="bg-primary/20 absolute -top-2 -left-2 h-6 w-12 rounded-full blur-md" />
                      <div className="bg-primary/20 absolute -top-1 h-6 w-8 rounded-full blur-md" />
                      <div className="bg-primary/20 absolute top-0 left-2 h-4 w-4 rounded-full blur-sm" />
                    </div>
                  )}
                </motion.div>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default NavBar;
