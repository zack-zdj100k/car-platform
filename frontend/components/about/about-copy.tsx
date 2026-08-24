'use client';

import Link from 'next/link';
import {
  ArrowRight,
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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Section, SectionHeading } from '@/components/shared/section';
import { Reveal } from '@/components/shared/reveal';
import { ElegantDarkPattern } from '@/components/ui/elegant-dark-pattern';
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
}: {
  stats: MarketingStat[];
  whoWeAre: string;
  mission: string;
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
      {/* Hero (spec §28) */}
      <section className="relative isolate flex min-h-[60svh] items-center overflow-hidden">
        <ElegantDarkPattern variant="hero" />
        <div className="relative mx-auto w-full max-w-7xl px-5 py-24 sm:px-8">
          <div className="max-w-3xl">
            <h1 className="rise text-hero-foreground text-4xl font-semibold sm:text-5xl lg:text-6xl">
              {t.about.heroTitle}
            </h1>
            <p
              className="rise text-hero-foreground/75 mt-6 max-w-2xl text-base/7 sm:text-lg/8"
              style={{ '--rise-delay': '100ms' } as React.CSSProperties}
            >
              {t.about.heroSubtitle}
            </p>
            <div className="rise mt-9" style={{ '--rise-delay': '200ms' } as React.CSSProperties}>
              <Button asChild size="lg" className="group h-12 px-7">
                <Link href="/cars">
                  {t.about.heroCta}
                  <ArrowRight
                    className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5 rtl:rotate-180"
                    aria-hidden="true"
                  />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

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

      {/* Mission (spec §30) */}
      <Section id="mission" tone="muted">
        <SectionHeading eyebrow={t.about.missionTitle} title={mission} align="center" />
        <ol className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {missionSteps.map((step, index) => (
            <Reveal key={step.label} delay={index * 0.07}>
              <li className="border-border bg-card flex flex-col items-center gap-3 rounded-xl border p-6 text-center shadow-[var(--shadow-card)]">
                <span className="bg-primary/10 text-primary grid size-11 place-items-center rounded-full">
                  <step.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="font-display font-semibold">{step.label}</span>
              </li>
            </Reveal>
          ))}
        </ol>
      </Section>

      {/* What makes us different (spec §31) */}
      <Section id="different">
        <SectionHeading eyebrow={t.about.differentTitle} title={t.about.differentTitle} align="center" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {differentiators.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.06}>
              <Card className="h-full">
                <CardContent className="flex flex-col gap-3 pt-1">
                  <span className="bg-primary/10 text-primary grid size-10 place-items-center rounded-lg">
                    <item.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="font-display text-base font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground text-sm/6">{item.body}</p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Values (spec §32) */}
      <Section id="values" tone="dark">
        <ElegantDarkPattern variant="section" gridSize={68} vignette={false} />
        <div className="relative">
          <h2 className="text-center text-3xl font-semibold sm:text-4xl">{t.about.valuesTitle}</h2>
          <ul className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {values.map((value, index) => (
              <Reveal key={value.label} delay={index * 0.06}>
                <li className="flex flex-col items-center gap-3 text-center">
                  <span className="grid size-12 place-items-center rounded-full bg-white/8 ring-1 ring-inset ring-white/12">
                    <value.icon className="text-primary size-5" aria-hidden="true" />
                  </span>
                  <span className="font-display font-semibold">{value.label}</span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </Section>

      {/* Statistics (spec §33) — configurable marketing content, not analytics */}
      {stats.length > 0 && (
        <Section tone="muted" className="py-14 sm:py-16">
          <dl className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <Reveal key={stat.caption} delay={index * 0.06}>
                <div className="text-center">
                  <dd className="font-display text-3xl font-semibold sm:text-4xl">{stat.label}</dd>
                  <dt className="text-muted-foreground mt-2 text-xs font-medium tracking-widest uppercase">
                    {stat.caption}
                  </dt>
                </div>
              </Reveal>
            ))}
          </dl>
          <p className="text-muted-foreground mt-8 text-center text-[11px]">{t.admin.marketingCopy}</p>
        </Section>
      )}

      {/* Final CTA (spec §35) */}
      <Section>
        <div className="border-border bg-card relative overflow-hidden rounded-2xl border px-6 py-14 text-center shadow-[var(--shadow-card)] sm:px-12">
          <h2 className="text-3xl font-semibold sm:text-4xl">{t.about.finalCtaTitle}</h2>
          <div className="mt-8">
            <Button asChild size="lg" className="group h-12 px-7">
              <Link href="/cars">
                {t.about.finalCtaButton}
                <ArrowRight
                  className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5 rtl:rotate-180"
                  aria-hidden="true"
                />
              </Link>
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
