'use client';

import { Car, Home, Info } from 'lucide-react';
import { SiteHeader } from './site-header';
import { FooterSection } from '@/components/ui/footer-section';
import { NavBar, type NavItem } from '@/components/ui/tubelight-navbar';
import { useLocale } from '@/providers/locale-provider';

/**
 * Public page chrome: skip link, header, main landmark and footer.
 * The skip link is the first focusable element on every page (spec §65).
 */
export function SiteShell({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();

  const navItems: NavItem[] = [
    { name: t.nav.home, url: '/', icon: Home },
    { name: t.nav.cars, url: '/cars', icon: Car },
    { name: t.nav.about, url: '/about', icon: Info },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="bg-primary text-primary-foreground sr-only rounded-md px-4 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-100"
      >
        {t.nav.skipToContent}
      </a>
      <SiteHeader />
      {/*
        The floating bar leaves room beneath it on small screens, so it never
        covers the end of the page or the footer.
      */}
      <main id="main" className="flex-1 pb-24 lg:pb-0">
        {children}
      </main>
      <FooterSection className="pb-24 lg:pb-12" />

      {/* Thumb-reachable primary navigation, small screens only. */}
      <div className="lg:hidden">
        <NavBar items={navItems} layoutGroup="mobile" />
      </div>
    </div>
  );
}
