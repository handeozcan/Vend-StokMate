import type { ProductQueryParams, ProductSort, ProductStatus } from '@/types/api';

const SORTS: readonly ProductSort[] = ['name', 'price', 'stock', 'updatedAt'] as const;

function num(sp: URLSearchParams, key: string): number | undefined {
  const raw = sp.get(key);
  if (raw === null || raw === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export function parseFilters(sp: URLSearchParams): ProductQueryParams {
  // `?? ''` + widened includes: avoids a strict-mode `string | null` → literal
  // union cast error; the final `as ProductSort` narrows a checked string.
  const rawSort = sp.get('sort') ?? '';
  const dir = sp.get('dir');
  return {
    q: sp.get('q') || undefined,
    categoryId: num(sp, 'categoryId'),
    brandId: num(sp, 'brandId'),
    status: num(sp, 'status') as ProductStatus | undefined,
    page: num(sp, 'page') ?? 1,
    pageSize: num(sp, 'pageSize') ?? 20,
    sort: (SORTS as readonly string[]).includes(rawSort) ? (rawSort as ProductSort) : 'name',
    dir: dir === 'desc' ? 'desc' : 'asc',
  };
}

export function filtersToSearchParams(filters: ProductQueryParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (filters.q) sp.set('q', filters.q);
  if (filters.categoryId !== undefined) sp.set('categoryId', String(filters.categoryId));
  if (filters.brandId !== undefined) sp.set('brandId', String(filters.brandId));
  if (filters.status !== undefined) sp.set('status', String(filters.status));
  if (filters.page !== undefined) sp.set('page', String(filters.page));
  if (filters.pageSize !== undefined) sp.set('pageSize', String(filters.pageSize));
  sp.set('sort', filters.sort ?? 'name');
  sp.set('dir', filters.dir ?? 'asc');
  return sp;
}

export function hasActiveFilters(filters: ProductQueryParams): boolean {
  return Boolean(
    filters.q || filters.categoryId !== undefined || filters.brandId !== undefined || filters.status !== undefined,
  );
}
