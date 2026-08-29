'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Armchair, Car, CircleDot, Cog, Loader2, PackageOpen, Plus, Trash2, Upload } from 'lucide-react';
import { MediaImage } from '@/components/shared/media-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { uploadsService } from '@/services/uploads.service';
import { ApiError } from '@/services/api-client';
import { useAuth } from '@/providers/auth-provider';
import type { CarImageDraft } from './image-uploader';

/**
 * The photographs of one colour: outside, inside, wheels.
 *
 * A colour used to be a swatch and a single picture, which meant a customer who
 * chose Basalt Grey saw one grey photograph and then the interior and wheels of
 * whichever colour happened to be photographed first. Every colour now carries
 * its own three sets, and choosing a colour shows that colour throughout.
 *
 * The photographs are tied to the colour by its **name**, not by an id. Saving
 * a car replaces its colours, so every id changes on every save — a photograph
 * holding an id would come back attached to nothing. The name is the colour's
 * natural key, and the backend re-attaches by name after the colours are
 * written. The consequence worth knowing: renaming a colour and saving detaches
 * its photographs, which is why the field says so.
 */

/**
 * The five parts of a car every listing wants, in the order a buyer asks about
 * them. `slot` distinguishes the two free groups, which share the OTHER kind
 * and are told apart by the heading the admin types.
 */
const GROUPS = [
  { key: 'EXTERIOR', kind: 'EXTERIOR' as const, label: 'Outside', icon: Car },
  { key: 'INTERIOR', kind: 'INTERIOR' as const, label: 'Inside', icon: Armchair },
  { key: 'WHEEL', kind: 'WHEEL' as const, label: 'Wheels', icon: CircleDot },
  { key: 'ENGINE', kind: 'ENGINE' as const, label: 'Engine', icon: Cog },
  { key: 'TRUNK', kind: 'TRUNK' as const, label: 'Boot', icon: PackageOpen },
];

/**
 * Two groups with nothing decided about them.
 *
 * For whatever this particular car needs and no fixed group covers — a scratch
 * on the rear bumper, the roof rails, the spare wheel. The admin types the
 * heading, and it is stored with the photographs and shown to the customer, so
 * "OTHER" is never what anybody actually reads.
 */
const FREE_SLOTS = ['free-1', 'free-2'] as const;

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/avif';

