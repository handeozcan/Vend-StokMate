/** 1999 → "₺19,99" (kuruş int → Turkish lira display). */
export function formatKurus(kurus: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(kurus / 100);
}

/** TL input from a form field → kuruş int for the API. Round to avoid float drift. */
export function toKurus(lira: number): number {
  return Math.round(lira * 100);
}

/** UTC ISO string → "26.08.2026 14:30". */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}
