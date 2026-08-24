'use client';

import { toast } from 'sonner';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CarRow } from '@/components/dashboard/car-row';
import { CarGridSkeleton, EmptyState, ErrorState } from '@/components/shared/states';
import { useAsync } from '@/hooks/use-async';
import { useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';
import { recentlyViewedService } from '@/services/customer.service';
import { ApiError } from '@/services/api-client';
import { formatRelative } from '@/lib/format';
import type { Paginated, RecentEntry } from '@/types/api';

/** Spec §42 — recently viewed, most recent first. */
export default function RecentlyViewedPage() {
  const { token } = useAuth();
  const { t, locale } = useLocale();

  const recent = useAsync<Paginated<RecentEntry>>(
    () => recentlyViewedService.list({ pageSize: 50 }, { token }),
    [token],
    { enabled: Boolean(token), isEmpty: (result) => result.data.length === 0 },
  );

  const clear = async () => {
    try {
      await recentlyViewedService.clear({ token });
      toast.success(t.dashboard.clearHistory);
      recent.reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.error);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold sm:text-3xl">{t.dashboard.recent}</h1>
        {recent.status === 'success' && !recent.isEmpty && (
          <Button variant="outline" size="sm" onClick={() => void clear()}>
            {t.dashboard.clearHistory}
          </Button>
        )}
      </header>

      {recent.status === 'loading' && <CarGridSkeleton count={3} />}
      {recent.status === 'error' && <ErrorState message={recent.error} onRetry={recent.reload} />}

      {recent.status === 'success' && recent.isEmpty && (
        <EmptyState
          icon={Clock}
          title={t.dashboard.noRecent}
          actionLabel={t.dashboard.exploreCars}
          actionHref="/cars"
        />
      )}

      {recent.status === 'success' && !recent.isEmpty && (
        <div className="space-y-3">
          {recent.data?.data.map((entry) => (
            <CarRow key={entry.id} car={entry.car} meta={formatRelative(entry.viewedAt, locale)} />
          ))}
        </div>
      )}
    </div>
  );
}
