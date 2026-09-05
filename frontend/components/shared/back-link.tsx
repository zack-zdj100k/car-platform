'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { navigationDepth } from '@/components/shared/navigation-depth';

/**
 * "Back" that goes back.
 *
 * Every one of these used to be a link to a fixed address — the catalogue, from
 * a vehicle's page. Reasonable from the catalogue, wrong from anywhere else: a
 * customer who opened a car from their appointments, their favourites or the
 * home page pressed Back and landed somewhere they had never been, with their
 * place in the list lost.
 *
 * So it uses the browser's own history when there is history to use, and falls
 * back to the fixed address when there is not — arriving from a search engine,
 * a shared link, or a new tab. `document.referrer` is what distinguishes the
 * two: a page opened directly has none.
 *
 * It stays an anchor rather than becoming a button. Middle-click, ⌘-click and
 * "open in new tab" all keep working, and a reader who does that gets the
 * sensible destination rather than nothing at all.
 */
export function BackLink({
  href,
  label,
  className,
}: {
  /** Where to go when there is no history to go back to. */
  href: string;
  label: string;
  className?: string;
}) {
  const router = useRouter();

  /*
   * Whether there is a page of ours to go back to.
   *
   * Counted rather than read from `document.referrer`: that is set when the
   * document loads and never again, so every navigation the router handles
   * without a page load leaves it pointing at wherever the tab started — a
   * reader who opened this vehicle from their favourites still had a referrer
   * naming a page from ten minutes earlier, and "back" sent them to the
   * catalogue instead.
   */

  return (
    <Button asChild variant="ghost" size="sm" className={className}>
      <Link
        href={href}
        onClick={(event) => {
          // Modified clicks belong to the browser: a new tab has no history to
          // go back through, and should land on the fallback.
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
          if (navigationDepth() === 0) return;
          event.preventDefault();
          router.back();
        }}
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {label}
      </Link>
    </Button>
  );
}
