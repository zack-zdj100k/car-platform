'use client';

import { Section } from '@/components/shared/section';
import { Reveal } from '@/components/shared/reveal';
import { ElegantDarkPattern } from '@/components/ui/elegant-dark-pattern';
import { useLocale } from '@/providers/locale-provider';
import type { MarketingStat } from '@/types/api';

/**
 * Spec §33 statistics.
 *
 * These are editable marketing content from the settings table, not live
 * analytics — see docs/DECISIONS.md D-2.1. The admin dashboard shows real
 * database aggregates instead.
 */
export function StatsStrip({ stats }: { stats: MarketingStat[] }) {
  const { t } = useLocale();

  if (stats.length === 0) return null;

  return (
    <Section tone="dark" className="py-14 sm:py-16">
      <ElegantDarkPattern variant="section" gridSize={64} vignette={false} />

      <dl className="relative grid grid-cols-2 gap-8 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Reveal key={stat.caption} delay={index * 0.06}>
            <div className="text-center lg:text-start">
              <dt className="text-xs font-medium tracking-widest text-white/50 uppercase">{stat.caption}</dt>
              <dd className="font-display mt-2 text-3xl font-semibold sm:text-4xl">{stat.label}</dd>
            </div>
          </Reveal>
        ))}
      </dl>

      <p className="relative mt-8 text-center text-[11px] text-white/40 lg:text-start">
        {t.admin.marketingCopy}
      </p>
    </Section>
  );
}
