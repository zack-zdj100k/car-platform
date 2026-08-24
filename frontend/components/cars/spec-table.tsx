'use client';

import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SpecRow {
  label: string;
  value: string | number | boolean | null | undefined;
}

/**
 * Specification table (spec §14: only display what the database holds).
 *
 * Rows whose value is null or undefined are dropped entirely rather than shown
 * as blanks, so nothing is implied that the record does not contain. Booleans
 * render as fitted / not fitted with an icon and a text label, never colour
 * alone (spec §65).
 */
export function SpecTable({
  rows,
  labels,
  className,
  columns = 2,
}: {
  rows: SpecRow[];
  labels: { fitted: string; notFitted: string };
  className?: string;
  columns?: 1 | 2;
}) {
  const present = rows.filter(
    (row) => row.value !== null && row.value !== undefined && row.value !== '',
  );

  if (present.length === 0) return null;

  return (
    <dl
      className={cn(
        'divide-border divide-y text-sm',
        columns === 2 && 'sm:grid sm:grid-cols-2 sm:gap-x-10 sm:divide-y-0',
        className,
      )}
    >
      {present.map((row) => (
        <div
          key={row.label}
          className={cn(
            'flex items-start justify-between gap-4 py-2.5',
            columns === 2 && 'sm:border-border sm:border-b',
          )}
        >
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="text-end font-medium">
            {typeof row.value === 'boolean' ? (
              row.value ? (
                <span className="text-success inline-flex items-center gap-1.5">
                  <Check className="size-4" aria-hidden="true" />
                  {labels.fitted}
                </span>
              ) : (
                <span className="text-muted-foreground inline-flex items-center gap-1.5">
                  <Minus className="size-4" aria-hidden="true" />
                  {labels.notFitted}
                </span>
              )
            ) : (
              row.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
