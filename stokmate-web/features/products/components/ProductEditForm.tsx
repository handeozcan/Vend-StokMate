'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Spinner } from '@/components/ui';
import { Field, SelectField } from '@/components/form';
import type {
  ProductDto,
  ProductStatus,
  ProductUnit,
  UpdateProductRequest,
} from '@/types/api';
import { STATUS_LABELS, UNIT_LABELS } from '@/lib/enums';
import { toKurus } from '@/lib/format';
import { useBrands, useCategories, useSuppliers } from '@/features/lookups/hooks';
import { useUpdateProduct } from '../hooks';
import { productEditSchema, type ProductEditFormValues } from '../schemas';

interface Props {
  product: ProductDto;
  onSaved: () => void;
}

export function ProductEditForm({ product, onSaved }: Props) {
  const categories = useCategories();
  const brands = useBrands();
  const suppliers = useSuppliers();
  const updateProduct = useUpdateProduct();

  const {
    register,
    handleSubmit,
    control,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<ProductEditFormValues>({
    resolver: zodResolver(productEditSchema),
    defaultValues: {
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      categoryId: product.categoryId,
      brandId: product.brandId,
      // No GET returns these three — they start empty and MUST be (re)entered.
      supplierId: 0,
      price: product.price / 100,
      // undefined (NOT NaN): RHF writes NaN into the uncontrolled number input
      // as the literal string "NaN". Empty input still yields NaN at submit
      // via valueAsNumber → Zod "Maliyet girin." message.
      costPrice: undefined as unknown as number,
      stock: product.stock,
      minStock: product.minStock,
      unit: product.unit,
      status: product.status,
      description: '',
      isFeatured: product.isFeatured,
    },
  });

  const onSubmit = handleSubmit((values) => {
    // Guard: Enter submits even while the button is disabled (same pattern as
    // login and the stock dialog) — don't double-fire the PUT.
    if (updateProduct.isPending) return;

    const body: UpdateProductRequest = {
      name: values.name,
      sku: values.sku,
      barcode: values.barcode,
      categoryId: values.categoryId,
      brandId: values.brandId,
      supplierId: values.supplierId,
      price: toKurus(values.price),
      costPrice: toKurus(values.costPrice),
      stock: values.stock,
      minStock: values.minStock,
      unit: values.unit as ProductUnit,
      status: values.status as ProductStatus,
      description: values.description,
      isFeatured: values.isFeatured,
    };

    updateProduct.mutate(
      { id: product.id, body },
      {
        onSuccess: onSaved,
        onError: (error) => {
          if (error instanceof Error && (error as { status?: number }).status === 409) {
            // Focus the offending field — the SKU row can sit above the fold.
            setError('sku', { message: error.message });
            setFocus('sku');
          }
          // Other errors surface via updateProduct.isError alert below.
        },
      },
    );
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5 rounded-2xl bg-surface p-6 shadow-sm"
    >
      <h1 className="text-xl font-semibold">Ürünü Düzenle</h1>

      <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800 ring-1 ring-sky-600/20">
        Tedarikçi, maliyet ve açıklama alanları önceki değerlerini API'den alamıyor
        (API hiçbir listeleme ucunda bu alanları döndürmüyor). Kaydetmek bu üç
        alanı girdiğiniz değerlerle üzerine yazar.
      </p>

      {updateProduct.isError &&
        (updateProduct.error as { status?: number }).status !== 409 && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-600/20">
            {updateProduct.error.message}
          </p>
        )}

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Ürün adı" id="name" error={errors.name?.message} {...register('name')} />
        <Field
          label="Stok kodu (SKU)"
          id="sku"
          autoComplete="off"
          error={errors.sku?.message}
          {...register('sku')}
        />
        <Field label="Barkod" id="barcode" error={errors.barcode?.message} {...register('barcode')} />
      </div>

      {/* Native selects report string values. The schemas require numbers, so
          every select overrides onChange with Number() coercion — spreading
          {...field} alone would store "3" and trip the Zod number check. */}
      <div className="grid gap-4 md:grid-cols-3">
        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <SelectField
              label="Kategori"
              id="categoryId"
              error={errors.categoryId?.message}
              {...field}
              value={field.value ?? 0}
              onChange={(event) => field.onChange(Number(event.target.value))}
            >
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectField>
          )}
        />
        <Controller
          name="brandId"
          control={control}
          render={({ field }) => (
            <SelectField
              label="Marka"
              id="brandId"
              error={errors.brandId?.message}
              {...field}
              value={field.value ?? 0}
              onChange={(event) => field.onChange(Number(event.target.value))}
            >
              {(brands.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </SelectField>
          )}
        />
        <Controller
          name="supplierId"
          control={control}
          render={({ field }) => (
            <SelectField
              label="Tedarikçi *"
              id="supplierId"
              error={errors.supplierId?.message}
              {...field}
              value={field.value ?? 0}
              onChange={(event) => field.onChange(Number(event.target.value))}
            >
              <option value={0} disabled>
                Seçin…
              </option>
              {(suppliers.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectField>
          )}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Field
          label="Satış fiyatı (₺)"
          id="price"
          type="number"
          step="0.01"
          error={errors.price?.message}
          {...register('price', { valueAsNumber: true })}
        />
        <Field
          label="Alış maliyeti (₺) *"
          id="costPrice"
          type="number"
          step="0.01"
          error={errors.costPrice?.message}
          {...register('costPrice', { valueAsNumber: true })}
        />
        <Field
          label="Stok"
          id="stock"
          type="number"
          error={errors.stock?.message}
          {...register('stock', { valueAsNumber: true })}
        />
        <Field
          label="Minimum stok"
          id="minStock"
          type="number"
          error={errors.minStock?.message}
          {...register('minStock', { valueAsNumber: true })}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Controller
          name="unit"
          control={control}
          render={({ field }) => (
            <SelectField
              label="Birim"
              id="unit"
              error={errors.unit?.message}
              {...field}
              value={field.value ?? 0}
              onChange={(event) => field.onChange(Number(event.target.value))}
            >
              {(Object.keys(UNIT_LABELS) as unknown as string[]).map((key) => (
                <option key={key} value={key}>
                  {UNIT_LABELS[Number(key) as ProductUnit]}
                </option>
              ))}
            </SelectField>
          )}
        />
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <SelectField
              label="Durum"
              id="status"
              error={errors.status?.message}
              {...field}
              value={field.value ?? 0}
              onChange={(event) => field.onChange(Number(event.target.value))}
            >
              {(Object.keys(STATUS_LABELS) as unknown as string[]).map((key) => (
                <option key={key} value={key}>
                  {STATUS_LABELS[Number(key) as ProductStatus]}
                </option>
              ))}
            </SelectField>
          )}
        />
        <Controller
          name="isFeatured"
          control={control}
          render={({ field }) => (
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-zinc-700">
              <input
                type="checkbox"
                checked={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                className="size-4 rounded border-zinc-300 text-teal-700 focus:ring-teal-600/30"
              />
              Öne çıkan ürün
            </label>
          )}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700" htmlFor="description">
          Açıklama *
        </label>
        <textarea
          id="description"
          rows={3}
          className={`block w-full rounded-lg border bg-surface px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:ring-2 ${
            errors.description
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
              : 'border-zinc-300 focus:border-teal-600 focus:ring-teal-600/20'
          }`}
          placeholder="Ürün açıklaması…"
          {...register('description')}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={updateProduct.isPending}>
          {updateProduct.isPending && <Spinner />}
          {updateProduct.isPending ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      </div>
    </form>
  );
}
