/* eslint-disable @next/next/no-img-element */
// Product imageUrl hosts are owned by the API seed data — plain img is fine.

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui';
import { Toast } from '@/components/Toast';
import { STATUS_STYLES, statusLabel, unitLabel } from '@/lib/enums';
import { formatDateTime, formatKurus } from '@/lib/format';
import { useProduct } from './hooks';
import { EmptyState, ErrorState } from './components/States';
import { StockDialog } from './components/StockDialog';

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm font-medium text-zinc-900">{value}</span>
    </div>
  );
}

export function ProductDetailView({ id }: { id: number }) {
  const router = useRouter();
  const product = useProduct(Number.isFinite(id) ? id : -1);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // A param change can remount this view for a DIFFERENT product (client-side
  // id→id navigation) — never show the previous product's toast.
  useEffect(() => {
    // Intentional: URL/id change must clear stale toast synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToast(null);
  }, [id]);

  // Edit screen redirected here with ?saved=1 — show the toast once, then
  // clean the URL so a refresh doesn't repeat it.
  useEffect(() => {
    if (searchParams.get('saved') === '1') {
      // Intentional: toast is derived from the URL once, then the URL is cleaned.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToast('Ürün güncellendi.');
      router.replace(`/products/${id}`, { scroll: false });
    }
  }, [searchParams, router, id]);

  if (!Number.isFinite(id)) {
    return (
      <div className="rounded-2xl bg-surface shadow-sm">
        <EmptyState title="Geçersiz ürün adresi." />
      </div>
    );
  }

  if (product.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-16 animate-pulse rounded-xl bg-zinc-200/70" />
        <div className="h-80 animate-pulse rounded-2xl bg-zinc-200/70" />
      </div>
    );
  }

  if (product.isError) {
    return (
      <div className="rounded-2xl bg-surface shadow-sm">
        <ErrorState message={product.error.message} onRetry={() => product.refetch()} />
      </div>
    );
  }

  if (product.data === null) {
    return (
      <div className="rounded-2xl bg-surface shadow-sm">
        <EmptyState title="Ürün bulunamadı." />
      </div>
    );
  }

  const data = product.data;

  return (
    <div className="flex flex-col gap-3">
      {/* Geçmişe değil hiyerarşiye göre gider: kaydetme akımı geçmişte art arda
          iki detay kaydı bırakır, back() yine detaya dönerdi. */}
      <Button variant="ghost" className="self-start" onClick={() => router.push('/products')}>
        ← Geri
      </Button>

      <div className="rounded-2xl bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row">
          {data.imageUrl ? (
            <img
              src={data.imageUrl}
              alt={data.name}
              className="size-40 shrink-0 self-start rounded-xl border border-zinc-200 object-cover"
            />
          ) : (
            <div className="size-40 shrink-0 self-start rounded-xl border border-zinc-200 bg-zinc-100" />
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{data.name}</h1>
              {data.isFeatured && (
                <span title="Öne çıkan ürün" aria-label="Öne çıkan ürün" className="text-amber-500">★</span>
              )}
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[data.status]}`}
              >
                {statusLabel(data.status)}
              </span>
            </div>
            <p className="mb-2 text-sm text-zinc-500">
              {data.sku} · Barkod: {data.barcode || '—'}
            </p>
            <div className="divide-y divide-zinc-100">
              <DetailRow label="Kategori" value={data.categoryName} />
              <DetailRow label="Marka" value={data.brandName} />
              <DetailRow label="Fiyat" value={formatKurus(data.price)} />
              <DetailRow
                label="Stok"
                value={`${data.stock} ${unitLabel(data.unit)} (kritik eşik: ${data.minStock})`}
              />
              <DetailRow label="Son güncelleme" value={formatDateTime(data.updatedAt)} />
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => setStockDialogOpen(true)}>Stoğu Güncelle</Button>
              <Button variant="secondary" onClick={() => router.push(`/products/${data.id}/edit`)}>
                Düzenle
              </Button>
            </div>
          </div>
        </div>
      </div>

      {stockDialogOpen && (
        <StockDialog
          product={data}
          onClose={(updated) => {
            setStockDialogOpen(false);
            if (updated) setToast('Stok güncellendi.');
          }}
        />
      )}

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
