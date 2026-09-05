'use client';

import { notify } from '@/lib/notify';
import { Heart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CarRow } from '@/components/dashboard/car-row';
import { CarGridSkeleton, EmptyState, ErrorState } from '@/components/shared/states';
import { useAsync } from '@/hooks/use-async';
import { useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';
import { favoritesService } from '@/services/customer.service';
import { ApiError } from '@/services/api-client';
import type { FavoriteEntry, Paginated } from '@/types/api';

/** Spec §41 — favourite cars, with engine shown as specified. */
export default function FavoritesPage() {
  const { token } = useAuth();
  const { t } = useLocale();

  const favorites = useAsync<Paginated<FavoriteEntry>>(
    () => favoritesService.list({ pageSize: 50 }, { token }),
    [token],
    { enabled: Boolean(token), isEmpty: (result) => result.data.length === 0 },
  );

  const remove = async (carId: string) => {
    try {
      await favoritesService.remove(carId, { token });
      notify.success(t.dashboard.removeFavorite);
      favorites.reload();
    } catch (error) {
      notify.error(error instanceof ApiError ? error.message : t.common.error);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">{t.dashboard.favorites}</h1>
      </header>

      {favorites.status === 'loading' && <CarGridSkeleton count={3} />}
      {favorites.status === 'error' && <ErrorState message={favorites.error} onRetry={favorites.reload} />}

      {favorites.status === 'success' && favorites.isEmpty && (
        <EmptyState
          icon={Heart}
          title={t.dashboard.noFavorites}
          actionLabel={t.dashboard.exploreCars}
          actionHref="/cars"
        />
      )}

      {favorites.status === 'success' && !favorites.isEmpty && (
        <div className="space-y-3">
          {favorites.data?.data.map((entry) => (
            <CarRow
              key={entry.id}
              car={entry.car}
              showEngine
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={t.dashboard.removeFavorite}
                  onClick={() => void remove(entry.car.id)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
