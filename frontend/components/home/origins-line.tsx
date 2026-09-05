'use client';

import { useLocale } from '@/providers/locale-provider';
import { cn } from '@/lib/utils';

/**
 * Where the cars come from — Chinese, German, French, Asian, Algerian.
 *
 * Written in the dictionary as one string with dots between the words, and
 * broken up here rather than printed as it stands. Five words at this tracking
 * do not fit a phone on one line, and a plain string wraps wherever it likes:
 * the second line began with a dot, as though a word had gone missing.
 *
 * Each origin is one flex item carrying its own trailing separator, so a line
 * can only break after a dot. The dots are hidden from screen readers — they
 * are punctuation between items, not something to read aloud.
 */
export function OriginsLine({ className }: { className?: string }) {
  const { t } = useLocale();

  const origins = t.home.heroEyebrow
    .split('·')
    .map((word) => word.trim())
    .filter(Boolean);

  return (
    <span className={cn('flex flex-wrap items-center gap-x-1.5 gap-y-1', className)}>
      {origins.map((word, index) => (
        <span key={word}>
          {word}
          {index < origins.length - 1 && (
            <span aria-hidden="true" className="opacity-40">
              {' ·'}
            </span>
          )}
        </span>
      ))}
    </span>
  );
}
