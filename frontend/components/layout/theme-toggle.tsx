'use client';

import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocale } from '@/providers/locale-provider';
import { useIsClient } from '@/hooks/use-client-store';

/** Spec §60 — light / dark / system. */
export function ThemeToggle({ variant = 'default' }: { variant?: 'default' | 'onDark' }) {
  const { theme, setTheme } = useTheme();
  const { t } = useLocale();
  // The resolved theme is unknown during SSR; render a stable placeholder so
  // the markup matches and hydration stays quiet.
  const mounted = useIsClient();

  const onDark = variant === 'onDark';

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label={t.nav.theme} disabled className={onDark ? 'text-white/80' : undefined}>
        <Sun className="size-4" aria-hidden="true" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t.nav.theme}
          className={onDark ? 'text-white/80 hover:bg-white/10 hover:text-white' : undefined}
        >
          <Sun className="size-4 dark:hidden" aria-hidden="true" />
          <Moon className="hidden size-4 dark:block" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => setTheme('light')} data-active={theme === 'light'}>
          <Sun className="size-4" aria-hidden="true" />
          {t.nav.lightMode}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} data-active={theme === 'dark'}>
          <Moon className="size-4" aria-hidden="true" />
          {t.nav.darkMode}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} data-active={theme === 'system'}>
          <Monitor className="size-4" aria-hidden="true" />
          {t.nav.systemMode}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
