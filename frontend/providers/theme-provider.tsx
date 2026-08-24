'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

/** Spec §60 — light and dark mode with a system default. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
