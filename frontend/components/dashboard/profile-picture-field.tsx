'use client';

import { useRef, useState } from 'react';
import { Loader2, Trash2, Upload } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';
import { ApiError } from '@/services/api-client';
import { profileService } from '@/services/customer.service';
import { resolveImageUrl, uploadsService } from '@/services/uploads.service';
import { useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/avif,image/gif';

/**
 * The customer's own photograph.
 *
 * This was a text field asking for a path — `/images/…` — which asks somebody
 * to know where files live on a server they have never seen. Nobody was ever
 * going to fill it in, and anybody who did could point their avatar at any
 * address on the site.
 *
 * Now it is the file itself. The picture is saved as soon as it is chosen
 * rather than waiting for the form's Save button: an upload is its own action
 * with its own outcome, and a photograph that appeared to be set but vanished
 * because the name below it failed validation would be the worse surprise.
 */
export function ProfilePictureField({
  value,
  initials,
  onChange,
}: {
  value: string;
  /** Shown while there is no photograph — the same fallback the header uses. */
  initials: string;
  onChange: (next: string) => void;
}) {
  const { token, refresh } = useAuth();
  const { t } = useLocale();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const choose = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      notify.error(t.admin.notAnImage);
      return;
    }

    setBusy(true);
    try {
      const saved = await uploadsService.uploadProfilePicture(file, token);
      onChange(saved.profileImage ?? '');
      // The header's avatar reads the session, so it has to be told too.
      await refresh();
      notify.success(t.admin.pictureSaved);
    } catch (error) {
      notify.error(error instanceof ApiError ? error.message : t.admin.uploadFailed, {
        description: t.admin.pictureHint,
      });
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    try {
      await profileService.removePicture({ token });
      onChange('');
      await refresh();
      notify.success(t.admin.pictureRemoved);
    } catch (error) {
      notify.error(error instanceof ApiError ? error.message : t.common.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar className="size-16">
        {/*
          Resolved, not used as it stands. An uploaded file is served by the
          API — a different host in production — so `/uploads/…` against this
          site is a 404, and Radix hides a picture that fails to load. The
          photograph would simply never appear, with nothing to say why.
        */}
        {value && <AvatarImage src={resolveImageUrl(value)} alt="" />}
        <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-medium">{t.dashboard.profilePicture}</p>
        <p className="text-muted-foreground text-xs">{t.admin.pictureHint}</p>

        <input
          ref={input}
          type="file"
          accept={ACCEPTED}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void choose(file);
            event.target.value = '';
          }}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="size-4" aria-hidden="true" />
            )}
            {value ? t.admin.replace : t.admin.upload}
          </Button>

          {value && (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void clear()}>
              <Trash2 className="size-4" aria-hidden="true" />
              {t.admin.remove}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
