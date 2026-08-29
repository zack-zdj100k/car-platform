'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Car, Mail, Phone } from 'lucide-react';
import { FacebookIcon, GitHubIcon, InstagramIcon, TikTokIcon } from '@/components/ui/brand-icons';
import { useLocale } from '@/providers/locale-provider';
import { settingsService } from '@/services/admin.service';
import { cn } from '@/lib/utils';

/**
 * Footer section — spec §10, §62.
 *
 * Links follow §10: Cars, About Us, Privacy Policy, Terms and Contact, plus
 * TikTok, Instagram, Facebook and GitHub. The SaaS links §10 rejects — Pricing,
 * Changelog, Integration — are deliberately absent.
 *
 * Social URLs and contact details come from the settings API and render only
 * when actually configured, so no account URL is ever invented (§27).
 *
 * Each column reveals with a short blur-and-lift as it enters view, and the
 * whole thing is skipped for anyone who prefers reduced motion.
 */

interface FooterLink {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  external?: boolean;
}

interface FooterColumn {
  label: string;
  links: FooterLink[];
}

export function FooterSection({ className }: { className?: string }) {
  const { t } = useLocale();
  const [settings, setSettings] = useState<Record<string, Record<string, unknown>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    settingsService
      .public({ cache: 'no-store' })
      .then((result) => {
        if (!cancelled) setSettings(result);
      })
      .catch(() => {
        // The footer must still render if settings are unavailable (spec §72).
        if (!cancelled) setSettings({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const read = (group: string, key: string): string => {
    const value = settings?.[group]?.[key];
    return typeof value === 'string' ? value : '';
  };

  const siteName = read('general', 'site.name') || 'ZODIC CAR';
  const contactEmail = read('general', 'site.contactEmail');
  const contactPhone = read('general', 'site.contactPhone');

  const socialLinks: FooterLink[] = [
    { title: 'TikTok', href: read('social', 'social.tiktok'), icon: TikTokIcon, external: true },
    { title: 'Instagram', href: read('social', 'social.instagram'), icon: InstagramIcon, external: true },
    { title: 'Facebook', href: read('social', 'social.facebook'), icon: FacebookIcon, external: true },
    { title: 'GitHub', href: read('social', 'social.github'), icon: GitHubIcon, external: true },
  ].filter((link) => link.href.length > 0);

  const columns: FooterColumn[] = [
    {
      label: t.nav.cars,
      links: [
        { title: t.cars.title, href: '/cars' },
        { title: t.home.featuredTitle, href: '/cars?featured=true' },
        { title: t.cars.sortPopular, href: '/cars?sort=popular' },
      ],
    },
    {
      label: t.nav.about,
      links: [
        { title: t.nav.about, href: '/about' },
        { title: t.about.missionTitle, href: '/about#mission' },
        { title: t.about.valuesTitle, href: '/about#values' },
      ],
    },
    {
      label: t.common.contact,
      links: [
        { title: t.common.privacyPolicy, href: '/privacy' },
        { title: t.common.terms, href: '/terms' },
      ],
    },
    ...(socialLinks.length > 0 ? [{ label: t.common.followUs, links: socialLinks }] : []),
  ];

  return (
    <footer
      className={cn(
        'relative mx-auto flex w-full max-w-6xl flex-col items-center justify-center',
        'rounded-t-4xl border-t px-6 py-12 md:rounded-t-[3rem] lg:py-16',
        'bg-[radial-gradient(35%_128px_at_50%_0%,color-mix(in_oklab,var(--foreground)_8%,transparent),transparent)]',
        className,
      )}
    >
      {/* A soft light line across the top edge, as in the reference design. */}
      <div className="bg-foreground/20 absolute top-0 right-1/2 left-1/2 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full blur" />

      <div className="grid w-full gap-8 xl:grid-cols-3 xl:gap-8">
        <AnimatedContainer className="space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <span className="bg-primary/10 ring-primary/20 grid size-9 place-items-center rounded-lg ring-1 ring-inset">
              <Car className="text-primary size-5" aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">{siteName}</span>
          </Link>

          <p className="text-muted-foreground max-w-sm text-sm/6">{t.about.heroSubtitle}</p>

          {(contactEmail || contactPhone) && (
            <div className="space-y-2 text-sm">
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 transition-colors duration-300"
                >
                  <Mail className="size-4" aria-hidden="true" />
                  {contactEmail}
                </a>
              )}
              {contactPhone && (
                <a
                  href={`tel:${contactPhone}`}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors duration-300"
                >
                  <Phone className="size-4" aria-hidden="true" />
                  {contactPhone}
                </a>
              )}
            </div>
          )}

          <p className="text-muted-foreground mt-8 text-sm md:mt-0">
            © {new Date().getFullYear()} {siteName}. {t.common.allRightsReserved}
          </p>
        </AnimatedContainer>

        <nav
          aria-label={t.nav.home}
          className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4 xl:col-span-2 xl:mt-0"
        >
          {columns.map((column, index) => (
            <AnimatedContainer key={column.label} delay={0.1 + index * 0.1}>
              <div className="mb-10 md:mb-0">
                <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                  {column.label}
                </h3>
                <ul className="mt-4 space-y-2 text-sm">
                  {column.links.map((link) => (
                    <li key={link.title + link.href}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-muted-foreground hover:text-foreground inline-flex items-center transition-all duration-300"
                        >
                          {link.icon && <link.icon className="me-1.5 size-4" />}
                          {link.title}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-muted-foreground hover:text-foreground inline-flex items-center transition-all duration-300"
                        >
                          {link.icon && <link.icon className="me-1.5 size-4" />}
                          {link.title}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedContainer>
          ))}
        </nav>
      </div>

      <p className="text-muted-foreground/70 mt-10 inline-flex items-center gap-1.5 self-start text-xs">
        <span className="bg-warning/80 inline-block size-1.5 rounded-full" aria-hidden="true" />
        {t.common.demoBadge}
      </p>
    </footer>
  );
}

type ViewAnimationProps = {
  delay?: number;
  className?: ComponentProps<typeof motion.div>['className'];
  children: ReactNode;
};

/**
 * Reveals its children with a brief blur-and-lift once in view.
 *
 * Returns the children untouched when reduced motion is preferred, so the
 * content is never dependent on an animation having run (spec §65).
 */
function AnimatedContainer({ className, delay = 0.1, children }: ViewAnimationProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
      whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default FooterSection;
