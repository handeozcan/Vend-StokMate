import { z } from 'zod';

// Zod v4: the `{ message }` param customizes type errors (e.g. NaN from an
// empty number input). `invalid_type_error` was removed in Zod v4 and is
// silently ignored — do not use it.

const positiveId = (label: string) =>
  z
    .number({ message: `${label} seçin.` })
    .int()
    .positive(`${label} seçin.`);

const money = (label: string) =>
  z.number({ message: `${label} girin.` }).min(0, `${label} negatif olamaz.`);

const count = (label: string) =>
  z
    .number({ message: `${label} girin.` })
    .int('Tam sayı girin.')
    .min(0, `${label} negatif olamaz.`);

/**
 * Form works in TL; the submit handler converts price to kuruş via toKurus().
 * supplierId/costPrice/description are NOT in the form: no GET returns them
 * (PUT is a full replace — API trap), so the submit handler sends hidden
 * neutral values instead of making the user re-enter invisible fields.
 */
export const productEditSchema = z.object({
  name: z.string().min(1, 'Ürün adı zorunludur.'),
  sku: z.string().min(1, 'Stok kodu (SKU) zorunludur.'),
  barcode: z.string(),
  categoryId: positiveId('Kategori'),
  brandId: positiveId('Marka'),
  price: money('Fiyat'),
  stock: count('Stok'),
  minStock: count('Minimum stok'),
  unit: z.number({ message: 'Birim seçin.' }).int().min(1).max(4),
  status: z
    .number({ message: 'Durum seçin.' })
    .int()
    .refine((value) => [1, 2, 3].includes(value), 'Geçersiz durum.'),
  isFeatured: z.boolean(),
});

export type ProductEditFormValues = z.infer<typeof productEditSchema>;
