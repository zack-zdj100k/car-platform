'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { useReducedMotion } from 'motion/react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FacebookIcon, InstagramIcon, TikTokIcon } from '@/components/ui/brand-icons';
import { useIsClient } from '@/hooks/use-client-store';
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
 * Each theme has its own footage — `hero-light.mp4` by day, `hero.mp4` after
 * dark — and only the one being shown is ever fetched. Rendering both and
 * hiding one with CSS would be simpler and would cost every visitor a six
 * megabyte download they never see.
 *
 * Which one cannot be known while rendering on the server, where there is no
 * theme yet, so the poster stands in until the browser has resolved it. That is
 * the same moment the video would begin loading anyway.
 *
 * Replace the files in `public/videos/` to change the footage.
 */

const FOOTAGE = {
  light: { video: '/videos/hero-light.mp4', poster: '/videos/hero-light-poster.jpg' },
  dark: { video: '/videos/hero.mp4', poster: '/videos/hero-poster.jpg' },
} as const;

/*
 * The daytime clip is shot in bright sun and sits under a pale scrim, and the
 * two together read as over-exposed — the car loses its edges into the wash.
 *
 * Darkening the footage rather than the scrim is what keeps this a change to
 * the picture and not to the page: where the wording sits the scrim is 88–90%
 * white, so the type is barely touched, while the open right-hand side, which
 * is nearly all video, settles down. A little contrast back afterwards, because
 * dimming alone flattens a picture.
 *
 * Only in light mode. The night clip is already dark and its scrim is black.
 */
