'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * Spec §60 — light and dark mode.
 *
 * Dark is the default. The palette this site is designed in is the black one —
 * black page, army green accents, #171719 cards — so a visitor whose machine
 * happens to prefer light should still arrive at the site as it is meant to
 * look. The toggle still offers light and system.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
