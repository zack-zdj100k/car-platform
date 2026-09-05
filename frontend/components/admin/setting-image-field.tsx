'use client';

import { useRef, useState } from 'react';
import { notify } from '@/lib/notify';
import { ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MediaImage } from '@/components/shared/media-image';
import { uploadsService } from '@/services/uploads.service';
import { ApiError } from '@/services/api-client';
import { useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';
import { cn } from '@/lib/utils';

/**
 * Image field for a setting whose value is an image path — the home page
 * feature photographs (spec §9).
 *
 * Uploads immediately and hands the resulting path back, so the administrator
 * never types a URL. An empty value means the bundled placeholder is used, and
 * clearing the field restores that.
 */
export function SettingImageField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  label: string;
}) {
  const { token } = useAuth();
  const { t, format } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify.error(t.admin.notAnImage);
      return;
    }

    setUploading(true);
    try {
      const result = await uploadsService.uploadImage(file, token);
      onChange(result.url);
      notify.success(format(t.admin.fieldUpdated, { label }));
    } catch (error) {
      notify.error(error instanceof ApiError ? error.message : t.admin.uploadFailed);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void upload(event.dataTransfer.files[0]);
      }}
      className={cn(
        'flex flex-wrap items-center gap-4 rounded-xl border p-3 transition-colors',
        dragging ? 'border-primary bg-primary/5' : 'border-border bg-secondary/20',
      )}
    >
      <div className="bg-secondary relative size-20 shrink-0 overflow-hidden rounded-lg">
        {value ? (
          <MediaImage src={value} alt={label} fill sizes="80px" className="object-cover" />
        ) : (
          <span className="text-muted-foreground grid h-full place-items-center">
            <ImagePlus className="size-5" aria-hidden="true" />
          </span>
        )}
      </div>

      <div className="min-w-40 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {value ? t.admin.customPhoto : t.admin.bundledPlaceholder}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="sr-only"
        onChange={(event) => {
          void upload(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="size-4" aria-hidden="true" />
          )}
          {value ? t.admin.replace : t.admin.upload}
        </Button>

        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={format(t.admin.removeField, { label })}
            onClick={() => onChange('')}
          >
            <Trash2 className="text-destructive size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
