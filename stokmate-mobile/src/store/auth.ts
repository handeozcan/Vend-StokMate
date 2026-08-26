import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import type { AuthResponse, UserDto } from '@/types/api';

// Tokens live in the iOS Keychain / Android Keystore — never AsyncStorage.
const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name).then((value) => value ?? null),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};

interface AuthState {
  user: UserDto | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  /** SecureStore reads are ASYNC on native — the guard must wait for this. */
  hydrated: boolean;
  setSession: (session: AuthResponse) => void;
  clearSession: () => void;
}

/**
 * Session is the only global client state (spec §9). Unlike the web store
 * there is no SSR, so no skipHydration is needed — persist rehydrates from
 * SecureStore asynchronously on launch and `onRehydrateStorage` flips the
 * `hydrated` flag the route gate waits on.
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
      clearSession: () =>
        set({ user: null, accessToken: null, refreshToken: null, expiresAt: null }),
    }),
    {
      name: 'stokmate-auth',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
      }),
      // Zustand v5 fires this callback on success AND on a rejected storage
      // read. Direct setState (not a persisted action — no redundant keychain
      // write) so a failed keychain read fails LOGGED OUT instead of hanging
      // on the splash forever. The inner callback runs after create() returns,
      // so referencing useAuthStore here is safe.
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ hydrated: true });
      },
    },
  ),
);
