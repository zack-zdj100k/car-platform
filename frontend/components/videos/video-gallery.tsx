'use client';

import { Section, SectionHeading } from '@/components/shared/section';
import { EmptyState } from '@/components/shared/states';
import { InteractiveBentoGallery, type BentoItem } from '@/components/ui/interactive-bento-gallery';
import { useLocale } from '@/providers/locale-provider';
import type { CarListItem } from '@/types/api';

/**
 * The videos page: every vehicle that has been filmed, one tile each.
 *
 * The tiles are upright, the shape a phone films in. They carry the car's own
 * photograph rather than a still pulled from TikTok — we have the photograph,
 * and scraping frames from someone else's player would be both fragile and
 * theirs. Opening a tile offers the clip and the vehicle's page.
 */
export function VideoGallery({ cars }: { cars: CarListItem[] }) {
  const { t } = useLocale();

  const items: BentoItem[] = cars.map((car) => ({
    id: car.id,
    anchor: car.slug,
    title: `${car.brand.name} ${car.model}`,
    description: [car.year, car.trim].filter(Boolean).join(' · '),
    image: car.images[0]?.url,
    href: `/car/${car.slug}`,
    videoUrl: car.tiktokUrl ?? undefined,
  }));

  return (
    <Section id="videos">
      <SectionHeading
        eyebrow={t.videos.eyebrow}
        title={t.videos.title}
        body={t.videos.body}
        align="center"
      />

      {items.length > 0 ? (
        <InteractiveBentoGallery
          className="mt-12"
          ratio="portrait"
          items={items}
          labels={{
            watch: t.car.tiktokTitle,
            view: t.videos.viewCar,
            noImage: t.videos.noImage,
          }}
        />
      ) : (
        <div className="mt-12">
          <EmptyState
            title={t.videos.emptyTitle}
            body={t.videos.emptyBody}
            actionLabel={t.home.viewAllCars}
            actionHref="/cars"
          />
        </div>
      )}
    </Section>
  );
}
