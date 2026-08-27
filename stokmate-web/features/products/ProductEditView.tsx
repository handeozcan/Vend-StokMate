'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { useProduct } from './hooks';
import { EmptyState, ErrorState } from './components/States';
import { ProductEditForm } from './components/ProductEditForm';

export function ProductEditView({ id }: { id: number }) {
  const router = useRouter();
  const product = useProduct(Number.isFinite(id) ? id : -1);

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
        <div className="h-9 w-24 animate-pulse rounded-lg bg-zinc-200/70" />
        <div className="h-[480px] animate-pulse rounded-2xl bg-zinc-200/70" />
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

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="ghost"
        className="self-start"
        // back(), geçmişi doğru geri sarar; push yeni geçmiş kaydı ekleyip
        // detaydaki "Geri"yi tekrar bu sayfaya gönderirdi.
        onClick={() => router.back()}
      >
        ← Ürüne dön
      </Button>
      <ProductEditForm
        product={product.data}
        onSaved={() => {
          // Success feedback lives on the detail page (?saved=1 → toast there):
          // navigating away would unmount this view before any local toast shows.
          // replace: the completed edit must not linger in history — with push,
          // browser-back from the detail would reopen this form.
          router.replace(`/products/${id}?saved=1`);
        }}
      />
    </div>
  );
}
