import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse, UserDto } from '@/types/api';

interface AuthState {
  user: UserDto | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  hydrated: boolean;
  setSession: (session: AuthResponse) => void;
  setHydrated: () => void;
  clearSession: () => void;
}

/**
 * Session is the only global client state: server state lives in TanStack Query,
 * filter state lives in the URL.
 *
 * skipHydration: the server prerender evaluates this module WITHOUT localStorage
 * (empty store). If persist hydrated eagerly on the client, the first client
 * render would disagree with the server HTML → hydration mismatch. Instead the
 * (authed) layout calls `useAuthStore.persist.rehydrate()` inside an effect
 * (post-mount, no mismatch possible) and `hydrated` gates the route guard.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      hydrated: false,
      setSession: (session) =>
        set({
          user: session.user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt,
        }),
      setHydrated: () => set({ hydrated: true }),
      clearSession: () =>
        set({ user: null, accessToken: null, refreshToken: null, expiresAt: null }),
    }),
    {
      name: 'stokmate-auth',
      skipHydration: true,
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
