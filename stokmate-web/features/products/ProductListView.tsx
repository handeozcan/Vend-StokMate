'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ProductQueryParams } from '@/types/api';
import { useProducts } from './hooks';
import { FilterBar } from './components/FilterBar';
import { ProductTable } from './components/ProductTable';
import { StatsCards } from './components/StatsCards';
import { EmptyState, ErrorState, ListSkeleton } from './components/States';
import {
  filtersToSearchParams,
  hasActiveFilters,
  parseFilters,
} from './queryParams';

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function ProductListView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const products = useProducts(filters);

  // The search term is local (instant typing), debounced into the URL filters.
  // Living here — not inside FilterBar — guarantees resetFilters clears the input too.
  const [q, setQ] = useState(filters.q ?? '');
  const debouncedQ = useDebouncedValue(q);

  // router.push (not replace): filter changes become history entries, so the
  // browser Back button restores the previous filter/page state. scroll:false —
  // pagination/filter changes must not jump the viewport.
  const setFilters = (patch: Partial<ProductQueryParams>) => {
    const next = { ...filters, ...patch };
    if (patch.page === undefined) next.page = 1; // filter changes reset pagination
    router.push(`${pathname}?${filtersToSearchParams(next).toString()}`, { scroll: false });
  };

  // Push the debounced search term into the URL when it differs from the LIVE
  // URL's q. Reading window.location.search (not the `filters` closure) is
  // deliberate: if the user selects a filter while the debounce timer is
  // pending, the closure lags and would serialize that filter away.
  useEffect(() => {
    const current = parseFilters(new URLSearchParams(window.location.search));
    const nextQ = debouncedQ || undefined;
    if (nextQ !== current.q) {
      router.push(
        `${pathname}?${filtersToSearchParams({ ...current, q: nextQ, page: 1 }).toString()}`,
        { scroll: false },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  // External URL change (browser Back/Forward): sync the input with the URL's
  // q. When the change originated from typing above, filters.q === debouncedQ
  // and this is a no-op.
  useEffect(() => {
    if ((filters.q ?? '') !== debouncedQ) setQ(filters.q ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q]);

  const resetFilters = () => {
    setQ('');
    router.push(`${pathname}?${filtersToSearchParams({ page: 1, pageSize: 20 }).toString()}`, {
      scroll: false,
    });
  };

  return (
    <>
      <StatsCards />
      <FilterBar q={q} onQChange={setQ} filters={filters} setFilters={setFilters} onReset={resetFilters} />
      {products.isPending ? (
        <ListSkeleton />
      ) : products.isError ? (
        <div className="rounded-2xl bg-surface shadow-sm">
          <ErrorState message={products.error.message} onRetry={() => products.refetch()} />
        </div>
      ) : products.data.items.length === 0 ? (
        <div className="rounded-2xl bg-surface shadow-sm">
          {hasActiveFilters(filters) ? (
            <EmptyState
              title="Aramanıza uygun ürün bulunamadı."
              action={resetFilters}
              actionLabel="Filtreleri temizle"
            />
          ) : (
            <EmptyState title="Görüntülenecek ürün yok. API yeniden başlatılmış olabilir." />
          )}
        </div>
      ) : (
        <ProductTable
          data={products.data}
          filters={filters}
          setFilters={setFilters}
          // Dim only while a filter/page transition shows stale data
          // (isPlaceholderData) — not on the silent 60s background refetch.
          isFetching={products.isFetching && products.isPlaceholderData}
        />
      )}
    </>
  );
}
