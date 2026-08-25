'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Gauge, Palette, Shield, Sofa, Disc3, CircleDot } from 'lucide-react';
import { MediaImage } from '@/components/shared/media-image';
import { Section, SectionHeading } from '@/components/shared/section';
import { Badge } from '@/components/ui/badge';
import { useLocale } from '@/providers/locale-provider';
import { cn } from '@/lib/utils';

/**
 * Home features, drawn as an annotated car (spec §9).
 *
 * Every specification group the platform documents radiates out from one
 * vehicle: a marker sits on the car, a line runs from it, and the description
 * sits at the far end. Reading it should feel like reading a technical plate
 * rather than a list of cards.
 *
 * The geometry lives in one place — each callout carries the point it attaches
 * to and the side it extends towards — so the diagram is data, not hand-placed
 * markup. On narrow screens the lines are dropped and the same content stacks,
 * because a callout diagram cannot survive a phone width.
 */

interface Callout {
  key: string;
  title: string;
  body: string;
  tags?: string[];
  icon: typeof Shield;
  /** Where the marker sits on the car, in percentages of the frame. */
  point: { x: number; y: number };
  /** Where the label sits. */
  label: { x: number; y: number };
  side: 'left' | 'right';
}

export function CarDiagram({
  slug,
  images,
}: {
  slug: string;
  images: Partial<Record<'safety' | 'engine' | 'wheels' | 'tyres' | 'exterior' | 'interior', string>>;
}) {
  const { t } = useLocale();
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // The lines draw once the diagram is actually on screen.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const callouts: Callout[] = [
    {
      key: 'safety',
      title: t.features.safetyTitle,
      body: t.features.safetyBody,
      icon: Shield,
      point: { x: 30, y: 34 },
      label: { x: 2, y: 8 },
      side: 'left',
    },
    {
      key: 'engine',
      title: t.features.engineTitle,
      body: t.features.engineBody,
      icon: Gauge,
      point: { x: 22, y: 58 },
      label: { x: 2, y: 44 },
      side: 'left',
    },
    {
      key: 'wheels',
      title: t.features.wheelsTitle,
      body: t.features.wheelsBody,
      tags: [t.features.wheelsStandard, t.features.wheelsSport],
      icon: Disc3,
      point: { x: 33, y: 78 },
      label: { x: 2, y: 66 },
      side: 'left',
    },
    {
      key: 'exterior',
      title: t.features.exteriorTitle,
      body: t.features.exteriorBody,
      icon: Palette,
      point: { x: 70, y: 32 },
      label: { x: 74, y: 8 },
      side: 'right',
    },
    {
      key: 'interior',
      title: t.features.interiorTitle,
      body: t.features.interiorBody,
      icon: Sofa,
      point: { x: 58, y: 46 },
      label: { x: 74, y: 44 },
      side: 'right',
    },
    {
      key: 'tyres',
      title: t.features.tyresTitle,
      body: t.features.tyresBody,
      tags: [t.features.tyres14, t.features.tyres16],
      icon: CircleDot,
      point: { x: 74, y: 78 },
      label: { x: 74, y: 66 },
      side: 'right',
    },
  ];

  const carImage = images.exterior || `/images/cars/${slug}/main.svg`;

  return (
    <Section id="features">
      <SectionHeading
        eyebrow={t.home.featuresTitle}
        title={t.home.featuresTitle}
        body={t.home.featuresBody}
        align="center"
      />

      {/* ---------- diagram, from lg up ---------- */}
      <div ref={containerRef} className="relative mx-auto mt-16 hidden max-w-6xl lg:block">
        <div className="relative aspect-16/10 pb-4">
          {/* The vehicle */}
          <div className="absolute inset-x-[24%] inset-y-[16%]">
            <MediaImage
              src={carImage}
              alt=""
              fill
              sizes="50vw"
              className="object-contain drop-shadow-2xl"
            />
          </div>

          {/* Connector lines, drawn beneath the labels */}
          <svg
            className="absolute inset-0 size-full"
            viewBox="0 0 100 62.5"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {callouts.map((callout, index) => {
              const from = { x: callout.point.x, y: callout.point.y * 0.625 };
              const to = {
                x: callout.side === 'left' ? callout.label.x + 20 : callout.label.x,
                y: (callout.label.y + 6) * 0.625,
              };
              // An elbow rather than a straight line: it reads as a drawing.
              const elbowX = callout.side === 'left' ? from.x - 6 : from.x + 6;
              const path = `M ${from.x} ${from.y} L ${elbowX} ${from.y} L ${elbowX} ${to.y} L ${to.x} ${to.y}`;
              const isActive = active === callout.key;

              return (
                <motion.path
                  key={callout.key}
                  d={path}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={isActive ? 0.4 : 0.22}
                  strokeLinecap="round"
                  className={cn(
                    'transition-[stroke-width] duration-300',
                    isActive ? 'text-primary' : 'text-border',
                  )}
                  initial={reduced ? undefined : { pathLength: 0, opacity: 0 }}
                  animate={
                    reduced ? undefined : visible ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }
                  }
                  transition={{ duration: 0.9, delay: 0.15 * index, ease: 'easeInOut' }}
                />
              );
            })}
          </svg>

          {/* Markers on the car */}
          {callouts.map((callout, index) => (
            <motion.span
              key={`${callout.key}-point`}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${callout.point.x}%`, top: `${callout.point.y}%` }}
              initial={reduced ? undefined : { scale: 0, opacity: 0 }}
              animate={reduced ? undefined : visible ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.15 * index + 0.5 }}
            >
              <span
                className={cn(
                  'block size-3 rounded-full ring-4 transition-colors duration-300',
                  active === callout.key ? 'bg-primary ring-primary/25' : 'bg-foreground/70 ring-foreground/10',
                )}
              />
            </motion.span>
          ))}

          {/* Labels */}
          {callouts.map((callout, index) => (
            <motion.div
              key={`${callout.key}-label`}
              className={cn('absolute w-[22%]', callout.side === 'right' && 'text-start')}
              style={{ left: `${callout.label.x}%`, top: `${callout.label.y}%` }}
              onMouseEnter={() => setActive(callout.key)}
              onMouseLeave={() => setActive(null)}
              initial={reduced ? undefined : { opacity: 0, x: callout.side === 'left' ? -14 : 14 }}
              animate={reduced ? undefined : visible ? { opacity: 1, x: 0 } : { opacity: 0 }}
              transition={{ duration: 0.55, delay: 0.15 * index + 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className={cn(
                  'group cursor-default rounded-xl border p-3 transition-all duration-300',
                  active === callout.key
                    ? 'border-primary/40 bg-card shadow-[var(--shadow-lifted)]'
                    : 'border-transparent bg-card/60 backdrop-blur-sm',
                )}
              >
                <span
                  className={cn(
                    'mb-2 grid size-8 place-items-center rounded-lg transition-colors duration-300',
                    active === callout.key ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
                  )}
                >
                  <callout.icon className="size-4" aria-hidden="true" />
                </span>

                <h3 className="text-sm font-semibold">{callout.title}</h3>
                <p className="text-muted-foreground mt-1 line-clamp-4 text-xs/5">{callout.body}</p>

                {callout.tags && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {callout.tags.map((tag) => (
                      <li key={tag}>
                        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                          {tag}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ---------- stacked, below lg ---------- */}
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:hidden">
        <div className="bg-secondary relative col-span-full aspect-16/10 overflow-hidden rounded-2xl">
          <MediaImage src={carImage} alt="" fill sizes="92vw" className="object-contain p-4" />
        </div>

        {callouts.map((callout) => (
          <article key={callout.key} className="border-border bg-card rounded-xl border p-4">
            <span className="bg-primary/10 text-primary mb-2 grid size-9 place-items-center rounded-lg">
              <callout.icon className="size-4.5" aria-hidden="true" />
            </span>
            <h3 className="text-sm font-semibold">{callout.title}</h3>
            <p className="text-muted-foreground mt-1 text-xs/5">{callout.body}</p>
            {callout.tags && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {callout.tags.map((tag) => (
                  <li key={tag}>
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                      {tag}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </Section>
  );
}
