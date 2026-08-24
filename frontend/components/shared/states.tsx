'use client';

import Link from 'next/link';
import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/providers/locale-provider';
import { cn } from '@/lib/utils';

/**
 * Loading, empty and error states (spec §72 — never leave a blank screen).
 */

export function LoadingState({ label, className }: { label?: string; className?: string }) {
  const { t } = useLocale();
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('text-muted-foreground flex flex-col items-center justify-center gap-3 py-16', className)}
    >
      <Loader2 className="size-6 animate-spin" aria-hidden="true" />
      <p className="text-sm">{label ?? t.common.loading}</p>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  actionHref,
  onAction,
  icon: Icon = Inbox,
  className,
}: {
  title: string;
  body?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: typeof Inbox;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'border-border/70 bg-card/40 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center',
        className,
      )}
    >
      <span className="bg-secondary text-muted-foreground grid size-12 place-items-center rounded-full">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {body && <p className="text-muted-foreground max-w-sm text-sm">{body}</p>}
      {actionLabel && actionHref && (
        <Button asChild className="mt-2">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
      {actionLabel && !actionHref && onAction && (
        <Button className="mt-2" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message?: string | null;
  onRetry?: () => void;
  className?: string;
}) {
  const { t } = useLocale();
  return (
    <div
      role="alert"
      className={cn(
        'border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-3 rounded-xl border px-6 py-14 text-center',
        className,
      )}
    >
      <span className="bg-destructive/10 text-destructive grid size-12 place-items-center rounded-full">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </span>
      <h3 className="font-display text-base font-semibold">{t.common.error}</h3>
      <p className="text-muted-foreground max-w-md text-sm">{message ?? t.common.errorBody}</p>
      {onRetry && (
        <Button variant="outline" className="mt-2" onClick={onRetry}>
          <RefreshCw className="size-4" aria-hidden="true" />
          {t.common.retry}
        </Button>
      )}
    </div>
  );
}

/** Grid of card skeletons matching the car card's shape. */
export function CarGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="border-border bg-card overflow-hidden rounded-xl border">
          <Skeleton className="aspect-16/10 w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="size-5 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
