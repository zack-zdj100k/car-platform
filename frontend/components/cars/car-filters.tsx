'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLocale } from '@/providers/locale-provider';
import { formatPrice, humaniseEnum } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CarFacets } from '@/types/api';

export interface FilterState {
  search: string;
  brand: string[];
  model: string;
  bodyType: string[];
  fuelType: string[];
  year: string;
  priceMin: string;
  priceMax: string;
  sort: string;
}

export const EMPTY_FILTERS: FilterState = {
  search: '',
  brand: [],
  model: '',
  bodyType: [],
  fuelType: [],
  year: '',
  priceMin: '',
  priceMax: '',
  sort: 'newest',
};

export function countActiveFilters(filters: FilterState): number {
  return (
    (filters.search ? 1 : 0) +
    filters.brand.length +
    (filters.model ? 1 : 0) +
    filters.bodyType.length +
    filters.fuelType.length +
    (filters.year ? 1 : 0) +
    (filters.priceMin ? 1 : 0) +
    (filters.priceMax ? 1 : 0)
  );
}

/**
 * Search and filter controls (spec §11).
 *
 * Rendered in the right-hand column on desktop as specified, and inside a
 * collapsible panel on small screens rather than a shrunken copy of the desktop
 * layout (spec §64).
 */
export function CarFilters({
  facets,
  filters,
  onChange,
  onClear,
  className,
}: {
  facets: CarFacets | null;
  filters: FilterState;
  onChange: (next: Partial<FilterState>) => void;
  onClear: () => void;
  className?: string;
}) {
  const { t, locale } = useLocale();
  const active = countActiveFilters(filters);

  const years = facets
    ? Array.from(
        { length: Math.max(0, facets.year.max - facets.year.min + 1) },
        (_, index) => facets.year.max - index,
      )
    : [];

  const models = facets
    ? facets.models
        .filter((entry) => filters.brand.length === 0 || filters.brand.includes(entry.brandSlug))
        .map((entry) => entry.model)
    : [];

  const toggleArrayValue = (key: 'brand' | 'bodyType' | 'fuelType', value: string) => {
    const current = filters[key];
    onChange({
      [key]: current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value],
      // Changing brand invalidates a model chosen from another brand.
      ...(key === 'brand' ? { model: '' } : {}),
    } as Partial<FilterState>);
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {t.cars.filters}
          {active > 0 && (
            <Badge variant="secondary" className="ms-1">
              {active}
            </Badge>
          )}
        </h2>
        {active > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear} className="h-8 text-xs">
            <X className="size-3.5" aria-hidden="true" />
            {t.cars.clearFilters}
          </Button>
        )}
      </div>

      {/* Search — spec §11 requires a magnification affordance */}
      <div className="space-y-2">
        <Label htmlFor="car-search">{t.cars.searchLabel}</Label>
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id="car-search"
            type="search"
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder={t.cars.searchPlaceholder}
            className="ps-9"
            autoComplete="off"
          />
        </div>
      </div>

      <Separator />

      {/* Brand */}
      {facets && facets.brands.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">{t.cars.brand}</legend>
          <ul className="max-h-56 space-y-2 overflow-y-auto pe-1">
            {facets.brands.map((brand) => {
              const id = `brand-${brand.slug}`;
              return (
                <li key={brand.id} className="flex items-center gap-2.5">
                  <Checkbox
                    id={id}
                    checked={filters.brand.includes(brand.slug)}
                    onCheckedChange={() => toggleArrayValue('brand', brand.slug)}
                  />
                  <Label htmlFor={id} className="flex-1 cursor-pointer text-sm font-normal">
                    {brand.name}
                  </Label>
                  <span className="text-muted-foreground text-xs">{brand.count}</span>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      {/* Model — narrowed by the selected brands */}
      <div className="space-y-2">
        <Label htmlFor="car-model">{t.cars.model}</Label>
        <Select
          value={filters.model || 'any'}
          onValueChange={(value) => onChange({ model: value === 'any' ? '' : value })}
        >
          <SelectTrigger id="car-model" className="w-full">
            <SelectValue placeholder={t.cars.anyModel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t.cars.anyModel}</SelectItem>
            {models.map((model) => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Year */}
      <div className="space-y-2">
        <Label htmlFor="car-year">{t.cars.year}</Label>
        <Select
          value={filters.year || 'any'}
          onValueChange={(value) => onChange({ year: value === 'any' ? '' : value })}
        >
          <SelectTrigger id="car-year" className="w-full">
            <SelectValue placeholder={t.cars.anyYear} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t.cars.anyYear}</SelectItem>
            {years.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price range */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t.cars.priceRange}</legend>
        {facets && (
          <p className="text-muted-foreground text-xs">
            {formatPrice(facets.price.min, 'USD', locale)} – {formatPrice(facets.price.max, 'USD', locale)}
          </p>
        )}
        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="price-min" className="text-muted-foreground text-xs font-normal">
              {t.cars.from}
            </Label>
            <Input
              id="price-min"
              type="number"
              inputMode="numeric"
              min={0}
              value={filters.priceMin}
              onChange={(event) => onChange({ priceMin: event.target.value })}
              placeholder="0"
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="price-max" className="text-muted-foreground text-xs font-normal">
              {t.cars.to}
            </Label>
            <Input
              id="price-max"
              type="number"
              inputMode="numeric"
              min={0}
              value={filters.priceMax}
              onChange={(event) => onChange({ priceMax: event.target.value })}
              placeholder={facets ? String(Math.ceil(Number(facets.price.max))) : ''}
            />
          </div>
        </div>
      </fieldset>

      {/* Body type */}
      {facets && facets.bodyTypes.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">{t.cars.bodyType}</legend>
          <ul className="space-y-2">
            {facets.bodyTypes.map((entry) => {
              const id = `body-${entry.value}`;
              return (
                <li key={entry.value} className="flex items-center gap-2.5">
                  <Checkbox
                    id={id}
                    checked={filters.bodyType.includes(entry.value)}
                    onCheckedChange={() => toggleArrayValue('bodyType', entry.value)}
                  />
                  <Label htmlFor={id} className="flex-1 cursor-pointer text-sm font-normal">
                    {humaniseEnum(entry.value)}
                  </Label>
                  <span className="text-muted-foreground text-xs">{entry.count}</span>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      {/* Fuel type */}
      {facets && facets.fuelTypes.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">{t.cars.fuelType}</legend>
          <ul className="space-y-2">
            {facets.fuelTypes.map((entry) => {
              const id = `fuel-${entry.value}`;
              return (
                <li key={entry.value} className="flex items-center gap-2.5">
                  <Checkbox
                    id={id}
                    checked={filters.fuelType.includes(entry.value)}
                    onCheckedChange={() => toggleArrayValue('fuelType', entry.value)}
                  />
                  <Label htmlFor={id} className="flex-1 cursor-pointer text-sm font-normal">
                    {humaniseEnum(entry.value)}
                  </Label>
                  <span className="text-muted-foreground text-xs">{entry.count}</span>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}
    </div>
  );
}
