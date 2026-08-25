'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FacebookIcon, InstagramIcon, TikTokIcon } from '@/components/ui/brand-icons';
import { useLocale } from '@/providers/locale-provider';
import { cn } from '@/lib/utils';

/**
 * Home hero (spec §8), premium light treatment.
 *
 * The owner-supplied clip fills the viewport, with a light scrim rather than a
 * dark one so the page reads calm and airy. The headline is set in two
 * overlapping lines — a muted first line and a solid second — which is what
 * gives it the editorial feel.
 *
 * Under `prefers-reduced-motion` the video is not rendered at all and its own
 * poster frame is shown instead (spec §8, §65).
 *
 * Replace `public/videos/hero.mp4` and `hero-poster.jpg` to change the footage.
 */
export function Hero({ social }: { social: { tiktok: string; instagram: string; facebook: string } }) {
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

  const socials = [
    { key: 'tiktok', label: t.home.followTikTok, href: social.tiktok, Icon: TikTokIcon },
    { key: 'instagram', label: t.home.followInstagram, href: social.instagram, Icon: InstagramIcon },
    { key: 'facebook', label: t.home.followFacebook, href: social.facebook, Icon: FacebookIcon },
  ];

  return (
    <section className="relative isolate flex h-svh min-h-[40rem] items-center overflow-hidden bg-neutral-100 dark:bg-neutral-900">
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
          className={cn(
            'absolute inset-0 size-full object-cover object-[58%_center] transition-opacity duration-[1400ms] sm:object-center',
            videoReady ? 'opacity-100' : 'opacity-0',
          )}
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

      {/*
        2 — light scrim.
        A pale wash rather than a dark one, so the section stays airy while the
        type still clears AA. Wide screens fade left-to-right, keeping the copy
        legible and the car clear; narrow screens fade top-to-bottom, since
        there the copy sits over the vehicle rather than beside it.
      */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0',
          'bg-[linear-gradient(to_bottom,color-mix(in_oklab,white_88%,transparent)_0%,color-mix(in_oklab,white_74%,transparent)_42%,color-mix(in_oklab,white_34%,transparent)_78%,transparent_100%)]',
          'sm:bg-[linear-gradient(100deg,color-mix(in_oklab,white_90%,transparent)_0%,color-mix(in_oklab,white_72%,transparent)_38%,color-mix(in_oklab,white_26%,transparent)_66%,transparent_92%)]',
          'dark:bg-[linear-gradient(to_bottom,color-mix(in_oklab,black_84%,transparent)_0%,color-mix(in_oklab,black_66%,transparent)_42%,color-mix(in_oklab,black_30%,transparent)_78%,transparent_100%)]',
          'dark:sm:bg-[linear-gradient(100deg,color-mix(in_oklab,black_86%,transparent)_0%,color-mix(in_oklab,black_66%,transparent)_38%,color-mix(in_oklab,black_24%,transparent)_66%,transparent_92%)]',
        )}
      />

      {/* A short fade into the section below, so the seam is not a hard edge. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(to_top,var(--background),transparent)]"
      />

      {/* 3 — content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 sm:px-8">
        <div className="max-w-3xl">
          <p className="rise text-muted-foreground text-sm font-semibold tracking-[0.18em] uppercase">
            {t.home.heroEyebrow}
          </p>

          {/*
            Two overlapping lines: the first recedes, the second lands. The
            negative margin is what creates the overlap, so it is deliberate
            rather than a spacing accident.
          */}
          <h1 className="mt-4 flex flex-col tracking-tighter">
            <span
              className="rise text-6xl leading-none font-normal text-neutral-500 md:text-7xl lg:text-8xl dark:text-neutral-400"
              style={{ '--rise-delay': '70ms' } as React.CSSProperties}
            >
              {t.home.heroLine1}
            </span>
            <span
              className="rise -mt-3 text-6xl leading-none font-normal text-[#202A36] md:text-7xl lg:text-8xl dark:text-neutral-50"
              style={{ '--rise-delay': '150ms' } as React.CSSProperties}
            >
              {t.home.heroLine2}
            </span>
          </h1>

          <p
            className="rise text-muted-foreground mt-6 max-w-2xl text-lg md:text-xl"
            style={{ '--rise-delay': '230ms' } as React.CSSProperties}
          >
            {t.home.heroTagline}
          </p>

          <div
            className="rise mt-8 flex flex-wrap items-center gap-3"
            style={{ '--rise-delay': '310ms' } as React.CSSProperties}
          >
            {/* Both CTAs lead to the catalogue — the CTA target spec §8 requires. */}
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="h-11 rounded-full px-6 font-medium transition-transform duration-300 motion-safe:hover:-translate-y-0.5"
            >
              <Link href="/cars">{t.home.heroDiscover}</Link>
            </Button>

            <Button
              asChild
              size="lg"
              className="group h-11 rounded-full bg-[#202A36] px-6 font-medium text-white transition-transform duration-300 hover:bg-[#1a2229] motion-safe:hover:-translate-y-0.5 dark:bg-white dark:text-[#202A36] dark:hover:bg-neutral-200"
            >
              <Link href="/cars">
                {t.home.heroBook}
                <ArrowRight
                  className="size-4 transition-transform duration-300 motion-safe:group-hover:translate-x-0.5 rtl:rotate-180"
                  aria-hidden="true"
                />
              </Link>
            </Button>
          </div>

          {/*
            Social links (spec §27).
            The icons are always shown, because they are part of the layout. A
            platform without a configured URL renders as a muted, non-clickable
            placeholder rather than a link to nowhere — paste the real URL in
            admin settings and it becomes live. No account URL is invented.
          */}
          <ul
            className="rise mt-10 flex items-center gap-2.5"
            style={{ '--rise-delay': '390ms' } as React.CSSProperties}
          >
            {socials.map((entry) => {
              const shared =
                'grid size-10 place-items-center rounded-full bg-background/60 ring-1 ring-inset ring-border/60 backdrop-blur-sm transition-all duration-300';

              return (
                <li key={entry.key}>
                  {entry.href ? (
                    <a
                      href={entry.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={entry.label}
                      className={cn(
                        shared,
                        'text-foreground/70 hover:text-foreground hover:bg-background/90 motion-safe:hover:-translate-y-0.5',
                      )}
                    >
                      <entry.Icon className="size-4.5" />
                    </a>
                  ) : (
                    <span
                      role="img"
                      aria-label={`${entry.label} — add the link in admin settings`}
                      title={`${entry.label} — add the link in admin settings`}
                      className={cn(shared, 'text-muted-foreground/50 cursor-default')}
                    >
                      <entry.Icon className="size-4.5" />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <a
        href="#features"
        className="text-muted-foreground hover:text-foreground absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-1.5 text-[11px] tracking-widest uppercase transition-colors sm:flex"
      >
        {t.home.heroScroll}
        <ChevronDown className="size-4 motion-safe:animate-bounce" aria-hidden="true" />
      </a>
    </section>
  );
}
