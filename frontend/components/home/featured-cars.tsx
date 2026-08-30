'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Section, SectionHeading } from '@/components/shared/section';
import { CarGrid } from '@/components/cars/car-grid';
import { EmptyState } from '@/components/shared/states';
import { useLocale } from '@/providers/locale-provider';
import type { CarListItem } from '@/types/api';

/** Featured vehicles, fetched on the server and rendered here (spec §12). */
export function FeaturedCars({ cars }: { cars: CarListItem[] }) {
  const { t } = useLocale();

  return (
    <Section tone="muted">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow={t.home.featuredTitle}
          title={t.home.featuredTitle}
          body={t.home.featuredBody}
        />
        <Button asChild variant="outline" className="group">
          <Link href="/cars">
            {t.home.viewAllCars}
            <ArrowRight
              className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5 rtl:rotate-180"
              aria-hidden="true"
            />
          </Link>
        </Button>
      </div>

      <div className="mt-12">
        {cars.length > 0 ? (
          <CarGrid cars={cars} layout="rail" />
        ) : (
          <EmptyState title={t.cars.noResults} actionLabel={t.home.viewAllCars} actionHref="/cars" />
        )}
      </div>
    </Section>
  );
}
