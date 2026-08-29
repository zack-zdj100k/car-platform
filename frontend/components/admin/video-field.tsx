'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Film, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/services/api-client';
import { resolveImageUrl, uploadsService } from '@/services/uploads.service';
import { useAuth } from '@/providers/auth-provider';

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
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const result = await uploadsService.uploadVideo(file, token);
      onChange(result.url);
      toast.success(`Video uploaded — ${(result.sizeBytes / (1024 * 1024)).toFixed(1)} MB`);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'That video could not be uploaded.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="car-video">Video</Label>

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
              Replace
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange('')}>
              <Trash2 className="size-4" aria-hidden="true" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-border rounded-xl border border-dashed p-5 text-center">
          <Film className="text-primary mx-auto size-6" aria-hidden="true" />
          <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-xs">
            MP4, MOV or WebM, up to 80 MB. It plays on the car&rsquo;s page and puts the car on the
            Videos page with a &ldquo;watch video&rdquo; button on its card. Leave it empty and none
            of that appears.
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
                Uploading…
              </>
            ) : (
              <>
                <Upload className="size-4" aria-hidden="true" />
                Choose a video
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
