'use client';

import { useRef } from 'react';
import Link from 'next/link';
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from 'motion/react';
import { ArrowRight, ImagePlus, Zap, type LucideIcon } from 'lucide-react';
import { MediaImage } from '@/components/shared/media-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * About page composition: two columns of points around a portrait, counters,
 * and a closing call to action.
 *
 * Departures from the reference implementation, all deliberate:
 *
 *   1. `motion/react` rather than `framer-motion` — the same library under its
 *      current name, and the one this project already depends on.
 *
 *   2. Content is passed in. The reference hard-codes an interior-design studio
 *      — its own headings, six service blurbs and invented statistics. Here
 *      every string comes from the site's translations or from the settings an
 *      administrator edits, because the specification forbids inventing facts
 *      about the people behind the platform.
 *
 *   3. Theme tokens instead of the reference's fixed beige and navy, so the
 *      page follows the rest of the site into dark mode.
 *
 *   4. Entrances play once. The reference re-runs them whenever the section
 *      leaves and re-enters the viewport, which makes scrolling back up feel
 *      like the page is rebuilding itself. The counters likewise count once
 *      rather than resetting to zero each time.
 *
 *   5. Everything that moves is gated on `prefers-reduced-motion`: the parallax
 *      offsets, the floating accents and the counters all hold still.
 */

export interface AboutPoint {
  icon: LucideIcon;
  title: string;
  body: string;
}

export interface AboutStat {
  icon: LucideIcon;
  value: string;
  label: string;
}

export interface AboutUsSectionProps {
  eyebrow: string;
  title: string;
  intro: string;
  points: AboutPoint[];
  /** Upload id or path for the portrait; empty renders the placeholder. */
  portrait?: string;
  portraitLabel: string;
  portraitEmpty: string;
  portraitAlt: string;
  stats: AboutStat[];
  /** Says plainly that the figures are editable copy, not measured analytics. */
  statsNote?: string;
  valuesTitle?: string;
  values?: string[];
  ctaTitle: string;
  ctaBody: string;
  ctaLabel: string;
  ctaHref: string;
  className?: string;
}

