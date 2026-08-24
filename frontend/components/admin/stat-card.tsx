'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

/** Admin overview metric. Values are real database aggregates (spec §45). */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <Card className={cn('h-full', className)}>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-lg">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        </div>
        <p className="font-display text-3xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </CardContent>
    </Card>
  );
}