const LIGHT_FOOTAGE_GRADE = 'brightness-[0.86] contrast-[1.06] saturate-[1.04] dark:filter-none';
export function Hero({ social }: { social: { tiktok: string; instagram: string; facebook: string } }) {
  const { t } = useLocale();
  const reducedMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const mounted = useIsClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  const footage = resolvedTheme === 'light' ? FOOTAGE.light : FOOTAGE.dark;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reducedMotion) return;

    /*
     * A new clip starts hidden and fades in as the old one did. Without this
     * the swap between themes would show one frozen frame of footage that has
     * not loaded yet, because the readiness flag survived the element.
     */
    setVideoReady(video.readyState >= 3);

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
    /*
     * `mounted` belongs here.
     *
     * The video element does not exist until the theme has resolved, so on the
     * first run this effect finds no element and returns. Without `mounted` in
     * the dependencies it never runs again, the observer is never attached to
     * the element that eventually appears, and the hero sits on its first frame
     * — silently, because the play() rejection is swallowed below.
     */
  }, [reducedMotion, mounted, footage.video]);

  const socials = [
    { key: 'tiktok', label: t.home.followTikTok, href: social.tiktok, Icon: TikTokIcon },
    { key: 'instagram', label: t.home.followInstagram, href: social.instagram, Icon: InstagramIcon },
    { key: 'facebook', label: t.home.followFacebook, href: social.facebook, Icon: FacebookIcon },
  ];

  return (
    /*
     * Pulled up behind the transparent header and padded by the same amount,
     * so the picture runs to the top of the window while the wording still
     * clears the navigation. Without this the header sat on a strip of page
     * background, which read as a solid bar across the top.
     */
    <section className="bg-background relative isolate -mt-16 flex min-h-svh flex-col overflow-hidden sm:h-svh sm:min-h-[40rem] sm:flex-row sm:items-center sm:pt-16 md:-mt-20 md:pt-20">
      {/*
        1 — the footage.

        On a phone it is a band across the top, at the clip's own shape, and the
        wording sits underneath it. Full-bleed footage in a portrait window is
        cropped to a strip about a quarter of the frame wide — neither car was
        recognisable, which is a strange thing for a page selling them: the
        daytime clip is square and the night one is 4:3, so a 9:19 window throws
        most of both away. From `sm` up the footage fills the section as before.

        WATERMARK. Both clips carry their generator's mark in the bottom-right
        corner. Whether `cover` happens to crop it away depends on the shape of
        the window — it survived on a tablet held upright, in the bottom right
        of the page — so from `sm` up the picture is zoomed a twelfth from its
        top edge, which pushes that corner out of frame at every size. On a
        phone the band's ratio does the same job.
      */}
      <div className="hero-band relative w-full shrink-0 overflow-hidden sm:absolute sm:inset-0">
      {reducedMotion || !mounted ? (
        /*
         * The still frame: shown to anyone who asked for less motion, and to
         * everybody for the moment before the browser has told us which theme
         * it is in.
         *
         * Both posters are in the markup, and CSS picks between them. This used
         * to be one element showing the night poster until the theme resolved,
         * which meant every reload of the daytime site opened on a second of
         * the wrong car before the right one replaced it. CSS has no such gap:
         * next-themes puts the theme on the document before the first paint, so
         * the correct still is the only one ever painted.
         *
         * A background image on a hidden element is not fetched, so this costs
         * nobody the other poster.
         */
        <>
          <div
            className={cn(
              'absolute inset-0 bg-cover bg-top sm:bg-center dark:hidden',
              'sm:origin-top sm:scale-[1.08]',
              // Graded to match its footage, or the swap would brighten.
              LIGHT_FOOTAGE_GRADE,
            )}
            style={{ backgroundImage: `url(${FOOTAGE.light.poster})` }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 hidden bg-cover bg-top sm:origin-top sm:scale-[1.08] sm:bg-center dark:block"
            style={{ backgroundImage: `url(${FOOTAGE.dark.poster})` }}
            aria-hidden="true"
          />
        </>
      ) : (
        <video
          /*
           * Keyed on the file: changing a `<source>` alone does not reload a
           * video, so switching theme would leave the old footage playing. The
           * key replaces the element, which is what makes the browser fetch the
           * other clip.
           */
          key={footage.video}
          ref={videoRef}
          className={cn(
            'absolute inset-0 size-full object-cover object-top transition-opacity duration-[1400ms] sm:object-center',
            // See WATERMARK above.
            'sm:origin-top sm:scale-[1.08]',
            LIGHT_FOOTAGE_GRADE,
            videoReady ? 'opacity-100' : 'opacity-0',
          )}
          poster={footage.poster}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          onCanPlay={() => setVideoReady(true)}
          onLoadedData={() => setVideoReady(true)}
        >
          <source src={footage.video} type="video/mp4" />
        </video>
      )}

      {/* On a phone the band's lower edge is dissolved into the page rather
          than cut, since the wording begins directly under it. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(to_top,var(--background),transparent)] sm:hidden"
      />
      </div>

      {/*
        2 — light scrim.

        A pale wash rather than a dark one, so the section stays airy while the
        type still clears AA. Wide screens fade left-to-right, keeping the copy
        legible and the car clear; narrow screens fade top-to-bottom, since
        there the copy sits over the vehicle rather than beside it.

        Down to a little over half of what it was — 48% white at the centre
        where it used to be 88% — and drawn tighter, so it sits under the
        wording instead of across the frame: 52% of the width rather than 80%,
        centred on the column of text. That is the owner's decision, taken with
        the measured numbers in front of them, after seeing the picture at a
        fifth and at a third of the old strength.

        What it costs is recorded rather than hidden. With no pool at all the
        worst pixel behind the headline is 1.00:1, because the words fall on the
        black grille of the car; at this strength it is short of the 3:1 the
        standard asks for text this size, and the exact figures are in the
        commit that set it. `e2e/hero-contrast.spec.ts` holds
        it to what was agreed, so it cannot quietly get worse, and the phone —
        where the wording sits on the page's own background — still clears the
        standard with room to spare.
      */}
      <div
        aria-hidden="true"
        className={cn(
          // Hidden on a phone: there the wording is under the band, on the
          // page's own background, so lightening the footage buys nothing and
          // only washes the car out.
          'absolute inset-0 hidden sm:block',
          /*
           * A pool of light behind the words, not a wash across the picture.
           *
           * The wash was 90% white down the whole left edge, which bleached
           * half the frame to light four lines of text. This lifts an ellipse
           * centred on the copy and leaves the rest of the picture alone — the
           * corners, the sky and the sand come back — with a thin overall veil
           * so the two do not meet at a visible seam.
           */
          'sm:bg-[radial-gradient(52%_80%_at_24%_54%,color-mix(in_oklab,white_48%,transparent)_0%,color-mix(in_oklab,white_34%,transparent)_45%,color-mix(in_oklab,white_9%,transparent)_74%,transparent_100%)]',
          'dark:sm:bg-[linear-gradient(100deg,color-mix(in_oklab,black_86%,transparent)_0%,color-mix(in_oklab,black_66%,transparent)_38%,color-mix(in_oklab,black_24%,transparent)_66%,transparent_92%)]',
        )}
      />

      {/* A short fade into the section below, so the seam is not a hard edge. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(to_top,var(--background),transparent)]"
      />

      {/* 3 — content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pt-8 pb-28 sm:px-8 sm:pt-0 sm:pb-0">
        <div className="max-w-3xl">
          {/*
            Charcoal rather than the muted grey used elsewhere.
            
            This wording sits over moving footage, not over a flat surface, and
            the footage is now graded darker: measured over the actual frames,
            the warm grey fell to 4.39:1 — under the 4.5:1 small text needs, and
            varying frame by frame as the picture moves. The full-strength text
            colour holds regardless of what the car is doing behind it.
          */}
          <p className="rise text-foreground text-sm font-semibold tracking-[0.18em] uppercase">
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
              className="rise text-foreground -mt-3 text-6xl leading-none font-normal md:text-7xl lg:text-8xl"
              style={{ '--rise-delay': '150ms' } as React.CSSProperties}
            >
              {t.home.heroLine2}
            </span>
          </h1>

          <p
            className="rise text-foreground mt-6 max-w-2xl text-lg md:text-xl"
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

            {/*
              * The main call to action, in champagne.
              *
              * It was a hardcoded #202A36 — a blue-grey from a palette this
              * site left behind two changes ago — turning pure white in dark
              * mode. Champagne belongs to the palette and is legible on the
              * dark hero either way: 5.67:1 under a charcoal label.
              */}
            <Button
              asChild
              size="lg"
              className="group bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent-hover h-11 rounded-full px-6 font-medium transition-transform duration-300 motion-safe:hover:-translate-y-0.5"
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
