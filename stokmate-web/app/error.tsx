'use client';

// Error boundaries must be Client Components (Next convention).

import { useEffect } from 'react';
import { Button } from '@/components/ui';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('error.tsx yakaladı:', error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center bg-background p-4">
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl bg-surface p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold">Bir şeyler ters gitti</h2>
        <p className="text-sm text-zinc-500">
          {error.message || 'Beklenmeyen bir hata oluştu.'}
        </p>
        <Button variant="secondary" onClick={reset}>
          Tekrar dene
        </Button>
      </div>
    </div>
  );
}
