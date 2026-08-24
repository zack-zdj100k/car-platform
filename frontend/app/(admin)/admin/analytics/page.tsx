'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AlertTriangle, Car, Eye, Heart, Mail, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/admin/stat-card';
import { BarChart } from '@/components/admin/bar-chart';
import { LoadingState, ErrorState, EmptyState } from '@/components/shared/states';
import { useAsync } from '@/hooks/use-async';
import { useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';
import { analyticsService } from '@/services/admin.service';
import { formatNumber } from '@/lib/format';
import type { AnalyticsDashboard } from '@/types/api';

/**
 * Analytics and reports (spec §45, §68).
 *
 * Includes email delivery health, so a silent notification failure is visible
 * rather than lost (spec §69).
 */
export default function AdminAnalyticsPage() {
  const { token } = useAuth();
  const { t, locale } = useLocale();

  const dashboard = useAsync<AnalyticsDashboard>(() => analyticsService.dashboard({ token }), [token], {
    enabled: Boolean(token),
  });

  const email = useAsync(() => analyticsService.emailHealth({ token }), [token], {
    enabled: Boolean(token),
  });

  if (dashboard.status === 'error') {
    return <ErrorState message={dashboard.error} onRetry={dashboard.reload} />;
  }

  if (!dashboard.data) return <LoadingState />;

  const { overview, growth, mostViewed } = dashboard.data;
  const failures = (email.data?.recentFailures ?? []) as {
    id: string;
    to: string;
    template: string;
    error: string | null;
    createdAt: string;
  }[];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">{t.admin.analytics}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          All figures are computed from the database — no estimates.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total views"
          value={formatNumber(overview.views.total, locale)}
          hint={`${formatNumber(overview.views.last30Days, locale)} in 30 days`}
          icon={Eye}
        />
        <StatCard label={t.admin.totalFavorites} value={formatNumber(overview.favorites.total, locale)} icon={Heart} />
        <StatCard
          label={t.admin.totalCars}
          value={formatNumber(overview.cars.published, locale)}
          hint={`${overview.cars.demo} demo · ${overview.cars.archived} archived`}
          icon={Car}
        />
        <StatCard
          label={t.admin.orders}
          value={formatNumber(overview.orders.total, locale)}
          hint={`${overview.orders.pending} pending`}
          icon={Package}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.admin.userGrowth}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart series={growth.users} label={t.admin.userGrowth} height={160} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.admin.carsAdded}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart series={growth.cars} label={t.admin.carsAdded} height={160} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Views</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart series={growth.views} label="Views" height={160} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.admin.orders}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart series={growth.orders} label={t.admin.orders} height={160} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="size-4" aria-hidden="true" />
            Email delivery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(email.data?.counts ?? {}).map(([status, count]) => (
              <Badge
                key={status}
                variant="outline"
                className={status === 'FAILED' ? 'border-destructive/30 bg-destructive/10' : undefined}
              >
                {status}: {count}
              </Badge>
            ))}
            {!email.data && <span className="text-muted-foreground text-sm">{t.common.loading}</span>}
          </div>

          {failures.length > 0 && (
            <ul className="space-y-2">
              {failures.map((failure) => (
                <li
                  key={failure.id}
                  className="border-destructive/30 bg-destructive/5 flex items-start gap-2 rounded-lg border p-3 text-xs"
                >
                  <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-medium">
                      {failure.template} → {failure.to}
                    </p>
                    {failure.error && <p className="text-muted-foreground mt-0.5 break-words">{failure.error}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.admin.mostViewed}</CardTitle>
        </CardHeader>
        <CardContent>
          {mostViewed.length === 0 ? (
            <EmptyState title={t.cars.noResults} className="py-8" />
          ) : (
            <ol className="space-y-3">
              {mostViewed.map((row, index) => (
                <li key={row.car.id} className="flex items-center gap-3">
                  <span className="text-muted-foreground w-4 text-sm tabular-nums">{index + 1}</span>
                  <div className="bg-secondary relative size-11 shrink-0 overflow-hidden rounded-md">
                    {row.car.images[0] && (
                      <Image src={row.car.images[0].url} alt="" fill sizes="44px" className="object-cover" />
                    )}
                  </div>
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">
                    <Link href={`/car/${row.car.slug}`} className="hover:underline underline-offset-4">
                      {row.car.brand.name} {row.car.model}
                    </Link>
                  </p>
                  <p className="text-sm font-semibold tabular-nums">{formatNumber(row.count, locale)}</p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
