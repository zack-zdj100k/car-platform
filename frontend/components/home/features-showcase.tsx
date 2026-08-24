'use client';

import Image from 'next/image';
import { Gauge, Palette, Shield, Sofa, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Section, SectionHeading } from '@/components/shared/section';
import { Reveal } from '@/components/shared/reveal';
import { useLocale } from '@/providers/locale-provider';
import { cn } from '@/lib/utils';

/**
 * Home features showcase (spec §9): safety, engine, wheels (standard + sport),
 * tyres (14" + 16"), exterior and interior — each with an image and a
 * professional description.
 */
export function FeaturesShowcase({ slug }: { slug: string }) {
  const { t } = useLocale();

  const blocks = [
    {
      key: 'safety',
      icon: Shield,
      title: t.features.safetyTitle,
      body: t.features.safetyBody,
      image: `/images/cars/${slug}/main.svg`,
      tags: [] as string[],
    },
    {
      key: 'engine',
      icon: Gauge,
      title: t.features.engineTitle,
      body: t.features.engineBody,
      image: `/images/cars/${slug}/gallery-2.svg`,
      tags: [],
    },
    {
      key: 'wheels',
      icon: Wrench,
      title: t.features.wheelsTitle,
      body: t.features.wheelsBody,
      image: `/images/wheels/${slug}/wheel.svg`,
      tags: [t.features.wheelsStandard, t.features.wheelsSport],
    },
    {
      key: 'tyres',
      icon: Wrench,
      title: t.features.tyresTitle,
      body: t.features.tyresBody,
      image: `/images/wheels/${slug}/wheel.svg`,
      tags: [t.features.tyres14, t.features.tyres16],
    },
    {
      key: 'exterior',
      icon: Palette,
      title: t.features.exteriorTitle,
      body: t.features.exteriorBody,
      image: `/images/cars/${slug}/gallery-1.svg`,
      tags: [],
    },
    {
      key: 'interior',
      icon: Sofa,
      title: t.features.interiorTitle,
      body: t.features.interiorBody,
      image: `/images/interior/${slug}/dashboard.svg`,
      tags: [],
    },
  ];

  return (
    <Section id="features">
      <SectionHeading
        eyebrow={t.home.featuresTitle}
        title={t.home.featuresTitle}
        body={t.home.featuresBody}
      />

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {blocks.map((block, index) => (
          <Reveal key={block.key} delay={Math.min(index, 4) * 0.06}>
            <article
              className={cn(
                'group border-border bg-card h-full overflow-hidden rounded-xl border',
                'shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-lifted)]',
                // The first block spans both columns on large screens for rhythm.
                index === 0 && 'lg:col-span-2',
              )}
            >
              <div className={cn('grid', index === 0 ? 'lg:grid-cols-2' : 'grid-cols-1')}>
                <div className="bg-secondary relative aspect-16/10 overflow-hidden">
                  <Image
                    src={block.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 45vw, 92vw"
                    className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
                  />
                </div>

                <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
                  <span className="bg-primary/10 text-primary grid size-10 place-items-center rounded-lg">
                    <block.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="text-xl font-semibold">{block.title}</h3>
                  <p className="text-muted-foreground text-sm/7">{block.body}</p>
                  {block.tags.length > 0 && (
                    <ul className="mt-1 flex flex-wrap gap-2">
                      {block.tags.map((tag) => (
                        <li key={tag}>
                          <Badge variant="secondary" className="font-medium">
                            {tag}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
