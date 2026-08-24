'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Car, Mail, Phone } from 'lucide-react';
import {
  FacebookIcon,
  GitHubIcon,
  InstagramIcon,
  TikTokIcon,
} from '@/components/ui/brand-icons';
import { Separator } from '@/components/ui/separator';
import { ElegantDarkPattern } from '@/components/ui/elegant-dark-pattern';
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
 * Social URLs and contact details are read from the settings API and are only
 * rendered when actually configured, so no account URL is ever invented (§27).
 *
 * NOTE: the specification refers to this file as a provided component. None was
 * supplied, so it is authored here in the project's own design language — see
 * docs/DECISIONS.md D-2.2. Replacing it is a single-file overwrite: keep the
 * `FooterSection` export.
 */

interface SocialLink {
  key: string;
  label: string;
  href: string;
  icon: typeof TikTokIcon;
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

  const siteName = read('general', 'site.name') || 'Car Platform';
  const contactEmail = read('general', 'site.contactEmail');
  const contactPhone = read('general', 'site.contactPhone');

  const socials: SocialLink[] = (
    [
      { key: 'tiktok', label: 'TikTok', href: read('social', 'social.tiktok'), icon: TikTokIcon },
      { key: 'instagram', label: 'Instagram', href: read('social', 'social.instagram'), icon: InstagramIcon },
      { key: 'facebook', label: 'Facebook', href: read('social', 'social.facebook'), icon: FacebookIcon },
      { key: 'github', label: 'GitHub', href: read('social', 'social.github'), icon: GitHubIcon },
    ] satisfies SocialLink[]
  ).filter((social) => social.href.length > 0);

  const columns = [
    {
      heading: t.nav.cars,
      links: [
        { label: t.cars.title, href: '/cars' },
        { label: t.home.featuredTitle, href: '/cars?featured=true' },
        { label: t.cars.sortPopular, href: '/cars?sort=popular' },
      ],
    },
    {
      heading: t.nav.about,
      links: [
        { label: t.nav.about, href: '/about' },
        { label: t.about.missionTitle, href: '/about#mission' },
        { label: t.about.valuesTitle, href: '/about#values' },
      ],
    },
    {
      heading: t.common.contact,
      links: [
        { label: t.common.privacyPolicy, href: '/privacy' },
        { label: t.common.terms, href: '/terms' },
      ],
    },
  ];

  return (
    <footer className={cn('relative isolate overflow-hidden text-surface-dark-foreground', className)}>
      <ElegantDarkPattern variant="section" gridSize={72} vignette={false} />

      <div className="relative mx-auto w-full max-w-7xl px-5 pt-16 pb-8 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          {/* Brand block. The logo is a placeholder until the real asset arrives (§7). */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-primary/15 ring-1 ring-inset ring-white/15">
                <Car className="size-5 text-primary" aria-hidden="true" />
              </span>
              <span className="font-display text-lg font-semibold tracking-tight">{siteName}</span>
            </Link>

            <p className="mt-4 max-w-sm text-sm/6 text-white/65">{t.about.heroSubtitle}</p>

            {(contactEmail || contactPhone) && (
              <div className="mt-6 space-y-2 text-sm">
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="inline-flex items-center gap-2 text-white/70 transition-colors hover:text-white"
                  >
                    <Mail className="size-4" aria-hidden="true" />
                    {contactEmail}
                  </a>
                )}
                {contactPhone && (
                  <a
                    href={`tel:${contactPhone}`}
                    className="flex items-center gap-2 text-white/70 transition-colors hover:text-white"
                  >
                    <Phone className="size-4" aria-hidden="true" />
                    {contactPhone}
                  </a>
                )}
              </div>
            )}

            {socials.length > 0 && (
              <div className="mt-7">
                <h3 className="text-xs font-semibold tracking-widest text-white/45 uppercase">
                  {t.common.followUs}
                </h3>
                <ul className="mt-3 flex flex-wrap gap-2.5">
                  {socials.map((social) => (
                    <li key={social.key}>
                      <a
                        href={social.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={social.label}
                        className="grid size-10 place-items-center rounded-lg bg-white/5 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        <social.icon className="size-4.5" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>

          <nav aria-label={t.nav.home} className="grid gap-10 sm:grid-cols-3">
            {columns.map((column, index) => (
              <motion.div
                key={column.heading}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45, delay: 0.06 * index, ease: [0.22, 1, 0.36, 1] }}
              >
                <h3 className="text-xs font-semibold tracking-widest text-white/45 uppercase">
                  {column.heading}
                </h3>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {column.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        className="text-white/70 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </nav>
        </div>

        <Separator className="mt-14 bg-white/10" />

        <div className="flex flex-col items-start justify-between gap-3 pt-6 text-xs text-white/50 sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {siteName}. {t.common.allRightsReserved}
          </p>
          <p className="inline-flex items-center gap-1.5">
            <span className="inline-block size-1.5 rounded-full bg-warning/80" aria-hidden="true" />
            {t.common.demoBadge}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default FooterSection;
