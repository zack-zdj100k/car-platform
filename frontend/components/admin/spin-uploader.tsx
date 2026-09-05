'use client';

import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { notify } from '@/lib/notify';
import { Check, Loader2, Rotate3d, Trash2, Upload } from 'lucide-react';
import { MediaImage } from '@/components/shared/media-image';
import { Button } from '@/components/ui/button';
import { uploadsService } from '@/services/uploads.service';
import { uploadToast, type UploadToastId } from '@/lib/upload-toast';
import { ApiError } from '@/services/api-client';
import { useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';
import { SPIN_MINIMUM, SPIN_PLAN, spinPlan } from '@/lib/spin-plan';
import { cn } from '@/lib/utils';
import type { CarImageDraft } from './image-uploader';

/**
 * The 360° set: twenty-four numbered positions, each with its own slot.
 *
 * This began as one button that took twenty-four files at once and trusted
 * their names for the order. That works for somebody who already knows the
 * plan, and is unhelpful for everybody else: nothing tells you which angle is
 * missing, nothing tells you whether the third photograph belongs at 30° or
 * 45°, and a set uploaded slightly out of order looks like a car juddering.
 *
 * So the plan itself is the interface. Every slot says where to stand and what
 * should be in the frame, shows a thumbnail once filled, and stores the
 * photograph at that slot's position — so the slot a photograph goes into *is*
 * the angle it was taken from. The bulk button remains for a whole set at once;
 * it fills the slots in order.
 *
 * A partial set still works. Twelve photographs every 30° is a coarser turn,
 * not a broken one, and the viewer shows whatever is there.
 */

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/avif';

/** Sorts file names the way a person reads them: `frame-9` before `frame-10`. */
function byNumberInName(a: File, b: File): number {
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
}

export function SpinUploader({
  frames,
  onChange,
}: {
  frames: CarImageDraft[];
  onChange: (next: CarImageDraft[]) => void;
}) {
  const { token } = useAuth();
  const { t, locale, format } = useLocale();
  /* Where to stand, in the administrator's language. The list is the same
     length in all three — only the wording changes. */
  const plan = useMemo(() => spinPlan(locale), [locale]);
  const fieldId = useId();
  const slotInputs = useRef<Record<number, HTMLInputElement | null>>({});
  const bulkInput = useRef<HTMLInputElement | null>(null);
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);

  const at = (index: number) => frames.find((frame) => (frame.sortOrder ?? 0) === index);
  const filled = plan.filter((slot) => at(slot.index)).length;

  /** Puts one photograph in one slot, replacing whatever was there. */
  const uploadToSlot = useCallback(
    async (index: number, file: File) => {
      setBusySlot(index);
      try {
        const result = await uploadsService.uploadImage(file, token);
        const previous = frames.find((frame) => (frame.sortOrder ?? 0) === index);

        onChange([
          ...frames.filter((frame) => (frame.sortOrder ?? 0) !== index),
          {
            kind: 'SPIN',
            url: result.url,
            alt: '',
            filename: result.filename,
            sortOrder: index,
          },
        ]);

        void previous; // Reclaimed by the form after the save, not here.
      } catch (error) {
        uploadToast.error({
          title: format(t.admin.spinFrameFailed, { number: index + 1 }),
          description:
            error instanceof ApiError
              ? error.message
              : format(t.admin.spinFileFailed, { name: file.name }),
          primaryText: t.common.retry,
          onPrimary: () => slotInputs.current[index]?.click(),
        });
      } finally {
        setBusySlot(null);
      }
    },
    [frames, onChange, token, t, format],
  );

  /** A whole set at once, in file-name order, filling slot 1 upwards. */
  const uploadSet = useCallback(
    async (fileList: FileList) => {
      const files = Array.from(fileList)
        .filter((file) => file.type.startsWith('image/'))
        .sort(byNumberInName)
        .slice(0, SPIN_PLAN.length);

      if (files.length === 0) {
        notify.error(t.admin.notImages);
        return;
      }

      setBulk({ done: 0, total: files.length });

      /*
       * All-or-nothing on purpose: a set with holes in it is worse than no set,
       * because the car jumps at every missing angle.
       */
      let card: UploadToastId | undefined;
      try {
        const results = await uploadsService.uploadImages(files, token, (done, total) => {
          setBulk({ done, total });
          card = uploadToast.progress(
            {
              title: t.admin.spinUploading,
              description: format(t.admin.spinProgress, { done, total }),
              progress: (done / total) * 100,
            },
            card,
          );
        });

        onChange(
          results.map((result, index) => ({
            kind: 'SPIN' as const,
            url: result.url,
            alt: '',
            filename: result.filename,
            sortOrder: index,
          })),
        );

        uploadToast.success(
          {
            title: t.admin.spinUploaded,
            description: format(t.admin.spinInOrder, { count: results.length }),
            primaryText: t.common.done,
          },
          card,
        );
      } catch (error) {
        uploadToast.error(
          {
            title: t.admin.spinFailed,
            description:
              error instanceof ApiError
                ? `${error.message} ${t.admin.spinUntouched}`
                : t.admin.spinUnchanged,
            primaryText: t.common.retry,
            onPrimary: () => bulkInput.current?.click(),
            secondaryText: t.common.cancel,
          },
          card,
        );
      } finally {
        setBulk(null);
      }
    },
    // `frames` is no longer read here: a batch replaces the set outright.
    [onChange, token, t, format],
  );

  // Both only edit the list. Files are reclaimed by the form after a save.
  const clearSlot = (index: number) => {
    onChange(frames.filter((frame) => (frame.sortOrder ?? 0) !== index));
  };

  const clearAll = () => {
    onChange([]);
    uploadToast.success({ title: t.admin.spinRemoved, description: t.admin.spinSaveToConfirm });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Rotate3d className="text-primary size-4" aria-hidden="true" />
          <span>{format(t.admin.spinPositionsFilled, { filled, total: plan.length })}</span>
          {filled > 0 && filled < SPIN_MINIMUM && (
            <span className="text-muted-foreground text-xs font-normal">
              {format(t.admin.spinMinimum, { minimum: SPIN_MINIMUM })}
            </span>
          )}
        </p>

        <div className="flex gap-2">
          <input
            ref={bulkInput}
            id={`${fieldId}-bulk`}
            // Named so a test can hand it files: the ids here are generated.
            data-testid="spin-bulk-input"
            type="file"
            multiple
            accept={ACCEPTED}
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) void uploadSet(event.target.files);
              event.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={bulk !== null || busySlot !== null}
            onClick={() => bulkInput.current?.click()}
          >
            {bulk ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {bulk.done} of {bulk.total}
              </>
            ) : (
              <>
                <Upload className="size-4" aria-hidden="true" />
                {t.admin.spinAllAtOnce}
              </>
            )}
          </Button>

          {filled > 0 && bulk === null && (
            <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
              <Trash2 className="size-4" aria-hidden="true" />
              {t.admin.spinClear}
            </Button>
          )}
        </div>
      </div>

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {plan.map((slot) => {
          const image = at(slot.index);
          const inputId = `${fieldId}-slot-${slot.index}`;

          return (
            <li
              key={slot.index}
              className={cn(
                'border-border/70 space-y-1.5 rounded-lg border p-2',
                image && 'border-primary/40 bg-accent/40',
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold tabular-nums">
                  {String(slot.index + 1).padStart(2, '0')} · {slot.angle}°
                </span>
                {image ? (
                  <Check className="text-primary size-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <span className="text-muted-foreground text-[10px]">{t.admin.spinEmpty}</span>
                )}
              </div>

              <button
                type="button"
                disabled={bulk !== null}
                onClick={() => slotInputs.current[slot.index]?.click()}
                aria-label={`${format(t.admin.spinSlotLabel, {
                  number: slot.index + 1,
                  angle: slot.angle,
                  position: slot.position,
                  sees: slot.sees,
                })}${image ? ` ${t.admin.spinFilled}` : ''}`}
                className="bg-secondary focus-visible:outline-primary relative block aspect-4/3 w-full overflow-hidden rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {image ? (
                  <MediaImage src={image.url} alt="" fill sizes="140px" className="object-cover" />
                ) : busySlot === slot.index ? (
                  <Loader2
                    className="text-muted-foreground absolute inset-0 m-auto size-5 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Upload
                    className="text-muted-foreground absolute inset-0 m-auto size-4"
                    aria-hidden="true"
                  />
                )}
              </button>

              <input
                ref={(element) => {
                  slotInputs.current[slot.index] = element;
                }}
                id={inputId}
                type="file"
                accept={ACCEPTED}
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadToSlot(slot.index, file);
                  event.target.value = '';
                }}
              />

              {/* Where to stand and what should be in the frame. */}
              <p className="text-[10px] leading-snug font-medium">{slot.position}</p>
              <p className="text-muted-foreground text-[10px] leading-snug">{slot.sees}</p>

              {image && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-full text-[10px]"
                  onClick={() => clearSlot(slot.index)}
                >
                  {t.admin.remove}
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
