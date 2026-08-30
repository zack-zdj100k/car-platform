import type { CSSProperties } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * The ZODIC mark.
 *
 * Two files, one per background, chosen by CSS rather than by JavaScript: the
 * graphite mark on light surfaces and the platinum one on dark. Choosing in
 * JavaScript would mean the wrong mark is painted first and swapped after
 * hydration — a visible flicker on the one thing every page opens with, which is
 * exactly the fault the hero video had.
 *
 * A background image on a hidden element is not fetched, so nobody downloads the
 * variant they cannot see.
 *
 * The artwork is the supplied SVG, unaltered: it is drawn, not typed, so it
 * needs no font and stays sharp at any size.
 */

const RATIO = 753.14 / 196;
const SYMBOL_RATIO = 1;

export function BrandLogo({
  /** Height in pixels; the width follows the artwork's proportions. */
  height = 28,
  /** The crest alone, for tight spaces. */
  symbolOnly = false,
  /** A slow shine across the mark, for places worth drawing the eye to. */
  animated = false,
  className,
}: {
  height?: number;
  symbolOnly?: boolean;
  animated?: boolean;
  className?: string;
}) {
  const ratio = symbolOnly ? SYMBOL_RATIO : RATIO;
  const width = Math.round(height * ratio);
  const kind = symbolOnly ? 'symbol' : 'horizontal';

  return (
    <span
      className={cn('relative inline-block align-middle', animated && 'brand-shine', className)}
      style={
        {
          width,
          height,
          // The shine is clipped to the artwork. Both variants are the same
          // shapes in different colours, so one file masks either of them.
          ...(animated ? { '--brand-mask': `url(/brand/zodic-${kind}-light.svg)` } : null),
        } as CSSProperties
      }
    >
      <Image
        src={`/brand/zodic-${kind}-light.svg`}
        alt="ZODIC"
        width={width}
        height={height}
        priority
        className="block h-full w-full object-contain dark:hidden"
      />
      <Image
        src={`/brand/zodic-${kind}-dark.svg`}
        alt=""
        aria-hidden="true"
        width={width}
        height={height}
        priority
        className="hidden h-full w-full object-contain dark:block"
      />
    </span>
  );
}

export default BrandLogo;
