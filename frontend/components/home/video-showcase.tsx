'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/shared/section';
import { Reveal } from '@/components/shared/reveal';
import { RadialBackdrop } from '@/components/ui/tailwind-css-background-snippet';
import { useLocale } from '@/providers/locale-provider';
import { cn } from '@/lib/utils';

/**
 * A compact video panel on the landing page.
 *
 * Deliberately small — it sits inside a card rather than filling the viewport,
 * so it reads as one item among several instead of competing with the hero.
 * It only starts when scrolled into view and pauses on the way out, and under
 * `prefers-reduced-motion` the poster frame is shown instead (spec §8, §66).
 */
export function VideoShowcase() {
  const { t } = useLocale();
  const reduced = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduced) return;

    if (video.readyState >= 3) setReady(true);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) void video.play().catch(() => undefined);
          else video.pause();
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [reduced]);

  return (
    <Section className="py-14 sm:py-16">
      <Reveal>
        <div className="border-border relative isolate overflow-hidden rounded-3xl border">
          <RadialBackdrop />

          <div className="relative grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[1.1fr_1fr]">
            <div className="text-hero-foreground">
              <p className="text-hero-foreground/70 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase">
                <Play className="size-3" aria-hidden="true" />
                {t.home.heroEyebrow}
              </p>

              <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">{t.home.showcaseTitle}</h2>
              <p className="text-hero-foreground/75 mt-3 max-w-md text-sm/7">{t.home.showcaseBody}</p>

              {/*
                * Champagne on the dark panel rather than a white fill with a
                * hardcoded blue-grey label — the label's colour was left over
                * from a palette this site no longer uses, and pure white is
                * not in the light palette at all.
                */}
              <Button
                asChild
                className="bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent-hover mt-6 rounded-full px-6"
              >
                <Link href="/cars" className="group">
                  {t.home.viewAllCars}
                  <ArrowRight
                    className="size-4 transition-transform duration-300 motion-safe:group-hover:translate-x-0.5 rtl:rotate-180"
                    aria-hidden="true"
                  />
                </Link>
              </Button>
            </div>

            {/* The clip itself, kept small and framed */}
            <div className="ring-border/40 relative aspect-video overflow-hidden rounded-2xl ring-1">
              {reduced ? (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: 'url(/videos/showcase-poster.jpg)' }}
                  aria-hidden="true"
                />
              ) : (
                <video
                  ref={videoRef}
                  className={cn(
                    'absolute inset-0 size-full object-cover transition-opacity duration-1000',
                    ready ? 'opacity-100' : 'opacity-0',
                  )}
                  poster="/videos/showcase-poster.jpg"
                  muted
                  loop
                  playsInline
                  preload="none"
                  aria-hidden="true"
                  tabIndex={-1}
                  onCanPlay={() => setReady(true)}
                  onLoadedData={() => setReady(true)}
                >
                  <source src="/videos/showcase.mp4" type="video/mp4" />
                </video>
              )}
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
