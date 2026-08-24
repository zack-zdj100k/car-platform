'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { CarRow } from '@/components/dashboard/car-row';
import { CarGridSkeleton, EmptyState, ErrorState } from '@/components/shared/states';
import { useAsync } from '@/hooks/use-async';
import { useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';
import { dashboardService } from '@/services/customer.service';
import { formatRelative } from '@/lib/format';
import type { DashboardOverview } from '@/types/api';

/** Customer dashboard home (spec §40). Every figure comes from the database. */
export default function DashboardHomePage() {
  const { token } = useAuth();
  const { t, locale, format } = useLocale();

  const overview = useAsync<DashboardOverview>(() => dashboardService.overview({ token }), [token], {
    enabled: Boolean(token),
  });

  if (overview.status === 'error') {
    return <ErrorState message={overview.error} onRetry={overview.reload} />;
  }

  if (!overview.data) {
    return (
      <div className="space-y-6">
        <div className="bg-secondary h-9 w-64 animate-pulse rounded-md" />
        <CarGridSkeleton count={3} />
      </div>
    );
  }

  const { user, summary, recentlyViewed } = overview.data;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">
          {format(t.dashboard.welcome, { name: user.fullName })}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">{user.email}</p>
      </header>

      <SummaryCards summary={summary} />

      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">{t.dashboard.recentlyViewedVehicles}</h2>
          {recentlyViewed.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/recent">{t.dashboard.recent}</Link>
            </Button>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {recentlyViewed.length === 0 ? (
            <EmptyState
              title={t.dashboard.noRecent}
              actionLabel={t.dashboard.exploreCars}
              actionHref="/cars"
            />
          ) : (
            recentlyViewed.map((entry) => (
              <CarRow
                key={entry.car.id}
                car={entry.car}
                meta={formatRelative(entry.viewedAt, locale)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
