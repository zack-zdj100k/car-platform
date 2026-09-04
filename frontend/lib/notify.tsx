'use client';

import { toast } from 'sonner';
import { UploadCard, type UploadStatus } from '@/components/ui/upload-card';

/**
 * Every message the site shows, in one shape.
 *
 * There were two kinds before: uploads used the card, and everything else — a
 * saved vehicle, a cancelled appointment, a failed request — used the toaster's
 * own plain line. Two visual languages for the same job, and the plain one had
 * no room to say what actually happened: "Save" as the entire message after
 * saving a car tells the reader nothing they did not already know.
 *
 * So the card is the only one now. A title says what happened, and the optional
 * second line says what it means — which vehicle, which colour, why it failed.
 *
 * `notify.error` is announced as an alert and stays longer, because a failure
 * usually has something to read and something to do; the rest are polite
 * status messages that clear themselves.
 */

interface Options {
  /** What it means: the vehicle, the reason, the next step. */
  description?: string;
  /** A label for the acknowledgement button. Omitted, there is none. */
  actionText?: string;
  onAction?: () => void;
}

const DURATION: Record<UploadStatus, number> = {
  uploading: Number.POSITIVE_INFINITY,
  success: 5000,
  error: 10_000,
};

function show(status: UploadStatus, title: string, options: Options = {}): string | number {
  return toast.custom(
    (id) => (
      <UploadCard
        status={status}
        title={title}
        description={options.description ?? ''}
        primaryButtonText={options.actionText}
        onPrimaryButtonClick={() => {
          options.onAction?.();
          toast.dismiss(id);
        }}
        onClose={() => toast.dismiss(id)}
      />
    ),
    { duration: DURATION[status] },
  );
}

export const notify = {
  success(title: string, options?: Options) {
    return show('success', title, options);
  },
  error(title: string, options?: Options) {
    return show('error', title, options);
  },
  /**
   * For something in progress that is not a file — a save that takes a moment.
   * It does not clear itself, so the caller dismisses it.
   */
  working(title: string, options?: Options) {
    return show('uploading', title, options);
  },
  dismiss(id: string | number) {
    toast.dismiss(id);
  },
};
