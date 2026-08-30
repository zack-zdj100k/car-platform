'use client';

import { CircleDot, Disc3, Gauge, Palette, Shield, Sofa } from 'lucide-react';
import { Section, SectionHeading } from '@/components/shared/section';
import { RadialOrbitalTimeline, type OrbitalItem } from '@/components/ui/radial-orbital-timeline';
import { useLocale } from '@/providers/locale-provider';

export type HomeImageKey = 'safety' | 'engine' | 'wheels' | 'tyres' | 'exterior' | 'interior';

/**
 * Home features, drawn as an orbit around the car (spec §9).
 *
 * Every specification group the platform documents rides a ring around one
 * vehicle. Opening a group shows its picture and its text, and draws the links
 * to the groups it depends on — tyres to wheels, engine to safety.
 *
 * Pictures come from the settings the administrator edits, so a real photograph
 * of a cabin or a wheel replaces the catalogue placeholder without a deploy.
 */
/*
 * Shown when a group has no picture, no catalogue photograph to borrow and no
 * vehicle to take one from — a new site, in other words, before anything has
 * been uploaded. Bundled with the site, so it always resolves.
 */
const BLANK = '/images/spin/_placeholder/frame-01.svg';

export function CarOrbit({
  slug,
  images,
  fallbackImages = [],
}: {
  /**
   * A vehicle to borrow a photograph from. Optional: this section is about the
   * specification groups, not about one car, and it used to disappear entirely
   * when no vehicle was marked as featured — taking six uploaded photographs
   * with it, with nothing to say why.
   */
  slug?: string;
  images: Partial<Record<HomeImageKey, string>>;
  /** Catalogue photographs, used for any group without a picture of its own. */
  fallbackImages?: string[];
}) {
  const { t } = useLocale();

  /*
   * Selecting a point should always show something. Until an administrator
   * uploads a picture for a group, a photograph from the catalogue stands in —
   * a different one per group, so the ring does not repeat the same frame six
   * times.
   */
  const picture = (own: string | undefined, index: number) =>
    own ||
    fallbackImages[index % Math.max(fallbackImages.length, 1)] ||
    (slug ? `/images/cars/${slug}/main.svg` : BLANK);

  const items: OrbitalItem[] = [
    {
      id: 1,
      title: t.features.safetyTitle,
      content: t.features.safetyBody,
      badge: t.features.safetyTag,
      icon: Shield,
      image: picture(images.safety, 0),
      relatedIds: [2, 4],
      energy: 100,
    },
    {
      id: 2,
      title: t.features.engineTitle,
      content: t.features.engineBody,
      badge: t.features.engineTag,
      icon: Gauge,
      image: picture(images.engine, 1),
      relatedIds: [1, 3],
      energy: 92,
    },
    {
      id: 3,
      title: t.features.wheelsTitle,
      content: t.features.wheelsBody,
      badge: t.features.wheelsTag,
      icon: Disc3,
      image: picture(images.wheels, 2),
      tags: [t.features.wheelsStandard, t.features.wheelsSport],
      relatedIds: [2, 4],
      energy: 78,
    },
    {
      id: 4,
      title: t.features.tyresTitle,
      content: t.features.tyresBody,
      badge: t.features.tyresTag,
      icon: CircleDot,
      image: picture(images.tyres, 3),
      tags: [t.features.tyres14, t.features.tyres16],
      relatedIds: [3, 1],
      energy: 70,
    },
    {
      id: 5,
      title: t.features.exteriorTitle,
      content: t.features.exteriorBody,
      badge: t.features.exteriorTag,
      icon: Palette,
      image: picture(images.exterior, 4),
      relatedIds: [6, 3],
      energy: 88,
    },
    {
      id: 6,
      title: t.features.interiorTitle,
      content: t.features.interiorBody,
      badge: t.features.interiorTag,
      icon: Sofa,
      image: picture(images.interior, 5),
      relatedIds: [5, 1],
      energy: 84,
    },
  ];

  return (
    <Section id="features">
      <SectionHeading
        eyebrow={t.home.featuresTitle}
        title={t.home.featuresTitle}
        body={t.home.featuresBody}
        align="center"
      />

      <RadialOrbitalTimeline
        className="mt-12"
        items={items}
        centerImage={images.exterior || (slug ? `/images/cars/${slug}/main.svg` : BLANK)}
        centerLabel=""
        labels={{
          hint: t.features.orbitHint,
          connected: t.features.orbitConnected,
          coverage: t.features.orbitCoverage,
          pause: t.features.orbitPause,
          resume: t.features.orbitResume,
        }}
      />
    </Section>
  );
}
