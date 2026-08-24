'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Car, Heart, Package, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/admin/stat-card';
import { BarChart } from '@/components/admin/bar-chart';
import { LoadingState, ErrorState, EmptyState } from '@/components/shared/states';
import { useAsync } from '@/hooks/use-async';
import { useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';
import { analyticsService } from '@/services/admin.service';
import { formatNumber, formatPrice } from '@/lib/format';
import type { Locale } from '@/lib/i18n/config';
import type { AnalyticsDashboard, AnalyticsRanked } from '@/types/api';

/**
 * Ranked vehicle list. Defined at module scope, not inside the page: a
 * component created during render is a new type each pass, so React would
 * unmount and remount its entire subtree on every update.
 */
function RankedList({
  title,
  rows,
  unit,
  emptyLabel,
  locale,
}: {
  title: string;
  rows: AnalyticsRanked[];
  unit: string;
  emptyLabel: string;
  locale: Locale;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState title={emptyLabel} className="py-8" />
        ) : (
          <ol className="space-y-3">
            {rows.map((row, index) => (
              <li key={row.car.id} className="flex items-center gap-3">
                <span className="text-muted-foreground w-4 text-sm font-medium tabular-nums">{index + 1}</span>
                <div className="bg-secondary relative size-11 shrink-0 overflow-hidden rounded-md">
                  {row.car.images[0] && (
                    <Image src={row.car.images[0].url} alt="" fill sizes="44px" className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    <Link href={`/car/${row.car.slug}`} className="hover:underline underline-offset-4">
                      {row.car.brand.name} {row.car.model}
                    </Link>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatPrice(row.car.price, row.car.currency, locale)}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums">
                  {formatNumber(row.count, locale)}
                  <span className="text-muted-foreground ms-1 text-xs font-normal">{unit}</span>
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Admin overview (spec §45).
 *
 * Every number here is computed from the database. Nothing is hard-coded — the
 * §33 marketing figures live in settings and are shown on the About page.
 */
export default function AdminDashboardPage() {
  const { token } = useAuth();
  const { t, locale } = useLocale();

  const dashboard = useAsync<AnalyticsDashboard>(() => analyticsService.dashboard({ token }), [token], {
    enabled: Boolean(token),
  });

  if (dashboard.status === 'error') {
    return <ErrorState message={dashboard.error} onRetry={dashboard.reload} />;
  }

  if (!dashboard.data) {
    return <LoadingState />;
  }

  const { overview, mostViewed, mostFavorited, growth, orderBreakdown, catalogue } = dashboard.data;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">{t.admin.overview}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {t.admin.analytics} · {new Date(overview.generatedAt).toLocaleString()}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={t.admin.totalCars}
          value={formatNumber(overview.cars.total, locale)}
          hint={`${overview.cars.published} published · ${overview.cars.draft} draft`}
          icon={Car}
        />
        <StatCard
          label={t.admin.totalUsers}
          value={formatNumber(overview.users.total, locale)}
          hint={`+${overview.users.newLast30Days} ${t.admin.newUsers.toLowerCase()}`}
          icon={Users}
        />
        <StatCard
          label={t.admin.totalFavorites}
          value={formatNumber(overview.favorites.total, locale)}
          icon={Heart}
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
          <CardContent className="space-y-6">
            <BarChart series={growth.users} label={t.admin.userGrowth} />
            <BarChart series={growth.cars} label={t.admin.carsAdded} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t.admin.orders} · {formatNumber(overview.views.last30Days, locale)} views (30d)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <BarChart series={growth.views} label="Views" />
            <ul className="space-y-2">
              {orderBreakdown.map((entry) => (
                <li key={entry.status} className="flex items-center justify-between text-sm">
                  <Badge variant="outline">{entry.status}</Badge>
                  <span className="font-medium tabular-nums">{entry.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RankedList
          title={t.admin.mostViewed}
          rows={mostViewed}
          unit="views"
          emptyLabel={t.cars.noResults}
          locale={locale}
        />
        <RankedList
          title={t.admin.mostFavorited}
          rows={mostFavorited}
          unit="saves"
          emptyLabel={t.cars.noResults}
          locale={locale}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.admin.cars}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-widest uppercase">
              {t.cars.brand}
            </h3>
            <ul className="space-y-1.5 text-sm">
              {catalogue.byBrand.slice(0, 8).map((entry) => (
                <li key={entry.brand} className="flex justify-between gap-3">
                  <span className="text-muted-foreground truncate">{entry.brand}</span>
                  <span className="font-medium tabular-nums">{entry.count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-widest uppercase">
              {t.cars.bodyType}
            </h3>
            <ul className="space-y-1.5 text-sm">
              {catalogue.byBodyType.map((entry) => (
                <li key={entry.bodyType} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{entry.bodyType}</span>
                  <span className="font-medium tabular-nums">{entry.count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-widest uppercase">
              {t.cars.fuelType}
            </h3>
            <ul className="space-y-1.5 text-sm">
              {catalogue.byFuelType.map((entry) => (
                <li key={entry.fuelType} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{entry.fuelType}</span>
                  <span className="font-medium tabular-nums">{entry.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
