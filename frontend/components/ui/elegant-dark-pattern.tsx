'use client';

import { cn } from '@/lib/utils';

/**
 * Elegant dark pattern — spec §61.
 *
 * A layered dark backdrop for premium sections: a deep gradient base, a soft
 * radial glow in the brand green, and a fine grid that fades out towards the
 * edges. Purely decorative, so it is hidden from assistive technology and it
 * animates nothing that `prefers-reduced-motion` would object to.
 *
 * NOTE: the specification refers to this file as a provided component. None was
 * supplied, so it is authored here in the project's own design language — see
 * docs/DECISIONS.md D-2.2. Replacing it is a single-file overwrite: keep the
 * `ElegantDarkPattern` export and the props below.
 */
export interface ElegantDarkPatternProps {
  className?: string;
  /** `hero` leans green and cinematic; `section` is a quieter neutral dark. */
  variant?: 'hero' | 'section';
  /** Grid density in pixels. Larger reads calmer. */
  gridSize?: number;
  /** Adds a vignette so foreground text keeps its contrast. */
  vignette?: boolean;
}

export function ElegantDarkPattern({
  className,
  variant = 'hero',
  gridSize = 56,
  vignette = true,
}: ElegantDarkPatternProps) {
  const isHero = variant === 'hero';

  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {/* Base gradient */}
      <div
        className={cn('absolute inset-0', isHero ? 'hero-environment' : 'bg-surface-dark')}
      />

      {/* Radial brand glow, offset so it never sits behind the headline */}
      <div
        className="absolute -top-1/3 start-[-10%] size-[70%] rounded-full opacity-[0.28] blur-3xl"
        style={{
          background: 'radial-gradient(circle at center, var(--primary) 0%, transparent 68%)',
        }}
      />
      <div
        className="absolute bottom-[-25%] end-[-15%] size-[55%] rounded-full opacity-[0.16] blur-3xl"
        style={{
          background: 'radial-gradient(circle at center, var(--brand-accent) 0%, transparent 70%)',
        }}
      />

      {/* Fine grid, faded towards the edges */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, color-mix(in oklab, white 45%, transparent) 1px, transparent 1px),' +
            'linear-gradient(to bottom, color-mix(in oklab, white 45%, transparent) 1px, transparent 1px)',
          backgroundSize: `${gridSize}px ${gridSize}px`,
          maskImage: 'radial-gradient(ellipse 75% 65% at 50% 45%, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 65% at 50% 45%, black 40%, transparent 100%)',
        }}
      />

      {/* A single sweeping highlight suggesting a body panel reflection */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, color-mix(in oklab, white 30%, transparent) 50%, transparent 100%)',
        }}
      />

      {vignette && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 100% 80% at 50% 30%, transparent 40%, color-mix(in oklab, black 55%, transparent) 100%)',
          }}
        />
      )}
    </div>
  );
}

export default ElegantDarkPattern;
