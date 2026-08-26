'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { PageSplash } from '@/components/ui';
import { LoginForm } from './LoginForm';

export function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    void useAuthStore.persist.rehydrate();
  }, []);

  // Already authed (or just logged in — the store update rerenders this):
  // go back where the guard intercepted, or to the products list.
  useEffect(() => {
    if (hydrated && accessToken) {
      const from = searchParams.get('from');
      // Only same-app paths — never an external or protocol-relative URL.
      const safe = from && from.startsWith('/') && !from.startsWith('//');
      router.replace(safe ? from : '/products');
    }
  }, [hydrated, accessToken, searchParams, router]);

  if (!hydrated) {
    return <PageSplash />;
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-background p-4">
      <LoginForm />
    </div>
  );
}
