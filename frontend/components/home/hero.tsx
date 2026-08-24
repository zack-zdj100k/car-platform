'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ElegantDarkPattern } from '@/components/ui/elegant-dark-pattern';
import { useLocale } from '@/providers/locale-provider';

/**
 * Home hero (spec §8).
 *
 * The owner-supplied clip is the hero itself, not a texture behind one. Layers,
 * bottom to top:
 *
 *   1. the video, at full opacity
 *   2. a brand tint plus the pattern's glow and grid, in overlay mode so the
 *      footage stays visible
 *   3. a contrast scrim, heavy behind the copy and clearing towards the right
 *      so the car is unobstructed
 *   4. the content
 *
 * Under `prefers-reduced-motion` the video is not rendered at all and its own
 * poster frame is shown instead — never a forced animation (spec §8, §65).
 *
 * Replace `public/videos/hero.mp4` (and `hero-poster.jpg`) to change the clip.
 */
export function Hero() {
  const { t } = useLocale();
  const reducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reducedMotion) return;

    // A cached video can already be playable before this effect runs, so
    // `canplay` would never fire again and the fade-in would never start.
    if (video.readyState >= 3) setVideoReady(true);

    // Playback is attached only while the hero is on screen, so it never
    // competes with the first paint and stops once scrolled past (spec §66).
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) void video.play().catch(() => undefined);
          else video.pause();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <section className="relative isolate flex min-h-[min(92svh,54rem)] items-center overflow-hidden bg-hero-to">
      {/* 1 — the footage */}
      {reducedMotion ? (
        <div
          className="absolute inset-0 bg-cover bg-[58%_center] sm:bg-center"
          style={{ backgroundImage: 'url(/videos/hero-poster.jpg)' }}
          aria-hidden="true"
        />
      ) : (
        <video
          ref={videoRef}
          className={`absolute inset-0 size-full object-cover object-[58%_center] transition-opacity duration-[1200ms] sm:object-center ${
            videoReady ? 'opacity-100' : 'opacity-0'
          }`}
          poster="/videos/hero-poster.jpg"
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          onCanPlay={() => setVideoReady(true)}
          onLoadedData={() => setVideoReady(true)}
        >
          <source src="/videos/hero.mp4" type="video/mp4" />
        </video>
      )}

      {/* 2 — brand tint, then the pattern's glow and grid over the footage */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-hero-via/35 mix-blend-multiply"
      />
      <ElegantDarkPattern variant="hero" overlay vignette={false} gridSize={64} className="opacity-70" />

      {/*
        3 — contrast scrim, which has to work in two very different shapes.

        On a wide screen the copy sits to the left of the car, so the scrim runs
        left-to-right: heavy behind the text, clearing by the time it reaches the
        vehicle. On a narrow screen there is no "left" — the copy sits on top of
        the car — so it runs top-to-bottom instead, darkening the band the
        headline occupies and releasing over the bodywork below.
      */}
      <div
        aria-hidden="true"
        className={
          'absolute inset-0 ' +
          'bg-[linear-gradient(to_bottom,color-mix(in_oklab,black_84%,transparent)_0%,color-mix(in_oklab,black_70%,transparent)_38%,color-mix(in_oklab,black_40%,transparent)_70%,color-mix(in_oklab,black_25%,transparent)_100%)] ' +
          'sm:bg-[linear-gradient(95deg,color-mix(in_oklab,black_82%,transparent)_0%,color-mix(in_oklab,black_66%,transparent)_34%,color-mix(in_oklab,black_28%,transparent)_62%,transparent_88%)]'
        }
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_top,var(--hero-to),transparent)]"
      />

      {/* 4 — content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-24 sm:px-8">
        <div className="max-w-3xl">
          <p className="rise text-hero-foreground/80 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase">
            <span className="bg-brand-accent inline-block h-px w-8" aria-hidden="true" />
            {t.home.statsTitle}
          </p>

          <h1
            className="rise text-hero-foreground mt-5 text-4xl font-semibold [text-shadow:0_2px_24px_rgb(0_0_0/45%)] sm:text-5xl lg:text-6xl"
            style={{ '--rise-delay': '80ms' } as React.CSSProperties}
          >
            {t.home.heroHeadline}
          </h1>

          <p
            className="rise text-hero-foreground/85 mt-6 max-w-2xl text-base/7 [text-shadow:0_1px_12px_rgb(0_0_0/50%)] sm:text-lg/8"
            style={{ '--rise-delay': '160ms' } as React.CSSProperties}
          >
            {t.home.heroBody}
          </p>

          <div
            className="rise mt-9 flex flex-wrap items-center gap-3"
            style={{ '--rise-delay': '240ms' } as React.CSSProperties}
          >
            {/* CTA navigates to the Cars page (spec §8) */}
            <Button asChild size="lg" className="group h-12 px-7 text-sm font-semibold tracking-wide">
              <Link href="/cars">
                {t.home.heroCta}
                <ArrowRight
                  className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5 rtl:rotate-180"
                  aria-hidden="true"
                />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-hero-foreground h-12 border-white/30 bg-white/10 px-7 backdrop-blur-sm hover:bg-white/20 hover:text-white"
            >
              <Link href="/about">{t.nav.about}</Link>
            </Button>
          </div>
        </div>
      </div>

      <a
        href="#features"
        className="text-hero-foreground/70 absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-1.5 text-[11px] tracking-widest uppercase transition-colors hover:text-white sm:flex"
      >
        {t.home.heroScroll}
        <ChevronDown className="size-4 motion-safe:animate-bounce" aria-hidden="true" />
      </a>
    </section>
  );
}
