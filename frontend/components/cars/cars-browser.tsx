'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CarFilters, countActiveFilters, type FilterState } from './car-filters';
import { CarGrid } from './car-grid';
import { CarGridSkeleton, EmptyState, ErrorState } from '@/components/shared/states';
import { useAsync } from '@/hooks/use-async';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useLocale } from '@/providers/locale-provider';
import { carsService } from '@/services/cars.service';
import type { CarFacets, CarListItem, Paginated } from '@/types/api';

const PAGE_SIZE = 12;

/**
 * Cars listing (spec §11, §12).
 *
 * Filter state lives in the URL, so a filtered view is shareable, survives a
 * reload and works with browser history — matching the query parameters the
 * route map documents (?brand, ?model, ?year, ?price, ?type, ?sort).
 */
export function CarsBrowser({ initialFacets }: { initialFacets: CarFacets | null }) {
  const { t, dir } = useLocale();
  const router = useRouter();
  const params = useSearchParams();

  const filters = useMemo<FilterState>(
    () => ({
      search: params.get('search') ?? '',
      brand: params.get('brand')?.split(',').filter(Boolean) ?? [],
      model: params.get('model') ?? '',
      bodyType: params.get('type')?.split(',').filter(Boolean) ?? [],
      fuelType: params.get('fuel')?.split(',').filter(Boolean) ?? [],
      year: params.get('year') ?? '',
      priceMin: params.get('priceMin') ?? '',
      priceMax: params.get('priceMax') ?? '',
      sort: params.get('sort') ?? 'newest',
    }),
    [params],
  );

  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  /** Writes filter state back to the URL, resetting to page 1 on any change. */
  const pushFilters = useCallback(
    (next: Partial<FilterState>, options: { keepPage?: boolean; page?: number } = {}) => {
      const merged = { ...filters, ...next };
      const search = new URLSearchParams();

      if (merged.search) search.set('search', merged.search);
      if (merged.brand.length) search.set('brand', merged.brand.join(','));
      if (merged.model) search.set('model', merged.model);
      if (merged.bodyType.length) search.set('type', merged.bodyType.join(','));
      if (merged.fuelType.length) search.set('fuel', merged.fuelType.join(','));
      if (merged.year) search.set('year', merged.year);
      if (merged.priceMin) search.set('priceMin', merged.priceMin);
      if (merged.priceMax) search.set('priceMax', merged.priceMax);
      if (merged.sort && merged.sort !== 'newest') search.set('sort', merged.sort);

      const nextPage = options.page ?? (options.keepPage ? page : 1);
      if (nextPage > 1) search.set('page', String(nextPage));

      const query = search.toString();
      router.push(query ? `/cars?${query}` : '/cars', { scroll: false });
    },
    [filters, page, router],
  );

  // The search box updates the URL immediately for responsiveness, but the
  // request itself waits for the typing to settle (spec §66).
  const debouncedSearch = useDebouncedValue(filters.search, 350);

  const query = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      brand: filters.brand.length ? filters.brand : undefined,
      model: filters.model || undefined,
      bodyType: filters.bodyType.length ? filters.bodyType : undefined,
      fuelType: filters.fuelType.length ? filters.fuelType : undefined,
      year: filters.year ? Number(filters.year) : undefined,
      priceMin: filters.priceMin ? Number(filters.priceMin) : undefined,
      priceMax: filters.priceMax ? Number(filters.priceMax) : undefined,
      sort: filters.sort,
    }),
    [page, debouncedSearch, filters],
  );

  const cars = useAsync<Paginated<CarListItem>>(() => carsService.list(query), [query], {
    isEmpty: (result) => result.data.length === 0,
  });

  const facets = useAsync<CarFacets>(() => carsService.facets(), [], { enabled: !initialFacets });
  const resolvedFacets = initialFacets ?? facets.data;

  const total = cars.data?.meta.total ?? 0;
  const totalPages = cars.data?.meta.totalPages ?? 0;
  const activeCount = countActiveFilters(filters);

  const sortOptions = [
    { value: 'newest', label: t.cars.sortNewest },
    { value: 'oldest', label: t.cars.sortOldest },
    { value: 'price-asc', label: t.cars.sortPriceAsc },
    { value: 'price-desc', label: t.cars.sortPriceDesc },
    { value: 'year-desc', label: t.cars.sortYearDesc },
    { value: 'year-asc', label: t.cars.sortYearAsc },
    { value: 'popular', label: t.cars.sortPopular },
  ];

  const filterPanel = (
    <CarFilters
      facets={resolvedFacets}
      filters={filters}
      onChange={pushFilters}
      onClear={() => router.push('/cars', { scroll: false })}
    />
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">{t.cars.title}</h1>
        <p className="text-muted-foreground mt-3 text-base/7">{t.cars.subtitle}</p>
      </header>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {cars.isLoading
            ? t.cars.loading
            : total === 1
              ? t.cars.resultsOne
              : t.cars.resultsMany.replace('{count}', String(total))}
        </p>

        <div className="flex items-center gap-2">
          {/* Filters open in a sheet on small screens (spec §64) */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                {t.cars.filters}
                {activeCount > 0 && <Badge variant="secondary">{activeCount}</Badge>}
              </Button>
            </SheetTrigger>
            <SheetContent side={dir === 'rtl' ? 'left' : 'right'} className="w-[min(22rem,92vw)] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{t.cars.filters}</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-8">{filterPanel}</div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <Label htmlFor="car-sort" className="text-muted-foreground text-sm whitespace-nowrap">
              {t.cars.sort}
            </Label>
            <Select value={filters.sort} onValueChange={(value) => pushFilters({ sort: value })}>
              <SelectTrigger id="car-sort" size="sm" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Filters sit in the right-hand column on desktop, as specified (§11) */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem] xl:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          {cars.status === 'loading' && <CarGridSkeleton count={6} />}

          {cars.status === 'error' && <ErrorState message={cars.error} onRetry={cars.reload} />}

          {cars.status === 'success' && cars.isEmpty && (
            <EmptyState
              title={t.cars.noResults}
              body={t.cars.noResultsHint}
              actionLabel={activeCount > 0 ? t.cars.clearFilters : undefined}
              onAction={activeCount > 0 ? () => router.push('/cars', { scroll: false }) : undefined}
            />
          )}

          {cars.status === 'success' && !cars.isEmpty && cars.data && (
            <>
              <CarGrid cars={cars.data.data} />

              {totalPages > 1 && (
                <nav
                  aria-label={t.cars.page}
                  className="mt-10 flex items-center justify-center gap-2"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!cars.data.meta.hasPreviousPage}
                    onClick={() => pushFilters({}, { page: page - 1 })}
                  >
                    <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
                    {t.cars.previous}
                  </Button>

                  <span className="text-muted-foreground px-3 text-sm">
                    {t.cars.page} {page} / {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!cars.data.meta.hasNextPage}
                    onClick={() => pushFilters({}, { page: page + 1 })}
                  >
                    {t.cars.next}
                    <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                  </Button>
                </nav>
              )}
            </>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="border-border bg-card sticky top-24 rounded-xl border p-5 shadow-[var(--shadow-card)]">
            {filterPanel}
          </div>
        </aside>
      </div>
    </div>
  );
}
