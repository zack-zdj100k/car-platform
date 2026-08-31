'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Link2, Pause, Play, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MediaImage } from '@/components/shared/media-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Radial orbital diagram.
 *
 * Nodes ride a ring around a centre piece, the ring turns on its own, and
 * selecting a node opens its detail and draws connectors to whatever it relates
 * to. Built from the reference implementation, with these departures:
 *
 *   1. Nodes are buttons, not click handlers on a div. Divs cannot be reached
 *      by keyboard and announce nothing, and the site is held to WCAG 2.2 AA.
 *
 *   2. Rotation runs on requestAnimationFrame against elapsed time, not a 50ms
 *      interval, so it is smooth on every refresh rate and does not drift when
 *      the tab is throttled. It also stops while the tab is hidden.
 *
 *   3. Motion can be stopped. Content that moves for more than five seconds
 *      needs a control (WCAG 2.2.2), and `prefers-reduced-motion` parks the
 *      ring outright rather than merely slowing it.
 *
 *   4. The radius is measured from the container instead of a fixed 200px, and
 *      the detail sits in a column beside the ring instead of hanging off the
 *      node. A fixed radius pushes a phone viewport sideways, and a card that
 *      hangs beneath the selected node lands squarely on the centre piece —
 *      hiding the very car the diagram is about.
 *
 *   5. Colours come from the theme rather than black and white, and each item
 *      can carry a picture — which is the point of it here: real photography of
 *      the part being described.
 */

export interface OrbitalItem {
  id: number;
  title: string;
  content: string;
  icon: LucideIcon;
  /** Related item ids — connectors are drawn to these when this one opens. */
  relatedIds: number[];
  /** 0–100, drawn as the coverage bar in the detail. */
  energy: number;
  /** Short already-translated label shown as a badge. */
  badge?: string;
  /** Optional picture: an upload id or a bundled path. */
  image?: string;
  tags?: string[];
}

export interface RadialOrbitalTimelineProps {
  items: OrbitalItem[];
  /** Sits at the centre of the ring — here, the car itself. */
  centerImage?: string;
  centerLabel?: string;
  /** Already-translated interface strings. */
  labels: {
    hint: string;
    connected: string;
    coverage: string;
    pause: string;
    resume: string;
  };
  className?: string;
}

/** Degrees per second. A full turn takes just under a minute. */
const ROTATION_SPEED = 6;

/**
 * Rounds a computed length or ratio before it reaches an inline style.
 *
 * Two things go wrong when raw floating point is written into `style`, and both
 * break hydration:
 *
 *   1. The browser does not keep the precision. `translate(-90.00000000000009px)`
 *      comes back out of the CSSOM as `translate(-90px)`, so the string React
 *      compares against during hydration is not the string the server sent —
 *      the mismatch appears on every visit, in every browser.
 *
 *   2. `Math.cos`/`Math.sin` are implementation-dependent to the last unit in
 *      the last place, so the Node build rendering on the server and the engine
 *      in the visitor's browser need not agree on the final digit at all.
 *
 * Rounding to three decimals — well below a device pixel — removes both, and
 * incidentally removes exponent notation like `2.2e-14px` from the output.
 * Everything downstream is plain arithmetic, which IEEE-754 does define exactly,
 * so both renders produce the same string.
 */
const quantise = (value: number, decimals = 3) => Number(value.toFixed(decimals));

