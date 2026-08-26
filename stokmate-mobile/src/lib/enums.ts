import type { ProductStatus, ProductUnit } from '@/types/api';

export const UNIT_LABELS: Record<ProductUnit, string> = {
  1: 'Adet',
  2: 'Kg',
  3: 'Lt',
  4: 'Paket',
};

export const STATUS_LABELS: Record<ProductStatus, string> = {
  1: 'Aktif',
  2: 'Pasif',
  3: 'Üretim Durduruldu',
};

/** React Native Paper Chip props for status display. */
export const STATUS_CHIP_PROPS: Record<
  ProductStatus,
  { mode: 'flat' | 'outlined'; selectedColor: string; textStyle: { color: string } }
> = {
  1: { mode: 'flat', selectedColor: '#059669', textStyle: { color: '#065f46' } },
  2: { mode: 'outlined', selectedColor: '#52525b', textStyle: { color: '#52525b' } },
  3: { mode: 'flat', selectedColor: '#dc2626', textStyle: { color: '#991b1b' } },
};

export const unitLabel = (unit: ProductUnit): string => UNIT_LABELS[unit] ?? String(unit);
export const statusLabel = (status: ProductStatus): string =>
  STATUS_LABELS[status] ?? String(status);
