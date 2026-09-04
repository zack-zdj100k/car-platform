'use client';

import { notify } from '@/lib/notify';
import { CarCard } from './car-card';
import { Carousel } from '@/components/ui/carousel';
import { Reveal } from '@/components/shared/reveal';
import { useFavorites } from '@/hooks/use-favorites';
import { useCompare } from '@/hooks/use-compare';
import { useLocale } from '@/providers/locale-provider';
import type { CarListItem } from '@/types/api';

/**
 * Responsive grid with subtle staggered reveal (spec §12).
 *
 * `layout="rail"` shows the same cards as one horizontally scrolling row with
 * arrow controls — used on the home page, where a full grid of vehicles would
 * push everything beneath it off the first screens.
 */
export function CarGrid({
  cars,
  priorityCount = 3,
  layout = 'grid',
}: {
  cars: CarListItem[];
  priorityCount?: number;
  layout?: 'grid' | 'rail';
}) {
  const { t } = useLocale();
  const favorites = useFavorites();
  const compare = useCompare();

  const handleFavorite = async (carId: string) => {
    const result = await favorites.toggle(carId);
    if ('error' in result) {
      notify.error(result.error);
      return;
    }
    notify.success(result.favorited ? t.car.favorited : t.car.removeFavorite);
  };

  const handleCompare = (carId: string) => {
    const result = compare.toggle(carId);
    if (result.full) {
      notify.error(`${t.car.compare}: ${compare.max}`);
      return;
    }
    notify.success(result.added ? t.car.inCompare : t.dashboard.removeCar);
  };

  const card = (car: CarListItem, index: number) => (
    <CarCard
      car={car}
      priority={index < priorityCount}
      isFavorite={favorites.isFavorite(car.id)}
      isFavoritePending={favorites.isPending(car.id)}
      onToggleFavorite={(id) => void handleFavorite(id)}
      isComparing={compare.has(car.id)}
      onToggleCompare={handleCompare}
    />
  );

  if (layout === 'rail') {
    return (
      <Carousel
        label={t.home.featuredTitle}
        previousLabel={t.cars.previous}
        nextLabel={t.cars.next}
        items={cars.map((car, index) => card(car, index))}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {cars.map((car, index) => (
        <Reveal key={car.id} delay={Math.min(index, 5) * 0.05}>
          {card(car, index)}
        </Reveal>
      ))}
    </div>
  );
}
