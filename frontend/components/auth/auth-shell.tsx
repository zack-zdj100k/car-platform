'use client';

import Link from 'next/link';
import { Car } from 'lucide-react';
import { ElegantDarkPattern } from '@/components/ui/elegant-dark-pattern';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { useLocale } from '@/providers/locale-provider';

/** Shared frame for sign in and sign up (spec §36, §37). */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const { t } = useLocale();

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Form column */}
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" aria-label={t.nav.home}>
            <span className="bg-primary/10 ring-primary/20 grid size-9 place-items-center rounded-lg ring-1 ring-inset">
              <Car className="text-primary size-5" aria-hidden="true" />
            </span>
            <span className="font-display font-semibold tracking-tight">ZODIC CAR</span>
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
            <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>
            <div className="mt-8">{children}</div>
            <div className="text-muted-foreground mt-8 text-center text-sm">{footer}</div>
          </div>
        </div>
      </div>

      {/* Brand column — decorative, hidden on small screens */}
      <div className="relative isolate hidden overflow-hidden lg:block">
        <ElegantDarkPattern variant="hero" />
        <div className="relative flex h-full flex-col justify-end p-12">
          <blockquote className="text-hero-foreground max-w-md">
            <p className="font-display text-2xl leading-snug font-semibold">{t.home.heroHeadline}</p>
            <footer className="text-hero-foreground/60 mt-4 text-sm">{t.about.missionStatement}</footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
