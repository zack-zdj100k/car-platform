'use client';

import {
  Compass,
  Eye,
  GitCompare,
  Heart,
  Lightbulb,
  ListChecks,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Section, SectionHeading } from '@/components/shared/section';
import { Reveal } from '@/components/shared/reveal';
import { AboutStats, AboutUsSection } from '@/components/ui/about-us-section';
import { useLocale } from '@/providers/locale-provider';
import type { MarketingStat } from '@/types/api';

/**
 * About page content (spec §28–§35).
 *
 * "Who we are" and the mission statement come from editable settings, and the
 * team section is intentionally omitted until real people are supplied — spec
 * §29 and §34 forbid inventing facts about the owners.
 */
export function AboutCopy({
  stats,
  whoWeAre,
  mission,
  portrait,
}: {
  stats: MarketingStat[];
  whoWeAre: string;
  mission: string;
  /** Photograph uploaded in Administration › Settings › about images. */
  portrait?: string;
}) {
  const { t } = useLocale();

  const missionSteps = [
    { icon: Compass, label: t.about.missionDiscover },
    { icon: GitCompare, label: t.about.missionCompare },
    { icon: Eye, label: t.about.missionExplore },
    { icon: MousePointerClick, label: t.about.missionChoose },
  ];

  const differentiators = [
    { icon: ListChecks, title: t.about.curatedTitle, body: t.about.curatedBody },
    { icon: Sparkles, title: t.about.modernTitle, body: t.about.modernBody },
    { icon: ShieldCheck, title: t.about.detailedTitle, body: t.about.detailedBody },
    { icon: UserRound, title: t.about.builtTitle, body: t.about.builtBody },
  ];

  const values = [
    { icon: ShieldCheck, label: t.about.valueQuality },
    { icon: Lightbulb, label: t.about.valueInnovation },
    { icon: Eye, label: t.about.valueTransparency },
    { icon: Heart, label: t.about.valuePassion },
  ];

  return (
    <>
      <AboutUsSection
        eyebrow={t.about.storyEyebrow}
        title={t.about.heroTitle}
        intro={t.about.heroSubtitle}
        points={differentiators}
        portrait={portrait}
        portraitLabel={t.about.portraitLabel}
        portraitAlt={t.about.portraitAlt}
        portraitEmpty={t.about.portraitEmpty}
        valuesTitle={t.about.valuesTitle}
        values={values.map((value) => value.label)}
        ctaTitle={t.about.finalCtaTitle}
        ctaBody={t.about.missionStatement}
        ctaLabel={t.about.finalCtaButton}
        ctaHref="/cars"
      >
        {/*
          Mission (spec §30), in the place the figures used to hold. What the
          platform is for reads better beside the story than a row of numbers
          does; the numbers now close the page.
        */}
        <div id="mission">
          <SectionHeading eyebrow={t.about.missionTitle} title={mission} align="center" />
          <ol className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {missionSteps.map((step, index) => (
              <li key={step.label}>
                <Reveal
                  delay={index * 0.07}
                  className="border-border bg-card flex h-full flex-col items-center gap-3 rounded-xl border p-6 text-center shadow-[var(--shadow-card)]"
                >
                  <span className="bg-primary/10 text-primary grid size-11 place-items-center rounded-full">
                    <step.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="font-display font-semibold">{step.label}</span>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </AboutUsSection>

      {/* Who we are (spec §29) */}
      <Section id="who-we-are">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <SectionHeading eyebrow={t.about.whoTitle} title={t.about.whoTitle} />
          <div className="text-muted-foreground space-y-4 text-base/7">
            <p className="whitespace-pre-line">{whoWeAre}</p>
            <p>{t.home.featuresBody}</p>
          </div>
        </div>
      </Section>

      {/* Statistics (spec §33) — configurable marketing content, not analytics */}
      {stats.length > 0 && (
        <Section tone="muted">
          <AboutStats
            stats={stats.map((stat, index) => ({
              icon: values[index % values.length].icon,
              value: stat.label,
              label: stat.caption,
            }))}
            note={t.admin.marketingCopy}
          />
        </Section>
      )}

    </>
  );
}
