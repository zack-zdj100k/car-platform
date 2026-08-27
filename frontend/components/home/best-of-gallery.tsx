'use client';

import { Section, SectionHeading } from '@/components/shared/section';
import { ElasticGallery, type ElasticItem } from '@/components/ui/elastic-gallery';
import { useLocale } from '@/providers/locale-provider';

export interface BestOfEntry {
  image: string;
  caption: string;
}

/**
 * "The best of our cars" — the curated gallery above the feature diagram.
 *
 * Curated rather than computed: the photographs and their captions come from
 * settings an administrator uploads, so this section shows the cars you want
 * shown, in the order you want them, instead of whatever the catalogue happens
 * to sort first. Empty slots are skipped, and with none filled the section does
 * not render at all — an empty gallery is worse than no gallery.
 *
 * Panels expand as you point at them, or when focus lands on one from the
 * keyboard.
 */
export function BestOfGallery({ entries }: { entries: BestOfEntry[] }) {
  const { t } = useLocale();

  const items: ElasticItem[] = entries
    .filter((entry) => entry.image)
    .map((entry, index) => ({
      id: String(index + 1).padStart(2, '0'),
      title: entry.caption || t.home.bestFallbackCaption,
      category: t.home.bestEyebrow,
      src: entry.image,
      alt: entry.caption || t.home.bestFallbackCaption,
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

      <ElasticGallery className="mt-12" items={items} actionLabel={t.home.viewAllCars} />
    </Section>
  );
}
