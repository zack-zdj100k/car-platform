'use client';

import { toast } from 'sonner';
import { UploadCard, type UploadStatus } from '@/components/ui/upload-card';

/**
 * Upload and save messages, shown as the upload card.
 *
 * Rendered through the toaster the site already has rather than placed on each
 * page: the card then appears in the same corner everywhere, stacks when two
 * things finish at once, and every call site keeps the one-line shape it had.
 *
 * A card that is still uploading does not dismiss itself — a progress bar that
 * vanishes at four seconds while the file is still going is worse than none.
 * It is replaced in place when the upload finishes, so the reader watches one
 * card change rather than three appear.
 */

interface Common {
  title: string;
  description: string;
  onClose?: () => void;
}

interface Progressing extends Common {
  /** 0–100. */
  progress: number;
  cancelText?: string;
  onCancel?: () => void;
}

interface Finished extends Common {
  primaryText?: string;
  onPrimary?: () => void;
  secondaryText?: string;
  onSecondary?: () => void;
}

/** Sonner's own id type, kept opaque so callers just pass it back. */
export type UploadToastId = string | number;

function show(
  status: UploadStatus,
  options: Progressing | Finished,
  id?: UploadToastId,
  duration?: number,
): UploadToastId {
  const progressing = status === 'uploading' ? (options as Progressing) : undefined;
  const finished = status !== 'uploading' ? (options as Finished) : undefined;

  return toast.custom(
    (toastId) => (
      <UploadCard
        status={status}
        progress={progressing?.progress}
        title={options.title}
        description={options.description}
        primaryButtonText={progressing?.cancelText ?? finished?.primaryText}
        onPrimaryButtonClick={() => {
          progressing?.onCancel?.();
          finished?.onPrimary?.();
          if (progressing?.onCancel || finished?.onPrimary) toast.dismiss(toastId);
        }}
        secondaryButtonText={finished?.secondaryText}
        onSecondaryButtonClick={() => {
          finished?.onSecondary?.();
          toast.dismiss(toastId);
        }}
        onClose={() => {
          options.onClose?.();
          toast.dismiss(toastId);
        }}
      />
    ),
    { id, duration },
  );
}

export const uploadToast = {
  /**
   * Opens, or updates, the card for something in progress.
   *
   * Pass the id back on each call and one card counts upwards; leave it out and
   * a new one appears.
   */
  progress(options: Progressing, id?: UploadToastId): UploadToastId {
    // Infinity: it stays until the upload it describes has actually finished.
    return show('uploading', options, id, Number.POSITIVE_INFINITY);
  },

  success(options: Finished, id?: UploadToastId): UploadToastId {
    return show('success', options, id, 5000);
  },

  /** Failures stay longer: there is usually something to read or retry. */
  error(options: Finished, id?: UploadToastId): UploadToastId {
    return show('error', options, id, 10000);
  },

  dismiss(id: UploadToastId): void {
    toast.dismiss(id);
  },
};
