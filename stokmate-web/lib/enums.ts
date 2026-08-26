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

/** Tailwind classes for status chips (bg/text/ring). */
export const STATUS_STYLES: Record<ProductStatus, string> = {
  1: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  2: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20',
  3: 'bg-red-50 text-red-700 ring-red-600/20',
};

export const unitLabel = (unit: ProductUnit): string => UNIT_LABELS[unit] ?? String(unit);
export const statusLabel = (status: ProductStatus): string =>
  STATUS_LABELS[status] ?? String(status);
