'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Spinner } from '@/components/ui';
import { Field } from '@/components/form';
import type { ProductDto } from '@/types/api';
import { unitLabel } from '@/lib/enums';
import { useUpdateStock } from '../hooks';

// Zod v4: `{ message }` customizes type errors (invalid_type_error was removed in v4).
const stockSchema = z.object({
  stock: z
    .number({ message: 'Stok girin.' })
    .int('Tam sayı girin.')
    .min(0, 'Stok negatif olamaz.'),
});

type StockFormValues = z.infer<typeof stockSchema>;

interface Props {
  product: ProductDto;
  /** Called with `true` after a successful save, `undefined` otherwise. */
  onClose: (updated?: boolean) => void;
}

export function StockDialog({ product, onClose }: Props) {
  const updateStock = useUpdateStock();
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StockFormValues>({
    resolver: zodResolver(stockSchema),
    defaultValues: { stock: product.stock },
  });

  // Merge RHF's ref (validation) with our focus ref — spreading
  // `ref={inputRef}` alongside `{...register}` triggers TS2783 and would
  // drop one of the two refs.
  const { ref: stockFieldRef, ...stockField } = register('stock', { valueAsNumber: true });

  // Escape closes — onClose lives in a ref so the listener never rebinds (and
  // never steals focus) when the parent re-renders with a new inline callback.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Focus lands on the input when the dialog opens. The parent conditionally
  // mounts this component, so mount === open.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Guard: Enter submits even while the button is disabled — don't double-fire.
  const onSubmit = handleSubmit((values) => {
    if (!updateStock.isPending) {
      updateStock.mutate({ id: product.id, stock: values.stock }, { onSuccess: () => onClose(true) });
    }
  });

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-dialog-title"
        className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl"
      >
        <h2 id="stock-dialog-title" className="mb-1 text-lg font-semibold">
          Stok Güncelle — {product.name}
        </h2>
        <p className="mb-4 text-sm text-zinc-500">
          Mevcut stok: {product.stock} {unitLabel(product.unit)} · Kritik eşik: {product.minStock}
        </p>

        {updateStock.isError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-600/20">
            {updateStock.error.message}
          </p>
        )}

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Field
            label="Yeni stok"
            id="stock"
            type="number"
            error={errors.stock?.message}
            {...stockField}
            ref={(element) => {
              inputRef.current = element;
              stockFieldRef(element);
            }}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onClose()}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={updateStock.isPending}>
              {updateStock.isPending && <Spinner />}
              {updateStock.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
