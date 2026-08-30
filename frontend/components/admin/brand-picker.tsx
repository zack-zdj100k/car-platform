'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { Check, Loader2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { brandsService } from '@/services/brands.service';
import { ApiError } from '@/services/api-client';
import { useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';
import { cn } from '@/lib/utils';
import type { Brand } from '@/types/api';

/**
 * Brand field for the car form.
 *
 * A fixed list would decide in advance which manufacturers this catalogue is
 * allowed to hold. The marque is typed here instead: matches from the existing
 * list are offered as you go, and anything that is not there yet is created on
 * the spot and selected — so a European marque, or a make that only appears
 * once, needs no code change and no separate trip to another screen.
 *
 * It stays a real brand record rather than free text on the vehicle: the
 * catalogue filters, the brand pages and the counts all key off that record, and
 * two spellings of one marque would split a manufacturer in half.
 */
export function BrandPicker({
  brands,
  value,
  onChange,
  onCreated,
  id,
}: {
  brands: Brand[];
  value: string;
  onChange: (brandId: string) => void;
  /** Lets the form add a newly created brand to its own list. */
  onCreated: (brand: Brand) => void;
  id?: string;
}) {
  const { t } = useLocale();
  // Creating a brand is an administrator's action, so it carries the token —
  // without it the request is simply refused and the marque is never saved.
  const { token } = useAuth();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = brands.find((brand) => brand.id === value) ?? null;
  const [query, setQuery] = useState(selected?.name ?? '');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = query.trim();

  const matches = useMemo(() => {
    const needle = trimmed.toLowerCase();
    const list = needle
      ? brands.filter((brand) => brand.name.toLowerCase().includes(needle))
      : brands;
    return list.slice(0, 8);
  }, [brands, trimmed]);

  // Only offer to create something that is genuinely new.
  const exact = brands.some((brand) => brand.name.toLowerCase() === trimmed.toLowerCase());
  const canCreate = trimmed.length > 0 && !exact;
  const rows = matches.length + (canCreate ? 1 : 0);

  const pick = (brand: Brand) => {
    onChange(brand.id);
    setQuery(brand.name);
    setOpen(false);
    setError(null);
  };

  const create = async () => {
    if (!canCreate || creating) return;
    setCreating(true);
    setError(null);

    try {
      const brand = await brandsService.create({ name: trimmed }, { token });
      onCreated(brand);
      pick(brand);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t.common.error);
    } finally {
      setCreating(false);
    }
  };

  const commit = (index: number) => {
    if (canCreate && index === matches.length) {
      void create();
      return;
    }
    const brand = matches[index];
    if (brand) pick(brand);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) setOpen(true);
      if (rows === 0) return;
      setHighlight((current) => {
        const next = event.key === 'ArrowDown' ? current + 1 : current - 1;
        return (next + rows) % rows;
      });
      return;
    }

    if (event.key === 'Enter' && open) {
      event.preventDefault();
      commit(highlight);
      return;
    }

    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      // Typing then leaving must not silently keep a half-typed name.
      setQuery(selected?.name ?? '');
    }
  };

  return (
    <div className="relative">
      <Input
        id={id}
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={t.admin.brandPlaceholder}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setHighlight(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // A blur that lands on the list itself must not close it first.
        onBlur={(event) => {
          if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node | null)) {
            setOpen(false);
            setQuery(selected?.name ?? '');
          }
        }}
        onKeyDown={onKeyDown}
      />

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="border-border bg-popover absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border p-1 shadow-lg"
        >
          {matches.map((brand, index) => (
            <li key={brand.id}>
              <button
                type="button"
                role="option"
                aria-selected={brand.id === value}
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(brand)}
                onMouseEnter={() => setHighlight(index)}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-start text-sm',
                  index === highlight ? 'bg-secondary' : 'hover:bg-secondary/60',
                )}
              >
                <span className="truncate">{brand.name}</span>
                {brand.id === value && <Check className="text-primary size-4" aria-hidden="true" />}
              </button>
            </li>
          ))}

          {canCreate && (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={false}
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void create()}
                onMouseEnter={() => setHighlight(matches.length)}
                disabled={creating}
                className={cn(
                  'text-primary flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-sm font-medium',
                  matches.length === highlight ? 'bg-secondary' : 'hover:bg-secondary/60',
                )}
              >
                {creating ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="size-4" aria-hidden="true" />
                )}
                {t.admin.brandCreate.replace('{name}', trimmed)}
              </button>
            </li>
          )}

          {rows === 0 && (
            <li className="text-muted-foreground px-3 py-2 text-sm">{t.cars.noResults}</li>
          )}
        </ul>
      )}

      {error && <p className="text-destructive mt-1.5 text-xs">{error}</p>}
    </div>
  );
}
