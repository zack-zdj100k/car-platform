import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Kufi_Arabic, Noto_Sans_Arabic, Sora } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/providers/theme-provider';
import { LocaleProvider } from '@/providers/locale-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { LOCALE_META } from '@/lib/i18n/config';
import { serverDictionary, serverLocale } from '@/lib/i18n/server';
import './globals.css';
import { NavigationDepthTracker } from '@/components/shared/navigation-depth';

/** Display face for headings, body face for prose (spec §59 typography). */
const sora = Sora({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
/** Arabic needs a face with proper shaping (spec §7). */
const notoArabic = Noto_Sans_Arabic({ subsets: ['arabic'], variable: '--font-arabic', display: 'swap' });

/**
 * Arabic headings.
 *
 * Latin had two faces — Sora for headings, Inter for prose — and Arabic had
 * one, so an Arabic page's headings were set in its body face and read flat
 * beside the same page in French. Kufi is the right partner for Sora: both are
 * geometric, and its heavier weights hold a large heading the way Sora does
 * without the ornament of a naskh face, which would sit oddly on this site.
 */
const kufiArabic = Noto_Kufi_Arabic({
  subsets: ['arabic'],
  weight: ['600', '700'],
  variable: '--font-arabic-display',
  display: 'swap',
});

/**
 * Built per request rather than declared once, so the tab, the bookmark and
 * the shared link carry the visitor's language — a `<title>` is sent with the
 * first response and cannot be corrected after hydration.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await serverDictionary();
  return {
    title: { default: t.meta.siteTitle, template: '%s · ZODIC CAR' },
    description: t.meta.siteDescription,
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    openGraph: { type: 'website', title: 'ZODIC CAR', description: t.meta.ogDescription },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfbf9' },
    { media: '(prefers-color-scheme: dark)', color: '#1b1e22' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The route map defines no locale segment, so the language is read from a
  // cookie on the server. This renders the correct language and direction on
  // the first paint rather than flipping after hydration.
  const locale = await serverLocale();
  const dir = LOCALE_META[locale].dir;

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${sora.variable} ${inter.variable} ${notoArabic.variable} ${kufiArabic.variable}`}>
        <ThemeProvider>
          <LocaleProvider initialLocale={locale}>
            <AuthProvider>
              {/* Counts navigations inside the site, so "back" knows whether
                  there is anywhere of ours to go back to. */}
              <NavigationDepthTracker />
              {children}
              <Toaster position="top-center" richColors closeButton />
            </AuthProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
