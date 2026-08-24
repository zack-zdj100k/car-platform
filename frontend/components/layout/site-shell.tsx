'use client';

import { SiteHeader } from './site-header';
import { FooterSection } from '@/components/ui/footer-section';
import { useLocale } from '@/providers/locale-provider';

/**
 * Public page chrome: skip link, header, main landmark and footer.
 * The skip link is the first focusable element on every page (spec §65).
 */
export function SiteShell({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="bg-primary text-primary-foreground sr-only rounded-md px-4 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-100"
      >
        {t.nav.skipToContent}
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <FooterSection />
    </div>
  );
}