export function ColourMedia({
  colourName,
  images,
  onChange,
}: {
  colourName: string;
  /** Every image on the car; this component only touches its own colour's. */
  images: CarImageDraft[];
  onChange: (next: CarImageDraft[]) => void;
}) {
  const { token } = useAuth();
  const groupId = useId();
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const trimmed = colourName.trim();

  const mine = (kind: string) =>
    images.filter((image) => image.colorName === trimmed && image.kind === kind);

  /*
   * The two free groups are both OTHER, so they are separated by `sortOrder`:
   * 0 for the first, 1 for the second. Anything else would need a second enum
   * value per slot, which is a schema change for a label.
   */
  const freeSlotImages = (slot: number) =>
    images.filter(
      (image) =>
        image.colorName === trimmed && image.kind === 'OTHER' && (image.sortOrder ?? 0) === slot,
    );

  const freeSlotLabel = (slot: number) => freeSlotImages(slot)[0]?.label ?? '';

  const renameFreeSlot = (slot: number, label: string) => {
    onChange(
      images.map((image) =>
        image.colorName === trimmed && image.kind === 'OTHER' && (image.sortOrder ?? 0) === slot
          ? { ...image, label }
          : image,
      ),
    );
  };

  const upload = useCallback(
    async (
      kind: 'EXTERIOR' | 'INTERIOR' | 'WHEEL' | 'ENGINE' | 'TRUNK' | 'OTHER',
      files: FileList,
      free?: { slot: number; label: string },
    ) => {
      if (!trimmed) {
        toast.error('Give the colour a name first — the photographs are filed under it.');
        return;
      }

      const list = Array.from(files).filter((file) => file.type.startsWith('image/'));
      if (list.length === 0) return;

      setBusy(free ? `OTHER-${free.slot}` : kind);

      // One request for the batch, rather than one per photograph in turn.
      try {
        const results = await uploadsService.uploadImages(list, token);
        const uploaded: CarImageDraft[] = results.map((result) => ({
          kind,
          url: result.url,
          alt: `${trimmed} — ${free?.label || kind.toLowerCase()}`,
          filename: result.filename,
          colorName: trimmed,
          ...(free ? { sortOrder: free.slot, label: free.label } : {}),
        }));

        onChange([...images, ...uploaded]);
        toast.success(`${uploaded.length} added to ${trimmed}`);
      } catch (error) {
        toast.error(
          error instanceof ApiError ? error.message : 'Those photographs could not be uploaded.',
        );
      } finally {
        setBusy(null);
      }
    },
    [images, onChange, token, trimmed],
  );

  // Removed from the list only; the file is reclaimed after a successful save.
  const remove = (image: CarImageDraft) => {
    onChange(images.filter((entry) => entry !== image));
  };

  /*
   * One list of panels, fixed and free together, so the layout and the upload
   * behaviour are written once. A free panel differs only in carrying a name
   * the admin can type and a slot number to tell the two of them apart.
   */
  const panels = [
    ...GROUPS.map((group) => ({
      id: group.key,
      kind: group.kind,
      icon: group.icon,
      heading: group.label,
      free: undefined as { slot: number; label: string } | undefined,
      owned: mine(group.kind),
    })),
    ...FREE_SLOTS.map((id, slot) => ({
      id,
      kind: 'OTHER' as const,
      icon: Plus,
      heading: freeSlotLabel(slot) || `Anything else ${slot + 1}`,
      free: { slot, label: freeSlotLabel(slot) },
      owned: freeSlotImages(slot),
    })),
  ];

  return (
    <div className="w-full space-y-3">
      <p className="text-muted-foreground text-xs">
        Photographs of this colour. A customer who picks it sees these instead of another
        colour&apos;s. Filed under the colour&apos;s name, so renaming it here and saving will
        detach them.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {panels.map(({ id, kind, icon: Icon, heading, free, owned }) => {
          const inputKey = `${groupId}-${id}`;
          const busyKey = free ? `OTHER-${free.slot}` : kind;

          return (
            <div key={id} className="border-border/70 space-y-2 rounded-lg border p-2.5">
              <div className="flex items-center justify-between gap-2">
                {free ? (
                  /* The heading is the field: type what this group is. */
                  <Input
                    value={free.label}
                    placeholder={`Anything else ${free.slot + 1}`}
                    aria-label={`Name for extra photograph group ${free.slot + 1} of ${trimmed || 'this colour'}`}
                    onChange={(event) => renameFreeSlot(free.slot, event.target.value)}
                    disabled={owned.length === 0}
                    className="h-7 text-xs"
                  />
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    <Icon className="text-primary size-3.5" aria-hidden="true" />
                    {heading}
                    {owned.length > 0 && (
                      <span className="text-muted-foreground tabular-nums">({owned.length})</span>
                    )}
                  </span>
                )}

                <input
                  ref={(element) => {
                    inputs.current[inputKey] = element;
                  }}
                  id={inputKey}
                  type="file"
                  multiple
                  accept={ACCEPTED}
                  className="sr-only"
                  onChange={(event) => {
                    if (event.target.files) {
                      void upload(
                        kind,
                        event.target.files,
                        free ? { slot: free.slot, label: free.label } : undefined,
                      );
                    }
                    event.target.value = '';
                  }}
                />

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7 shrink-0"
                  aria-label={`Add ${heading.toLowerCase()} photographs for ${trimmed || 'this colour'}`}
                  disabled={busy !== null}
                  onClick={() => inputs.current[inputKey]?.click()}
                >
                  {busy === busyKey ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Upload className="size-3.5" aria-hidden="true" />
                  )}
                </Button>
              </div>

              {owned.length === 0 ? (
                <p className="text-muted-foreground py-2 text-center text-[11px]">
                  {free ? 'Empty — upload something and name it' : 'None yet'}
                </p>
              ) : (
                <ul className="grid grid-cols-3 gap-1.5">
                  {owned.map((image, index) => (
                    <li
                      key={`${image.url}-${index}`}
                      className="bg-secondary group relative aspect-square overflow-hidden rounded-md"
                    >
                      <MediaImage src={image.url} alt="" fill sizes="60px" className="object-cover" />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        aria-label={`Remove this ${heading.toLowerCase()} photograph`}
                        onClick={() => remove(image)}
                        className="absolute end-0.5 top-0.5 size-5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <Trash2 className="size-3" aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
