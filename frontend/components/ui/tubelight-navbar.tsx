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
}

export function NavBar({
  items,
  className,
  activeName,
  variant = 'floating',
  layoutGroup = 'tubelight',
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
          ? // The reference moves this bar to the top of the window from 640px
            // up. On a page that already has a header that puts it straight
            // through the logo and the account controls — the language button
            // ended up underneath it. It stays where a thumb reaches instead.
            'fixed bottom-0 left-1/2 z-50 mb-6 -translate-x-1/2'
          : 'relative',
        className,
      )}
    >
      <nav
        aria-label="Primary"
        className={cn(
          'border-border flex items-center gap-1 rounded-full border p-1 backdrop-blur-lg sm:gap-3',
          variant === 'floating'
            ? // Nearly transparent (5%) over the hero it looked deliberate; over
              // a page of cards and text it simply disappeared, and this is the
              // only navigation there is on a phone or a tablet. It carries a
              // real surface so it stays legible against whatever scrolls past.
              'bg-background/90 shadow-xl'
            : 'bg-background/5 shadow-lg',
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
                'relative cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:px-6',
                'text-foreground/80 hover:text-primary',
                isActive && 'bg-muted text-primary',
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
                  className="bg-primary/5 absolute inset-0 -z-10 w-full rounded-full"
                  initial={false}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 300, damping: 30 }
                  }
                >
                  {/* The lamp: a bar above the pill, with its glow beneath. */}
                  <div className="bg-primary absolute -top-2 left-1/2 h-1 w-8 -translate-x-1/2 rounded-t-full">
                    <div className="bg-primary/20 absolute -top-2 -left-2 h-6 w-12 rounded-full blur-md" />
                    <div className="bg-primary/20 absolute -top-1 h-6 w-8 rounded-full blur-md" />
                    <div className="bg-primary/20 absolute top-0 left-2 h-4 w-4 rounded-full blur-sm" />
                  </div>
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
