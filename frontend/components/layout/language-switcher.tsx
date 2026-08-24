'use client';

import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LOCALES, LOCALE_META, type Locale } from '@/lib/i18n/config';
import { useLocale } from '@/providers/locale-provider';

/** Spec §7 — French / Arabic / English. */
export function LanguageSwitcher({ variant = 'default' }: { variant?: 'default' | 'onDark' }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t.nav.language}
          className={variant === 'onDark' ? 'text-white/80 hover:bg-white/10 hover:text-white' : undefined}
        >
          <Globe className="size-4" aria-hidden="true" />
          <span className="ms-1 text-xs font-medium uppercase">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t.nav.language}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={locale} onValueChange={(value) => setLocale(value as Locale)}>
          {LOCALES.map((entry) => (
            <DropdownMenuRadioItem key={entry} value={entry}>
              <span className="flex-1">{LOCALE_META[entry].native}</span>
              <span className="text-muted-foreground text-xs uppercase">{entry}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
