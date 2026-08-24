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
 * A cinematic video background over the dark green automotive environment. The
 * video is muted, looping and lazily attached, and `prefers-reduced-motion`
 * receives the poster frame as a static image instead — never a forced
 * animation. The video is a user-supplied asset; replace public/videos/hero.mp4
 * to change it.
 */
export function Hero() {
  const { t } = useLocale();
  const reducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reducedMotion) return;

    // A cached video can reach a playable state before this effect runs, so the
    // canplay event would never fire again and the fade-in would never start.
    if (video.readyState >= 3) setVideoReady(true);

    // Playback is attempted only once the element is on screen, so the hero
    // never competes with the first paint (spec §66).
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
    <section className="relative isolate flex min-h-[min(92svh,54rem)] items-center overflow-hidden">
      {/* Layer 1 — the dark green environment, always painted */}
      <ElegantDarkPattern variant="hero" />

      {/* Layer 2 — video, or its poster frame under reduced motion (spec §8) */}
      {reducedMotion ? (
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-45"
          style={{ backgroundImage: 'url(/videos/hero-poster.jpg)' }}
          aria-hidden="true"
        />
      ) : (
        <video
          ref={videoRef}
          className={`absolute inset-0 -z-10 size-full object-cover transition-opacity duration-1000 ${
            videoReady ? 'opacity-45' : 'opacity-0'
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

      {/* Layer 3 — contrast scrim so the headline always meets AA (spec §65) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,color-mix(in_oklab,black_72%,transparent)_0%,color-mix(in_oklab,black_38%,transparent)_55%,transparent_100%)]"
      />

      <div className="relative mx-auto w-full max-w-7xl px-5 py-24 sm:px-8">
        <div className="max-w-3xl">
          <p className="rise text-hero-foreground/70 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase">
            <span className="bg-brand-accent inline-block h-px w-8" aria-hidden="true" />
            {t.home.statsTitle}
          </p>

          <h1
            className="rise text-hero-foreground mt-5 text-4xl font-semibold sm:text-5xl lg:text-6xl"
            style={{ '--rise-delay': '80ms' } as React.CSSProperties}
          >
            {t.home.heroHeadline}
          </h1>

          <p
            className="rise text-hero-foreground/75 mt-6 max-w-2xl text-base/7 sm:text-lg/8"
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
              className="text-hero-foreground h-12 border-white/25 bg-white/5 px-7 hover:bg-white/10 hover:text-white"
            >
              <Link href="/about">{t.nav.about}</Link>
            </Button>
          </div>
        </div>
      </div>

      <a
        href="#features"
        className="text-hero-foreground/55 absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 text-[11px] tracking-widest uppercase transition-colors hover:text-white sm:flex"
      >
        {t.home.heroScroll}
        <ChevronDown className="size-4 motion-safe:animate-bounce" aria-hidden="true" />
      </a>
    </section>
  );
}
