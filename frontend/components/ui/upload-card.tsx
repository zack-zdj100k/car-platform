'use client';

import * as React from 'react';
import { ArrowUpCircle, CheckCircle, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The card shown while something is uploading, and when it finishes.
 *
 * Departures from the reference implementation, all deliberate:
 *
 *   1. **It is styled.** The reference carries bare class names — `card`,
 *      `btn-first`, `blue` — and no stylesheet, so pasted in as given it renders
 *      as unstyled text. This uses the site's own tokens, which is also what
 *      makes it follow the page into dark mode.
 *
 *   2. **The buttons are buttons.** The reference uses `<a href="#">` for
 *      "Cancel" and "Retry": clicking one jumps the page to the top, and it is
 *      announced as a link to somewhere rather than as an action.
 *
 *   3. **The close button closes.** In the reference it has no handler at all.
 *
 *   4. **It says what it is doing out loud.** Progress is a real
 *      `role="progressbar"` with its value, and a failure is announced as an
 *      alert — the difference between a sighted person seeing a red card and
 *      everybody else knowing an upload failed.
 *
 *   5. `clsx` is not installed for it. The project already merges class names
 *      with `cn`, which is clsx with Tailwind conflict resolution on top.
 */

export type UploadStatus = 'uploading' | 'success' | 'error';

export interface UploadCardProps {
  status: UploadStatus;
  /** 0–100. Only read while uploading. */
  progress?: number;
  title: string;
  description: string;
  primaryButtonText?: string;
  onPrimaryButtonClick?: () => void;
  secondaryButtonText?: string;
  onSecondaryButtonClick?: () => void;
  onClose?: () => void;
  className?: string;
}

const TONE: Record<UploadStatus, { ring: string; icon: string; bar: string }> = {
  uploading: { ring: 'border-primary/30', icon: 'text-primary', bar: 'bg-primary' },
  success: { ring: 'border-success/40', icon: 'text-success', bar: 'bg-success' },
  error: { ring: 'border-destructive/40', icon: 'text-destructive', bar: 'bg-destructive' },
};

const ICON: Record<UploadStatus, typeof CheckCircle> = {
  uploading: ArrowUpCircle,
  success: CheckCircle,
  error: XCircle,
};

export function UploadCard({
  status,
  progress,
  title,
  description,
  primaryButtonText,
  onPrimaryButtonClick,
  secondaryButtonText,
  onSecondaryButtonClick,
  onClose,
  className,
}: UploadCardProps) {
  const tone = TONE[status];
  const Icon = ICON[status];
  const percent = Math.max(0, Math.min(100, Math.round(progress ?? 0)));

  return (
    <div
      /*
       * A failure interrupts; progress and success do not. Both are announced,
       * but only one is worth taking somebody away from what they are doing.
       */
      role={status === 'error' ? 'alert' : 'status'}
      aria-live={status === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'bg-popover text-popover-foreground w-[min(22rem,90vw)] rounded-xl border p-4 shadow-[var(--shadow-lifted)]',
        tone.ring,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={cn('mt-0.5 size-5 shrink-0', tone.icon, status === 'uploading' && 'animate-pulse')}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-muted-foreground mt-0.5 text-xs/5">{description}</p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss"
            className="text-muted-foreground hover:text-foreground focus-visible:outline-primary -me-1 -mt-1 rounded-md p-1 transition-colors focus-visible:outline-2"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {status === 'uploading' && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground tabular-nums">{percent}%</span>
            {primaryButtonText && (
              <button
                type="button"
                onClick={onPrimaryButtonClick}
                className="text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                {primaryButtonText}
              </button>
            )}
          </div>

          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label={title}
            className="bg-secondary h-1.5 w-full overflow-hidden rounded-full"
          >
            <span
              className={cn('block h-full origin-left rounded-full transition-transform duration-300', tone.bar)}
              style={{ transform: `scaleX(${percent / 100})` }}
            />
          </div>
        </div>
      )}

      {status !== 'uploading' && (primaryButtonText || secondaryButtonText) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {primaryButtonText && (
            <button
              type="button"
              onClick={onPrimaryButtonClick}
              className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-primary rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {primaryButtonText}
            </button>
          )}
          {secondaryButtonText && (
            <button
              type="button"
              onClick={onSecondaryButtonClick}
              className="text-muted-foreground hover:text-foreground focus-visible:outline-primary rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2"
            >
              {secondaryButtonText}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default UploadCard;
