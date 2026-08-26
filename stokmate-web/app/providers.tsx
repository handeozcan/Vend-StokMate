'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/api/errors';

export function Providers({ children }: { children: ReactNode }) {
  // useState-initializer: one QueryClient per browser session, never recreated
  // on re-render (a module-scope client would leak state across HMR/SSR).
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            // Retry only network-level failures (ApiError without status), max
            // once. API errors (400/401/404/409) are deterministic.
            retry: (failureCount, error) =>
              error instanceof ApiError && error.status === undefined && failureCount < 1,
          },
          mutations: { retry: false },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
