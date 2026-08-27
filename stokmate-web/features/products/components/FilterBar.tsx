import { Field, SelectField } from '@/components/form';
import { Button } from '@/components/ui';
import type { ProductQueryParams, ProductStatus } from '@/types/api';
import { STATUS_LABELS } from '@/lib/enums';
import { useBrands, useCategories } from '@/features/lookups/hooks';
import { hasActiveFilters } from '../queryParams';

/**
 * Fully controlled: the search term lives in ProductListView (single source of
 * truth alongside the URL filters) so resetting filters also clears the input.
 */
interface Props {
  q: string;
  onQChange: (value: string) => void;
  filters: ProductQueryParams;
  setFilters: (patch: Partial<ProductQueryParams>) => void;
  onReset: () => void;
}

export function FilterBar({ q, onQChange, filters, setFilters, onReset }: Props) {
  const categories = useCategories();
  const brands = useBrands();

  return (
    <div className="mb-3 rounded-2xl bg-surface p-4 shadow-sm">
      {/* items-end: etiketli alanların inputlarıyla aynı hizaya iner ("Temizle"
          butonu etiket satırında değil input satırında durur). */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
        <Field
          label="Ara (ad, stok kodu, barkod)"
          id="filter-q"
          type="search"
          value={q}
          placeholder="Ürün adı, SKU veya barkod…"
          onChange={(event) => onQChange(event.target.value)}
        />
        <SelectField
          label="Kategori"
          id="filter-category"
          value={filters.categoryId ?? ''}
          disabled={categories.isPending}
          onChange={(event) =>
            setFilters({ categoryId: event.target.value ? Number(event.target.value) : undefined })
          }
        >
          <option value="">Tümü</option>
          {(categories.data ?? []).map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Marka"
          id="filter-brand"
          value={filters.brandId ?? ''}
          disabled={brands.isPending}
          onChange={(event) =>
            setFilters({ brandId: event.target.value ? Number(event.target.value) : undefined })
          }
        >
          <option value="">Tümü</option>
          {(brands.data ?? []).map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Durum"
          id="filter-status"
          value={filters.status ?? ''}
          onChange={(event) =>
            setFilters({
              status: event.target.value ? (Number(event.target.value) as ProductStatus) : undefined,
            })
          }
        >
          <option value="">Tümü</option>
          {(Object.keys(STATUS_LABELS) as unknown as string[]).map((key) => (
            <option key={key} value={key}>
              {STATUS_LABELS[Number(key) as ProductStatus]}
            </option>
          ))}
        </SelectField>
        {hasActiveFilters(filters) && (
          <div className="flex items-end">
            <Button variant="ghost" onClick={onReset}>
              Temizle
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