export function RadialOrbitalTimeline({
  items,
  centerImage,
  centerLabel,
  labels,
  className,
}: RadialOrbitalTimelineProps) {
  const [rotation, setRotation] = useState(0);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [running, setRunning] = useState(true);
  const [radius, setRadius] = useState(180);
  const [reduced, setReduced] = useState(false);
  const [engaged, setEngaged] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  // Reduced motion is read as state rather than at render, so the first paint
  // on the server and the first paint in the browser agree.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  // The ring is sized from the box it lands in, so it fits a phone as well as a
  // wide screen without a horizontal scrollbar appearing.
  useEffect(() => {
    const element = ringRef.current;
    if (!element) return;

    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      const usable = Math.min(width, height) / 2;
      /*
       * The margin kept for a node and the name under it. Smaller on a phone,
       * where the type is smaller too — and where the ring is bounded by the
       * width of the screen, so every pixel of it is the difference between a
       * diagram and a badge.
       */
      const margin = width < 640 ? 52 : 68;
      setRadius(Math.max(96, Math.min(usable - margin, 320)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /*
   * The ring holds still whenever someone is actually working with it: a
   * pointer over the diagram, or keyboard focus inside it. Chasing a moving
   * 44px target with a mouse is unpleasant, and it is impossible for anyone
   * with a tremor or a trackpad they steer slowly.
   */
  const spinning = running && !engaged && activeId === null && !reduced;

  useEffect(() => {
    if (!spinning) return;

    let frame = 0;
    let last = performance.now();

    const step = (now: number) => {
      const elapsed = now - last;
      last = now;
      setRotation((previous) => (previous + (elapsed / 1000) * ROTATION_SPEED) % 360);
      frame = requestAnimationFrame(step);
    };

    // A hidden tab still fires timers on some platforms; there is nothing to
    // animate for a reader who cannot see it.
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
      } else {
        last = performance.now();
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [spinning]);

  /** Positions are pure geometry, so the connectors and the nodes agree. */
  const positions = useMemo(() => {
    return items.map((item, index) => {
      const angle = ((index / items.length) * 360 + rotation) % 360;
      const radian = (angle * Math.PI) / 180;
      // Quantised once, here, so every value below is derived from the same
      // numbers on the server and in the browser.
      const depth = quantise(Math.cos(radian), 6); // -1 behind, 1 in front
      const lift = quantise(Math.sin(radian), 6);
      return {
        id: item.id,
        x: quantise(radius * depth),
        y: quantise(radius * lift),
        /*
         * Small numbers, and deliberately so. These only order the nodes
         * against each other and against the vehicle at the centre (z-10) —
         * but they were 50 to 150, which is above the site header and above
         * the account menu at z-50, so opening that menu over this section
         * showed the ring's icons floating through it. A diagram's internal
         * depth has no business competing with the page's furniture.
         */
        zIndex: Math.round(20 + 8 * depth),
        opacity: quantise(Math.max(0.55, 0.55 + 0.45 * ((1 + lift) / 2))),
        scale: quantise(0.9 + 0.1 * ((depth + 1) / 2)),
      };
    });
  }, [items, radius, rotation]);

  const active = items.find((item) => item.id === activeId) ?? null;
  const svgSize = (radius + 60) * 2;

  /*
   * Turns the opened node to the right of the ring — the side the detail sits
   * on — so the two read as one thing. The reference brings it to the top,
   * where the card that hangs beneath it lands squarely on the centre piece.
   */
  const focusNode = useCallback(
    (id: number) => {
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return;
      setRotation((360 - (index / items.length) * 360) % 360);
    },
    [items],
  );

  const toggle = useCallback(
    (id: number) => {
      setActiveId((current) => {
        if (current === id) return null;
        focusNode(id);
        return id;
      });
    },
    [focusNode],
  );

  // Escape closes the open node, the way any other transient panel behaves.
  useEffect(() => {
    if (activeId === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId]);

  const connectors = useMemo(() => {
    if (!active) return [];
    const from = positions.find((position) => position.id === active.id);
    if (!from) return [];
    return active.relatedIds
      .map((id) => positions.find((position) => position.id === id))
      .filter((position): position is (typeof positions)[number] => Boolean(position))
      .map((to) => ({ id: to.id, x1: from.x, y1: from.y, x2: to.x, y2: to.y }));
  }, [active, positions]);

  return (
    <div className={cn('w-full', className)} ref={containerRef}>
      <div className="flex items-center justify-center gap-3">
        <p className="text-muted-foreground text-center text-sm">{labels.hint}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5"
          aria-pressed={!running}
          onClick={() => setRunning((value) => !value)}
        >
          {running ? (
            <Pause className="size-3.5" aria-hidden="true" />
          ) : (
            <Play className="size-3.5" aria-hidden="true" />
          )}
          {running ? labels.pause : labels.resume}
        </Button>
      </div>

      {/*
        On a wide screen the reading column takes more room than the ring needs
        to give up: the card is where the substance is, and at 20rem its
        paragraph broke every four or five words. Below that the older, tighter
        card is the right one — a tablet splitting 26rem off the ring leaves the
        diagram cramped, and a phone stacks the two anyway.
      */}
      <div className="mt-6 grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_20rem] lg:grid-cols-[minmax(0,1fr)_30rem]">
      <div
        ref={ringRef}
        className="relative mx-auto flex h-[27rem] w-full max-w-5xl items-center justify-center sm:h-[38rem] lg:h-[46rem]"
        onPointerEnter={() => setEngaged(true)}
        onPointerLeave={() => setEngaged(false)}
        onFocusCapture={() => setEngaged(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setEngaged(false);
          }
        }}
      >
        {/* The rings themselves. */}
        <div
          className="border-border/70 pointer-events-none absolute rounded-full border"
          style={{ width: radius * 2, height: radius * 2 }}
          aria-hidden="true"
        />
        <div
          className="border-primary/20 pointer-events-none absolute rounded-full border border-dashed"
          style={{ width: quantise(radius * 2.36, 1), height: quantise(radius * 2.36, 1) }}
          aria-hidden="true"
        />

        {/* Connectors from the open node to whatever it relates to. */}
        {connectors.length > 0 && (
          /*
           * Sized to the ring and centred by the same flex box as everything
           * else, so a line can be drawn in plain pixels from the middle. SVG
           * geometry attributes take calc() unevenly across browsers.
           */
          <svg
            className="pointer-events-none absolute overflow-visible"
            width={svgSize}
            height={svgSize}
            viewBox={`0 0 ${svgSize} ${svgSize}`}
            aria-hidden="true"
          >
            {connectors.map((line) => (
              <line
                key={line.id}
                x1={line.x1 + svgSize / 2}
                y1={line.y1 + svgSize / 2}
                x2={line.x2 + svgSize / 2}
                y2={line.y2 + svgSize / 2}
                className="text-primary/70 [stroke-dasharray:5_6] motion-safe:[animation:orbit-dash_1.4s_linear_infinite]"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            ))}
          </svg>
        )}

        {/* Centre piece: the vehicle everything is describing. */}
        <div className="absolute z-10 grid place-items-center">
          <span
            className="bg-primary/10 absolute size-28 animate-ping rounded-full opacity-40 [animation-duration:3s] motion-reduce:animate-none sm:size-60 lg:size-72"
            aria-hidden="true"
          />
          <span
            className="ring-primary/20 absolute size-40 rounded-full ring-1 sm:size-72 lg:size-84"
            aria-hidden="true"
          />
          {centerImage ? (
            <span className="bg-card ring-border/60 relative block size-36 overflow-hidden rounded-full ring-1 sm:size-64 lg:size-76">
              <MediaImage
                src={centerImage}
                alt={centerLabel ?? ''}
                fill
                sizes="(min-width: 64rem) 19rem, (min-width: 40rem) 16rem, 9rem"
                className="object-cover"
              />
            </span>
          ) : (
            <span className="from-primary via-brand-accent to-primary/40 size-16 rounded-full bg-gradient-to-br" />
          )}
        </div>

        {/* Nodes. */}
        {items.map((item, index) => {
          const position = positions[index];
          const isActive = item.id === activeId;
          const isRelated = active ? active.relatedIds.includes(item.id) : false;
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className="absolute"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${position.scale})`,
                zIndex: isActive ? 40 : position.zIndex,
              }}
            >
              <button
                type="button"
                onClick={() => toggle(item.id)}
                /*
                 * The depth fade is on the circle alone. Fading the wrapper
                 * took the label down with it, and dimmed text on the far side
                 * of the ring measured 2.68:1 — the audit was right to fail it.
                 */
                style={{ opacity: isActive || isRelated ? 1 : position.opacity }}
                aria-expanded={isActive}
                aria-controls={`orbit-detail-${item.id}`}
                className={cn(
                  'group grid size-12 place-items-center rounded-full border-2 transition-[background-color,border-color,box-shadow,transform] duration-300',
                  'focus-visible:outline-2 focus-visible:outline-offset-4',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary scale-125 shadow-lg'
                    : isRelated
                      ? 'bg-primary/15 text-primary border-primary animate-pulse motion-reduce:animate-none'
                      : 'bg-card text-foreground border-border hover:border-primary hover:text-primary',
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span className="sr-only">{item.title}</span>
              </button>

              <span
                className={cn(
                  /*
                   * Shown on a phone too. The names were hidden below `sm`,
                   * which left six unlabelled circles: the icons alone do not
                   * say "tyres" rather than "wheels", and the name is the whole
                   * point of the diagram. Wrapped and narrow there, since
                   * "Safety & Driver Assistance" on one line would push the
                   * page sideways.
                   */
                  'pointer-events-none absolute top-12 left-1/2 block max-w-24 -translate-x-1/2 text-center text-[10px] leading-tight font-semibold tracking-wide transition-colors duration-300',
                  'sm:top-14 sm:max-w-none sm:text-xs sm:whitespace-nowrap',
                  // Full token colours only: `foreground/70` measured 4.35:1
                  // against the light surface, just under the 4.5:1 minimum.
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
                aria-hidden="true"
              >
                {item.title}
              </span>
            </div>
          );
        })}

      </div>

        {/*
          The detail sits beside the ring rather than over it, so the car in the
          middle is never covered. The column keeps its width whether or not
          anything is open, so selecting a point does not shift the page.
        */}
        <div className="mx-auto w-full max-w-md md:mx-0 md:max-w-none">
          {active ? (
            <OrbitalDetail item={active} labels={labels} items={items} onSelect={toggle} />
          ) : (
            <p className="border-border/70 text-muted-foreground hidden rounded-xl border border-dashed p-6 text-center text-xs/5 md:block">
              {labels.hint}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function OrbitalDetail({
  item,
  items,
  labels,
  onSelect,
}: {
  item: OrbitalItem;
  items: OrbitalItem[];
  labels: RadialOrbitalTimelineProps['labels'];
  onSelect: (id: number) => void;
}) {
  return (
    <Card
      id={`orbit-detail-${item.id}`}
      className="gap-0 overflow-hidden py-0 shadow-[var(--shadow-lifted)]"
    >
      {item.image && (
        <div className="bg-secondary relative aspect-16/9 w-full">
          <MediaImage
            src={item.image}
            alt=""
            fill
            sizes="(min-width: 64rem) 30rem, (min-width: 48rem) 20rem, 100vw"
            className="object-cover"
          />
        </div>
      )}

      <CardHeader className="gap-2 px-4 pt-4 lg:px-6 lg:pt-6">
        <div className="flex items-center justify-between gap-2">
          {item.badge && (
            <Badge variant="secondary" className="text-[10px] lg:text-xs">
              {item.badge}
            </Badge>
          )}
          <span className="text-muted-foreground font-mono text-[10px] lg:text-xs">
            {String(item.id).padStart(2, '0')}
          </span>
        </div>
        <CardTitle className="text-sm lg:text-lg">{item.title}</CardTitle>
      </CardHeader>

      <CardContent className="text-muted-foreground px-4 pt-3 pb-5 text-xs/5 lg:px-6 lg:pb-6 lg:text-sm/6">
        <p>{item.content}</p>

        {item.tags && item.tags.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <li key={tag}>
                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                  {tag}
                </Badge>
              </li>
            ))}
          </ul>
        )}

        <div className="border-border/70 mt-4 border-t pt-3">
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1">
              <Zap className="size-3" aria-hidden="true" />
              {labels.coverage}
            </span>
            <span className="font-mono">{item.energy}%</span>
          </div>
          <div className="bg-secondary h-1 w-full overflow-hidden rounded-full">
            <div
              className="from-primary to-brand-accent h-full rounded-full bg-gradient-to-r transition-[width] duration-700"
              style={{ width: `${item.energy}%` }}
            />
          </div>
        </div>

        {item.relatedIds.length > 0 && (
          <div className="border-border/70 mt-4 border-t pt-3">
            <p className="text-muted-foreground mb-2 flex items-center gap-1 text-[10px] font-medium tracking-wider uppercase">
              <Link2 className="size-3" aria-hidden="true" />
              {labels.connected}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {item.relatedIds.map((id) => {
                const related = items.find((candidate) => candidate.id === id);
                if (!related) return null;
                return (
                  <Button
                    key={id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 gap-1 px-2 text-[11px]"
                    onClick={() => onSelect(id)}
                  >
                    {related.title}
                    <ArrowRight className="size-2.5" aria-hidden="true" />
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RadialOrbitalTimeline;
