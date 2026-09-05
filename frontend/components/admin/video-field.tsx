'use client';

import { useRef, useState } from 'react';
import { Film, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/services/api-client';
import { resolveImageUrl, uploadsService } from '@/services/uploads.service';
import { uploadToast, type UploadToastId } from '@/lib/upload-toast';
import { useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';

/**
 * The car's own video.
 *
 * This replaced a box for pasting a TikTok link. A link sent the customer to
 * TikTok — away from the car, the price and the order button, onto a feed built
 * to keep them there. An uploaded file plays on the vehicle's own page and on
 * the videos page, and belongs to the seller.
 *
 * The clip is uploaded as soon as it is chosen and shown back immediately, so
 * what the customer will see is what the administrator is looking at. It is
 * only attached to the car when the form is saved.
 */

const ACCEPTED = 'video/mp4,video/quicktime,video/webm';

export function VideoField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const { token } = useAuth();
  const { t, format } = useLocale();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    const megabytes = (file.size / (1024 * 1024)).toFixed(1);
    let card: UploadToastId | undefined;

    try {
      const result = await uploadsService.uploadVideo(file, token, (percent) => {
        card = uploadToast.progress(
          {
            title: t.admin.videoUploading,
            description: format(t.admin.videoProgress, { name: file.name, size: megabytes }),
            progress: percent,
          },
          card,
        );
      });

      onChange(result.url);
      uploadToast.success(
        {
          title: t.admin.videoUploaded,
          description: format(t.admin.videoAttached, {
            size: (result.sizeBytes / (1024 * 1024)).toFixed(1),
          }),
          primaryText: t.common.done,
        },
        card,
      );
    } catch (error) {
      uploadToast.error(
        {
          title: t.admin.videoFailed,
          description: error instanceof ApiError ? error.message : t.admin.videoNotUploaded,
          primaryText: t.common.retry,
          onPrimary: () => input.current?.click(),
          secondaryText: t.common.cancel,
        },
        card,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="car-video">{t.admin.video}</Label>

      <input
        ref={input}
        id="car-video"
        type="file"
        accept={ACCEPTED}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.target.value = '';
        }}
      />

      {value ? (
        <div className="border-border overflow-hidden rounded-xl border">
          <video
            src={resolveImageUrl(value)}
            controls
            playsInline
            preload="metadata"
            className="aspect-16/10 w-full bg-black"
          />
          <div className="flex flex-wrap gap-2 p-2.5">
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
              <Upload className="size-4" aria-hidden="true" />
              {t.admin.replace}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange('')}>
              <Trash2 className="size-4" aria-hidden="true" />
              {t.admin.remove}
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-border rounded-xl border border-dashed p-5 text-center">
          <Film className="text-primary mx-auto size-6" aria-hidden="true" />
          <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-xs">
            {t.admin.videoHint}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {t.admin.uploading}
              </>
            ) : (
              <>
                <Upload className="size-4" aria-hidden="true" />
                {t.admin.chooseVideo}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
