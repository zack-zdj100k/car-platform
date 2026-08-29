import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Kufi_Arabic, Noto_Sans_Arabic, Sora } from 'next/font/google';
import { cookies } from 'next/headers';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/providers/theme-provider';
import { LocaleProvider } from '@/providers/locale-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_META, isLocale } from '@/lib/i18n/config';
import './globals.css';

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

export const metadata: Metadata = {
  title: {
    default: 'Car Platform — Chinese cars: quality & innovation',
    template: '%s · Car Platform',
  },
  description:
    'A premium catalogue for discovering Chinese vehicles: full specifications, comparison and favourites.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    title: 'Car Platform',
    description: 'Discover Chinese vehicles with complete specifications.',
  },
  robots: { index: true, follow: true },
};

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
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  const dir = LOCALE_META[locale].dir;

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${sora.variable} ${inter.variable} ${notoArabic.variable} ${kufiArabic.variable}`}>
        <ThemeProvider>
          <LocaleProvider initialLocale={locale}>
            <AuthProvider>
              {children}
              <Toaster position="top-center" richColors closeButton />
            </AuthProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
