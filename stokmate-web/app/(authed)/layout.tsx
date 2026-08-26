'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/auth';
import { Button, PageSplash } from '@/components/ui';

/**
 * Route guard + app shell for every authed screen.
 *
 * Rehydration happens in an effect (store uses skipHydration: true): the server
 * render and the first client render both see the empty store → no hydration
 * mismatch. Once hydrated, a missing token redirects to /login with a `from`
 * param so login can return the user to where they were (including filters).
 */
export default function AuthedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    void useAuthStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (hydrated && !accessToken) {
      const search = searchParams.toString();
      const from = encodeURIComponent(`${pathname}${search ? `?${search}` : ''}`);
      router.replace(`/login?from=${from}`);
    }
  }, [hydrated, accessToken, pathname, searchParams, router]);

  if (!hydrated || !accessToken) {
    return <PageSplash />;
  }

  const handleLogout = async () => {
    try {
      // Best-effort server-side revocation — clear locally regardless.
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // ignore: session is cleared below anyway
    }
    clearSession();
    router.replace('/login');
  };

  return (
    <div className="min-h-dvh">
      <header className="bg-primary text-primary-foreground shadow-sm">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <span className="text-base font-semibold tracking-tight">StokMate</span>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm opacity-90 sm:inline" title={user?.email ?? ''}>
              {user?.fullName ?? '—'}
            </span>
            <Button
              variant="ghost"
              className="text-primary-foreground hover:bg-white/10 focus-visible:ring-white/30"
              onClick={handleLogout}
            >
              Çıkış yap
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