export function AboutUsSection({
  eyebrow,
  title,
  intro,
  points,
  portrait,
  portraitLabel,
  portraitEmpty,
  portraitAlt,
  stats,
  statsNote,
  valuesTitle,
  values,
  ctaTitle,
  ctaBody,
  ctaLabel,
  ctaHref,
  className,
}: AboutUsSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const driftUp = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [0, -50]);
  const driftDown = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [0, 50]);

  const half = Math.ceil(points.length / 2);
  const columns = [points.slice(0, half), points.slice(half)];

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  };
  const item: Variants = reduced
    ? { hidden: {}, visible: {} }
    : {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
      };

  return (
    <section
      ref={sectionRef}
      className={cn('relative overflow-hidden py-20 sm:py-24 lg:py-28', className)}
    >
      {/* Wash behind the content; decorative, so hidden from assistive tech. */}
      <motion.div
        aria-hidden="true"
        style={{ y: driftUp }}
        className="bg-primary/10 pointer-events-none absolute top-24 -left-16 size-64 rounded-full blur-3xl"
      />
      <motion.div
        aria-hidden="true"
        style={{ y: driftDown }}
        className="bg-brand-accent/10 pointer-events-none absolute right-0 bottom-24 size-80 rounded-full blur-3xl"
      />

      <motion.div
        className="relative mx-auto w-full max-w-6xl px-5 sm:px-8"
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
      >
        <motion.div data-entrance className="flex flex-col items-center text-center" variants={item}>
          <span className="text-primary flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase">
            <Zap className="size-4" aria-hidden="true" />
            {eyebrow}
          </span>
          <h1 className="font-display mt-3 text-4xl font-semibold text-balance sm:text-5xl">{title}</h1>
          <motion.span
            className="bg-primary mt-5 block h-1 rounded-full"
            initial={reduced ? { width: 96 } : { width: 0 }}
            whileInView={{ width: 96 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.25 }}
          />
          <p className="text-muted-foreground mt-6 max-w-2xl text-base/7">{intro}</p>
        </motion.div>

        <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
          <ul className="space-y-12 md:space-y-14">
            {columns[0].map((point) => (
              <PointItem key={point.title} point={point} from="start" variants={item} reduced={reduced} />
            ))}
          </ul>

          {/* The portrait. */}
          <motion.div data-entrance className="order-first flex justify-center md:order-none" variants={item}>
            <figure className="relative w-full max-w-xs">
              <figcaption className="text-primary mb-3 text-center text-xs font-semibold tracking-[0.18em] uppercase">
                {portraitLabel}
              </figcaption>

              <div className="ring-primary/25 relative aspect-4/5 overflow-hidden rounded-2xl shadow-[var(--shadow-lifted)] ring-1">
                {portrait ? (
                  <MediaImage
                    src={portrait}
                    alt={portraitAlt}
                    fill
                    sizes="(min-width: 48rem) 20rem, 80vw"
                    className="object-cover"
                  />
                ) : (
                  /* No photograph supplied yet — say so rather than invent one. */
                  <div className="bg-secondary text-muted-foreground flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                    <ImagePlus className="size-8" aria-hidden="true" />
                    <p className="text-xs/5">{portraitEmpty}</p>
                  </div>
                )}
              </div>

              <span
                aria-hidden="true"
                className="border-primary/30 pointer-events-none absolute -inset-3 top-6 -z-10 rounded-2xl border-2"
              />
            </figure>
          </motion.div>

          <ul className="space-y-12 md:space-y-14">
            {columns[1].map((point) => (
              <PointItem key={point.title} point={point} from="end" variants={item} reduced={reduced} />
            ))}
          </ul>
        </div>

        {/* Counters. */}
        <div className="mt-20 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCounter key={stat.label} stat={stat} reduced={reduced} />
          ))}
        </div>

        {statsNote && (
          <p className="text-muted-foreground mt-6 text-center text-[11px]">{statsNote}</p>
        )}

        {/* Values. */}
        {valuesTitle && values && values.length > 0 && (
          <div className="mt-20 text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl">{valuesTitle}</h2>
            <ul className="mt-6 flex flex-wrap justify-center gap-2.5">
              {values.map((value) => (
                <li key={value}>
                  <Badge variant="secondary" className="px-3 py-1 text-sm">
                    {value}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Closing call to action. */}
        <motion.div
          data-entrance
          className="bg-surface-dark text-surface-dark-foreground mt-20 flex flex-col items-center justify-between gap-6 rounded-2xl p-8 md:flex-row"
          initial={reduced ? undefined : { opacity: 0, y: 24 }}
          whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center md:text-start">
            <h2 className="text-2xl font-semibold">{ctaTitle}</h2>
            <p className="mt-1 opacity-80">{ctaBody}</p>
          </div>
          <Button asChild size="lg" className="group">
            <Link href={ctaHref}>
              {ctaLabel}
              <ArrowRight
                className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5 rtl:rotate-180"
                aria-hidden="true"
              />
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}

function PointItem({
  point,
  from,
  variants,
  reduced,
}: {
  point: AboutPoint;
  from: 'start' | 'end';
  variants: Variants;
  reduced: boolean | null;
}) {
  const Icon = point.icon;

  return (
    <motion.li
      data-entrance
      className="group"
      variants={variants}
      whileHover={reduced ? undefined : { y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={cn(
          'flex items-center gap-3',
          // Mirrors with the writing direction, so the row still reads inward
          // from the portrait in Arabic.
          from === 'end' && 'md:flex-row-reverse md:text-end',
        )}
      >
        <span className="bg-primary/10 text-primary grid size-11 shrink-0 place-items-center rounded-xl transition-colors duration-300 group-hover:bg-primary/20">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <h2 className="group-hover:text-primary text-lg font-semibold transition-colors duration-300">
          {point.title}
        </h2>
      </div>
      <p className={cn('text-muted-foreground mt-2 text-sm/6', from === 'end' && 'md:text-end')}>
        {point.body}
      </p>
    </motion.li>
  );
}

/** Splits "500+" into the number to count and whatever surrounds it. */
function splitStat(value: string): { prefix: string; number: number; suffix: string } {
  const match = /^(\D*)([\d.]+)(.*)$/.exec(value);
  if (!match) return { prefix: value, number: 0, suffix: '' };
  return { prefix: match[1], number: Number(match[2]), suffix: match[3] };
}

function StatCounter({ stat, reduced }: { stat: AboutStat; reduced: boolean | null }) {
  const ref = useRef<HTMLDivElement>(null);
  // Once: a counter that resets every time the section scrolls back into view
  // reads as a glitch rather than as an effect.
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const { prefix, number, suffix } = splitStat(stat.value);

  const spring = useSpring(0, { stiffness: 60, damping: 15 });
  const rounded = useTransform(spring, (latest) => Math.floor(latest).toLocaleString());

  if (inView && !reduced) spring.set(number);

  const Icon = stat.icon;

  return (
    <motion.div
      ref={ref}
      className="border-border/70 bg-card/60 group flex flex-col items-center rounded-2xl border p-6 text-center backdrop-blur-sm transition-colors duration-300 hover:bg-card"
      whileHover={reduced ? undefined : { y: -4 }}
    >
      <span className="bg-primary/10 text-primary mb-4 grid size-12 place-items-center rounded-full">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="text-3xl font-semibold">
        {reduced ? (
          stat.value
        ) : (
          <>
            {prefix}
            <motion.span>{rounded}</motion.span>
            {suffix}
          </>
        )}
      </p>
      <p className="text-muted-foreground mt-1 text-sm">{stat.label}</p>
      <span className="bg-primary mt-3 block h-0.5 w-10 rounded-full transition-all duration-300 group-hover:w-16" />
    </motion.div>
  );
}

export default AboutUsSection;
