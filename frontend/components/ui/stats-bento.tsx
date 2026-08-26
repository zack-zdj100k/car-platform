'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Car, Clock, Factory, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketingStat } from '@/types/api';

/**
 * Statistics as a bento grid (spec §33).
 *
 * These are the four editable marketing figures, not live analytics — the
 * caption at the foot says so plainly, because §45 and §68 forbid presenting
 * invented numbers as measured ones. Real aggregates live in the admin
 * dashboard.
 *
 * The leading number counts up when the section first comes into view, which is
 * skipped entirely under `prefers-reduced-motion` so the final value is simply
 * present.
 */

const ICONS = [Car, Factory, Users, Clock] as const;

/** Splits "500+" into 500 and "+" so the digits can animate and the suffix cannot. */
function splitStat(label: string): { value: number | null; prefix: string; suffix: string } {
  const match = /^(\D*)([\d.]+)(.*)$/.exec(label.trim());
  if (!match) return { value: null, prefix: '', suffix: label };

  const [, prefix, digits, suffix] = match;
  const value = Number(digits);
  return Number.isFinite(value) ? { value, prefix, suffix } : { value: null, prefix: '', suffix: label };
}

function CountUp({ label, className }: { label: string; className?: string }) {
  const { value, prefix, suffix } = splitStat(label);
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState<number | null>(value === null || reduced ? value : 0);

  useEffect(() => {
    if (value === null || reduced) return;

    const element = ref.current;
    if (!element) return;

    let frame = 0;
    let start: number | null = null;
    const duration = 1100;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();

        const step = (now: number) => {
          start ??= now;
          const progress = Math.min((now - start) / duration, 1);
          // Ease out, so it decelerates into the final figure.
          const eased = 1 - Math.pow(1 - progress, 3);
          setShown(Number((value * eased).toFixed(value % 1 === 0 ? 0 : 1)));
          if (progress < 1) frame = requestAnimationFrame(step);
        };

        frame = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, reduced]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {shown === null ? '' : shown.toLocaleString()}
      {suffix}
    </span>
  );
}

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StatsBento({ stats, note }: { stats: MarketingStat[]; note: string }) {
  if (stats.length === 0) return null;

  const [primary, ...rest] = stats;
  const PrimaryIcon = ICONS[0];

  return (
    <section className="bg-background flex flex-col justify-center py-16 sm:py-20">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-5 sm:px-8 md:grid-cols-6 md:grid-rows-2">
        {/* Primary figure */}
        <Reveal className="md:col-span-3 md:row-span-2">
          <div className="bg-primary relative flex h-full flex-col justify-between overflow-hidden rounded-3xl p-8 sm:p-10">
            {/* Fine diagonal hatching, faded away from the corner. */}
            <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(45deg,#808080_0px_1px,transparent_1px_10px)] opacity-30 mask-[radial-gradient(ellipse_80%_50%_at_100%_0%,#000_70%,transparent_110%)]" />

            <div className="relative">
              <span className="text-primary-foreground/70 bg-primary-foreground/10 mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold tracking-widest uppercase">
                <PrimaryIcon className="size-3" aria-hidden="true" />
                {primary.caption}
              </span>
              <CountUp
                label={primary.label}
                className="text-primary-foreground font-display block text-6xl tracking-tighter sm:text-7xl"
              />
            </div>

            <p className="text-primary-foreground/70 relative mt-8 max-w-xs text-sm">{note}</p>
          </div>
        </Reveal>

        {/* The remaining three, each with its own icon */}
        {rest.map((stat, index) => {
          const Icon = ICONS[index + 1] ?? Car;
          const span = index === 0 ? 'md:col-span-3' : index === 1 ? 'md:col-span-1' : 'md:col-span-2';

          return (
            <Reveal key={stat.caption} delay={0.1 + index * 0.1} className={span}>
              <div
                className={cn(
                  'border-border h-full rounded-3xl border p-6 sm:p-8',
                  index === 1 ? 'bg-card flex flex-col justify-center text-center' : 'bg-muted flex items-center gap-4',
                )}
              >
                {index === 1 ? (
                  <>
                    <span className="bg-background text-primary mx-auto mb-3 grid size-10 place-items-center rounded-full shadow-sm">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <CountUp label={stat.label} className="font-display text-foreground text-2xl" />
                    <p className="text-foreground/80 mt-1 text-xs font-semibold tracking-widest uppercase">
                      {stat.caption}
                    </p>
                  </>
                ) : (
                  <>
                    <span className="bg-background text-primary grid size-11 shrink-0 place-items-center rounded-full shadow-sm">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-foreground/80 text-xs font-semibold tracking-widest uppercase">
                        {stat.caption}
                      </p>
                      <CountUp
                        label={stat.label}
                        className="font-display text-foreground mt-1 block text-3xl tracking-tight"
                      />
                    </div>

                    {index === 0 && (
                      /* A small rising bar motif, purely decorative. */
                      <div className="ms-auto hidden h-8 items-end gap-1 sm:flex" aria-hidden="true">
                        {[10, 20, 40, 30, 60, 50, 80, 70, 90, 100, 110].map((height, i) => (
                          <span
                            key={i}
                            className="bg-primary/70 w-1.5 rounded-full"
                            style={{ height: `${height}%` }}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

export default StatsBento;
