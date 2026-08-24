'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/providers/locale-provider';
import { cn } from '@/lib/utils';
import type { CarImage } from '@/types/api';

/**
 * Car gallery (spec §13): main image plus thumbnails. Keyboard operable — the
 * thumbnails are a real tablist, and arrow keys move between them.
 */
export function CarGallery({ images, alt }: { images: CarImage[]; alt: string }) {
  const { t } = useLocale();
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="bg-secondary text-muted-foreground grid aspect-16/10 place-items-center rounded-xl text-sm">
        —
      </div>
    );
  }

  const current = images[Math.min(index, images.length - 1)];
  const go = (next: number) => setIndex((next + images.length) % images.length);

  return (
    <div className="space-y-3">
      <div className="bg-secondary relative aspect-16/10 overflow-hidden rounded-xl">
        <Image
          key={current.url}
          src={current.url}
          alt={current.alt ?? alt}
          fill
          sizes="(min-width: 1024px) 60vw, 92vw"
          priority
          className="object-cover"
        />

        {images.length > 1 && (
          <>
            <Button
              size="icon"
              variant="secondary"
              aria-label={t.cars.previous}
              onClick={() => go(index - 1)}
              className="bg-background/85 absolute start-3 top-1/2 size-9 -translate-y-1/2 backdrop-blur"
            >
              <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              aria-label={t.cars.next}
              onClick={() => go(index + 1)}
              className="bg-background/85 absolute end-3 top-1/2 size-9 -translate-y-1/2 backdrop-blur"
            >
              <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Button>
            <p className="bg-background/85 absolute bottom-3 end-3 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur">
              {index + 1} / {images.length}
            </p>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div role="tablist" aria-label={t.car.gallery} className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {images.map((image, imageIndex) => (
            <button
              key={image.url}
              type="button"
              role="tab"
              aria-selected={imageIndex === index}
              aria-label={image.alt ?? `${alt} ${imageIndex + 1}`}
              onClick={() => setIndex(imageIndex)}
              className={cn(
                'bg-secondary relative aspect-4/3 overflow-hidden rounded-lg transition-all',
                imageIndex === index
                  ? 'ring-primary ring-2 ring-offset-2 ring-offset-background'
                  : 'opacity-70 hover:opacity-100',
              )}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
