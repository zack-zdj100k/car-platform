'use client';

import { MediaImage } from '@/components/shared/media-image';
import { useCallback, useId, useRef, useState } from 'react';
import { notify } from '@/lib/notify';
import { GripVertical, ImagePlus, Loader2, Star, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { uploadsService } from '@/services/uploads.service';
import { ApiError } from '@/services/api-client';
import { useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';
import { cn } from '@/lib/utils';
import type { ImageKind } from '@/types/api';

export interface CarImageDraft {
  kind: ImageKind;
  url: string;
  alt: string;
  /** Heading for an OTHER photograph, typed by the admin. */
  label?: string;
  /**
   * Position within its group. Set for 360° frames, where it *is* the angle —
   * frame 7 of 24 is 90°. Left unset for photographs, which are ordered by
   * their position in the list.
   */
  sortOrder?: number;
  /** Present only for files uploaded here, so they can be deleted again. */
  filename?: string;
  /**
   * The colour this photograph shows, by name. Absent for photographs of the
   * car in general — the main photo above all. See `ColourMedia` for why it is
   * a name and not an id.
   */
  colorName?: string;
}

/*
 * SPIN is absent deliberately. A 360° frame is never picked one at a time or
 * given a kind by hand — the whole set is uploaded together, by SpinUploader.
 * Offering it here would let somebody create a set of one frame.
 */
/*
 * The kinds a general photograph of the car may have.
 *
 * SPIN is absent because a 360° frame is never picked one at a time — the whole
 * set is uploaded together, by SpinUploader, and offering it here would let
 * somebody create a set of one frame. ENGINE, TRUNK and OTHER are absent
 * because they are always photographs *of a colour*, uploaded beside that
 * colour by ColourMedia.
 */
const KINDS = ['MAIN', 'GALLERY', 'EXTERIOR', 'INTERIOR', 'WHEEL'] as const;

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/avif,image/gif';

/**
 * Car photography upload (spec §47 Media).
 *
 * Real files are uploaded from the admin's computer — drag them in or pick
 * them. Each becomes a row with its own kind, alt text and position. The first
 * MAIN image is what the listing card and search results show.
 *
 * Alt text matters: it is what a screen-reader user hears in place of the
 * photograph, so it is a first-class field rather than an afterthought.
 */
export function ImageUploader({
  images,
  onChange,
}: {
  images: CarImageDraft[];
  onChange: (next: CarImageDraft[]) => void;
}) {
  const { token } = useAuth();
  const { t, format } = useLocale();
  const inputId = useId();

  /* The kinds, named in the administrator's language. */
  const kindLabel: Record<(typeof KINDS)[number], string> = {
    MAIN: t.admin.mainPhoto,
    GALLERY: t.admin.gallery,
    EXTERIOR: t.car.exterior,
    INTERIOR: t.car.interior,
    WHEEL: t.car.wheels,
  };
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [dragging, setDragging] = useState(false);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((file) => file.type.startsWith('image/'));
      if (list.length === 0) {
        notify.error(t.admin.notImages);
        return;
      }

      setUploading((count) => count + list.length);
      const uploaded: CarImageDraft[] = [];

      // Uploaded one at a time so a single rejected file does not discard the
      // rest, and the admin is told exactly which one failed.
      for (const file of list) {
        try {
          const result = await uploadsService.uploadImage(file, token);
          uploaded.push({
            // The first image added becomes the main photo automatically.
            kind: images.length === 0 && uploaded.length === 0 ? 'MAIN' : 'GALLERY',
            url: result.url,
            alt: '',
            filename: result.filename,
          });
        } catch (error) {
          notify.error(
            `${file.name}: ${error instanceof ApiError ? error.message : t.admin.couldNotUpload}`,
          );
        } finally {
          setUploading((count) => count - 1);
        }
      }

      if (uploaded.length > 0) {
        onChange([...images, ...uploaded]);
        notify.success(format(t.admin.uploadedCount, { count: uploaded.length }));
      }
    },
    [images, onChange, token, t, format],
  );

  const update = (index: number, patch: Partial<CarImageDraft>) => {
    onChange(images.map((image, i) => (i === index ? { ...image, ...patch } : image)));
  };

  const remove = (index: number) => {
    /*
     * Removed from the list, and that is all.
     *
     * This used to delete the file from the server at the same moment. The
     * photograph was then gone from disk while the vehicle's saved record still
     * pointed at it — so closing the page without saving, or a save that
     * failed, left a listing with broken pictures and no way back. Files are
     * reclaimed by the form once the save has succeeded and it knows which ones
     * are genuinely unreferenced.
     */
    onChange(images.filter((_, i) => i !== index));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  /** Exactly one image may be MAIN; promoting one demotes the previous. */
  const makeMain = (index: number) => {
    onChange(
      images.map((image, i) => ({
        ...image,
        kind: i === index ? 'MAIN' : image.kind === 'MAIN' ? 'GALLERY' : image.kind,
      })),
    );
  };

  const hasMain = images.some((image) => image.kind === 'MAIN');

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void uploadFiles(event.dataTransfer.files);
        }}
        className={cn(
          'rounded-xl border-2 border-dashed p-8 text-center transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-border bg-secondary/30',
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPTED}
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) void uploadFiles(event.target.files);
            event.target.value = '';
          }}
        />

        <span className="bg-primary/10 text-primary mx-auto grid size-12 place-items-center rounded-full">
          <ImagePlus className="size-6" aria-hidden="true" />
        </span>

        <p className="mt-3 text-sm font-medium">{t.admin.dropPhotos}</p>
        <p className="text-muted-foreground mt-1 text-xs">{t.admin.fileTypes}</p>

        <Button
          type="button"
          variant="outline"
          className="mt-4"
          disabled={uploading > 0}
          onClick={() => inputRef.current?.click()}
        >
          {uploading > 0 ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="size-4" aria-hidden="true" />
          )}
          {uploading > 0 ? format(t.admin.uploadingCount, { count: uploading }) : t.admin.choosePhotos}
        </Button>
      </div>

      {images.length > 0 && !hasMain && (
        <p className="border-warning/40 bg-warning/10 rounded-lg border p-3 text-xs">
          {t.admin.noMainPhoto}
        </p>
      )}

      {/* Uploaded images */}
      {images.length > 0 && (
        <ul className="space-y-3">
          {images.map((image, index) => (
            <li
              key={`${image.url}-${index}`}
              className="border-border bg-card flex flex-wrap items-start gap-4 rounded-xl border p-3"
            >
              <div className="bg-secondary relative size-24 shrink-0 overflow-hidden rounded-lg">
                <MediaImage
                  src={image.url}
                  alt={image.alt || t.admin.uploadedPhoto}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
                {image.kind === 'MAIN' && (
                  <Badge className="absolute start-1 top-1 gap-1 px-1.5 py-0 text-[10px]">
                    <Star className="size-2.5 fill-current" aria-hidden="true" />
                    {t.admin.main}
                  </Badge>
                )}
              </div>

              <div className="grid min-w-56 flex-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`${inputId}-kind-${index}`} className="text-xs">
                    {t.admin.photoType}
                  </Label>
                  <Select
                    value={image.kind}
                    onValueChange={(value) => update(index, { kind: value as ImageKind })}
                  >
                    <SelectTrigger id={`${inputId}-kind-${index}`} size="sm" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KINDS.map((kind) => (
                        <SelectItem key={kind} value={kind}>
                          {kindLabel[kind]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`${inputId}-alt-${index}`} className="text-xs">
                    {t.admin.altText}
                  </Label>
                  <Input
                    id={`${inputId}-alt-${index}`}
                    value={image.alt}
                    placeholder={t.admin.altPlaceholder}
                    onChange={(event) => update(index, { alt: event.target.value })}
                  />
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={t.admin.setMain}
                  title={t.admin.setMain}
                  disabled={image.kind === 'MAIN'}
                  onClick={() => makeMain(index)}
                >
                  <Star className={cn('size-4', image.kind === 'MAIN' && 'fill-current')} aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={t.admin.moveUp}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <GripVertical className="size-4 rotate-90" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={t.admin.removePhoto}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="text-destructive size-4" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
