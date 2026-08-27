'use client';

import { Section, SectionHeading } from '@/components/shared/section';
import { InteractiveBentoGallery, type BentoItem } from '@/components/ui/interactive-bento-gallery';
import { useLocale } from '@/providers/locale-provider';

export interface BestOfEntry {
  image: string;
  caption: string;
}

/**
 * "The best of our cars" — a curated gallery above the feature diagram.
 *
 * Curated rather than computed: the six photographs and their captions come
 * from settings an administrator uploads, so this section shows the cars you
 * want shown, in the order you want them, instead of whatever the catalogue
 * happens to sort first. Empty slots are skipped, and with none filled the
 * section does not render at all — an empty gallery is worse than no gallery.
 *
 * The tile footprints alternate deliberately: two wide, four square, which
 * fills the bento grid without leaving holes at any breakpoint.
 */
const SPANS = [
  'col-span-2 row-span-2',
  '',
  '',
  'col-span-2',
  '',
  '',
] as const;

export function BestOfGallery({ entries }: { entries: BestOfEntry[] }) {
  const { t } = useLocale();

  const items: BentoItem[] = entries
    .filter((entry) => entry.image)
    .map((entry, index) => ({
      id: `best-${index}`,
      title: entry.caption || t.home.bestFallbackCaption,
      image: entry.image,
      span: SPANS[index % SPANS.length],
      href: '/cars',
    }));

  if (items.length === 0) return null;

  return (
    <Section id="best-of" tone="muted">
      <SectionHeading
        eyebrow={t.home.bestEyebrow}
        title={t.home.bestTitle}
        body={t.home.bestBody}
        align="center"
      />

      <InteractiveBentoGallery
        className="mt-12"
        items={items}
        labels={{
          watch: t.car.tiktokTitle,
          view: t.home.viewAllCars,
          noImage: t.videos.noImage,
        }}
      />
    </Section>
  );
}
