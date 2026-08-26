/* eslint-disable @next/next/no-img-element */
// Product images come from arbitrary remote hosts owned by the API's seed data
// — next/image remotePatterns is not worth the coupling for 40px thumbnails.

'use client';

import Link from 'next/link';
import type { PagedResult, ProductDto, ProductQueryParams, ProductSort } from '@/types/api';
import { STATUS_STYLES, statusLabel, unitLabel } from '@/lib/enums';
import { formatDateTime, formatKurus } from '@/lib/format';

interface Props {
  data: PagedResult<ProductDto>;
  filters: ProductQueryParams;
  setFilters: (patch: Partial<ProductQueryParams>) => void;
  isFetching: boolean;
}

const SORTABLE_COLUMNS: { key: ProductSort; label: string; align?: string }[] = [
  { key: 'name', label: 'Ürün' },
  { key: 'price', label: 'Fiyat', align: 'text-right' },
  { key: 'stock', label: 'Stok' },
  { key: 'updatedAt', label: 'Güncellenme' },
];

function StockCell({ product }: { product: ProductDto }) {
  if (product.stock === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
        Tükendi
      </span>
    );
  }
  if (product.stock <= product.minStock) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
        {product.stock} {unitLabel(product.unit)} (kritik)
      </span>
    );
  }
  return (
    <span className="text-zinc-700">
      {product.stock} {unitLabel(product.unit)}
    </span>
  );
}

function SortHeader({
  column,
  label,
  align,
  filters,
  onSort,
}: {
  column: ProductSort;
  label: string;
  align?: string;
  filters: ProductQueryParams;
  onSort: (column: ProductSort) => void;
}) {
  const active = filters.sort === column;
  const sortValue = !active ? 'none' : filters.dir === 'asc' ? 'ascending' : 'descending';
  return (
    <th
      aria-sort={sortValue}
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 ${align ?? ''}`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-1 hover:text-zinc-800"
        aria-label={`${label} sütununu sırala${active ? ` (şu an ${filters.dir === 'asc' ? 'artan' : 'azalan'})` : ''}`}
      >
        {label}
        <span aria-hidden className={active ? 'text-teal-700' : 'text-zinc-300'}>
          {active ? (filters.dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  );
}

export function ProductTable({ data, filters, setFilters, isFetching }: Props) {
  const toggleSort = (column: ProductSort) => {
    if (filters.sort === column) {
      setFilters({ dir: filters.dir === 'asc' ? 'desc' : 'asc' });
    } else {
      setFilters({ sort: column, dir: 'asc' });
    }
  };

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const from = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const to = Math.min(data.page * data.pageSize, data.total);

  return (
    <div
      className={`overflow-hidden rounded-2xl bg-surface shadow-sm transition-opacity duration-200 ${
        isFetching ? 'opacity-60' : 'opacity-100'
      }`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50/60">
            <tr>
              {SORTABLE_COLUMNS.map((column) => (
                <SortHeader
                  key={column.key}
                  column={column.key}
                  label={column.label}
                  align={column.align}
                  filters={filters}
                  onSort={toggleSort}
                />
              ))}
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Kategori</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Marka</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Durum</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((product) => (
              <tr key={product.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                <td className="px-4 py-2.5">
                  <Link href={`/products/${product.id}`} className="flex items-center gap-3">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt=""
                        className="size-10 shrink-0 rounded-lg border border-zinc-200 object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="size-10 shrink-0 rounded-lg border border-zinc-200 bg-zinc-100" />
                    )}
                    <span className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-1">
                        <span className="truncate font-medium text-zinc-900">{product.name}</span>
                        {product.isFeatured && (
                          <span title="Öne çıkan ürün" className="text-amber-500" aria-label="Öne çıkan ürün">
                            ★
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-zinc-500">{product.sku}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatKurus(product.price)}</td>
                <td className="px-4 py-2.5">
                  <StockCell product={product} />
                </td>
                <td className="px-4 py-2.5 text-zinc-600">{formatDateTime(product.updatedAt)}</td>
                <td className="px-4 py-2.5 text-zinc-600">{product.categoryName}</td>
                <td className="px-4 py-2.5 text-zinc-600">{product.brandName}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[product.status]}`}
                  >
                    {statusLabel(product.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600">
        <div className="flex items-center gap-2">
          <span>Sayfa başına:</span>
          <select
            aria-label="Sayfa başına satır sayısı"
            className="rounded-lg border border-zinc-300 bg-surface px-2 py-1 text-sm"
            value={data.pageSize}
            onChange={(event) => setFilters({ pageSize: Number(event.target.value), page: 1 })}
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <span className="tabular-nums">
          {data.total} üründen {from}–{to}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40"
            disabled={data.page <= 1}
            onClick={() => setFilters({ page: data.page - 1 })}
          >
            ← Önceki
          </button>
          <span className="px-2 tabular-nums">
            {data.page} / {totalPages}
          </span>
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40"
            disabled={data.page >= totalPages}
            onClick={() => setFilters({ page: data.page + 1 })}
          >
            Sonraki →
          </button>
        </div>
      </div>
    </div>
  );
}
