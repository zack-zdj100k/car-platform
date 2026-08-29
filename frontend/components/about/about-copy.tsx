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
import { AboutStats, AboutUsSection } from '@/components/ui/about-us-section';
import { MissionSteps } from '@/components/about/mission-steps';
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

  /*
   * A story that is still the shipped placeholder counts as no story. The
   * marker is deliberate and easy to search for; anything an administrator
   * actually writes will not contain it.
   */
  const story = whoWeAre.includes('PLACEHOLDER') ? '' : whoWeAre.trim();

  /*
   * Quality · Innovation · Transparency · Passion is what every company in the
   * world writes, and it proves nothing. These four are claims a visitor can
   * check on the site in the next thirty seconds.
   */
  const values = [
    { icon: ShieldCheck, label: t.about.valueSpecifications },
    { icon: Eye, label: t.about.valueColours },
    { icon: Lightbulb, label: t.about.valueCompare },
    { icon: Heart, label: t.about.valuePrices },
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
        valuesTitle={t.about.valuesTitle}
        values={values.map((value) => value.label)}
        ctaTitle={t.about.finalCtaTitle}
        ctaBody={t.about.finalCtaBody}
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
          <MissionSteps steps={missionSteps} className="mt-12" />
        </div>
      </AboutUsSection>

      {/*
        Who we are (spec §29) — shown only when there is a story to tell.

        The setting shipped with the words "PLACEHOLDER — supply the real
        founding story" in it, and that is what customers read on the page. A
        section that is missing says nothing; a section that says PLACEHOLDER
        says the site is unfinished. Until the real text is written in
        Administration › Settings › about.whoWeAre, this is not rendered.
      */}
      {story && (
        <Section id="who-we-are">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
            <SectionHeading eyebrow={t.about.whoTitle} title={t.about.whoTitle} />
            <div className="text-muted-foreground space-y-4 text-base/7">
              <p className="whitespace-pre-line">{story}</p>
              <p>{t.home.featuresBody}</p>
            </div>
          </div>
        </Section>
      )}

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
