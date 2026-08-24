'use client';

import { toast } from 'sonner';
import { CarCard } from './car-card';
import { Reveal } from '@/components/shared/reveal';
import { useFavorites } from '@/hooks/use-favorites';
import { useCompare } from '@/hooks/use-compare';
import { useLocale } from '@/providers/locale-provider';
import type { CarListItem } from '@/types/api';

/** Responsive grid with subtle staggered reveal (spec §12). */
export function CarGrid({ cars, priorityCount = 3 }: { cars: CarListItem[]; priorityCount?: number }) {
  const { t } = useLocale();
  const favorites = useFavorites();
  const compare = useCompare();

  const handleFavorite = async (carId: string) => {
    const result = await favorites.toggle(carId);
    if ('error' in result) {
      toast.error(result.error);
      return;
    }
    toast.success(result.favorited ? t.car.favorited : t.car.removeFavorite);
  };

  const handleCompare = (carId: string) => {
    const result = compare.toggle(carId);
    if (result.full) {
      toast.error(`${t.car.compare}: ${compare.max}`);
      return;
    }
    toast.success(result.added ? t.car.inCompare : t.dashboard.removeCar);
  };

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {cars.map((car, index) => (
        <Reveal key={car.id} delay={Math.min(index, 5) * 0.05}>
          <CarCard
            car={car}
            priority={index < priorityCount}
            isFavorite={favorites.isFavorite(car.id)}
            isFavoritePending={favorites.isPending(car.id)}
            onToggleFavorite={(id) => void handleFavorite(id)}
            isComparing={compare.has(car.id)}
            onToggleCompare={handleCompare}
          />
        </Reveal>
      ))}
    </div>
  );
}
