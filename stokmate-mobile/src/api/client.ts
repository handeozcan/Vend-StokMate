import axios, { create, type AxiosRequestConfig } from 'axios';
import { env } from '@/lib/env';
import { useAuthStore } from '@/store/auth';
import { toApiError } from './errors';
import type { AuthResponse } from '@/types/api';

// Per-request flags carried on the axios config.
declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Skip attaching the Bearer header (auth endpoints). */
    skipAuth?: boolean;
    /** Internal: request already replayed once after a token refresh. */
    _retried?: boolean;
  }
}

export const apiClient = create({
  baseURL: env.API_BASE_URL,
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken && !config.skipAuth) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/**
 * Single-flight refresh. Refresh tokens are SINGLE-USE (rotation): two parallel
 * refresh calls would invalidate each other and kill the session, so every
 * concurrent 401 shares the same in-flight promise.
 */
let refreshPromise: Promise<AuthResponse> | null = null;

function refreshSession(): Promise<AuthResponse> {
  refreshPromise = axios
    .post<AuthResponse>(
      `${env.API_BASE_URL}/auth/refresh`,
      { refreshToken: useAuthStore.getState().refreshToken },
      { timeout: 15_000 },
    )
    .then((response) => {
      // Rotation: store the NEW refresh token immediately; the old one is dead.
      useAuthStore.getState().setSession(response.data);
      return response.data;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as AxiosRequestConfig | undefined;
    const status: number | undefined = error.response?.status;
    const isAuthPath = typeof config?.url === 'string' && config.url.startsWith('/auth/');
    const canRetry =
      status === 401 && config && !config._retried && !config.skipAuth && !isAuthPath;

    if (canRetry) {
      try {
        // If another refresh already rotated the token while this request was
        // in flight (its Authorization header is stale), replay directly —
        // refreshing again would burn an extra single-use rotation.
        const currentToken = useAuthStore.getState().accessToken;
        const requestAuth = config.headers?.Authorization;
        const session =
          currentToken && requestAuth !== `Bearer ${currentToken}`
            ? { accessToken: currentToken }
            : await refreshSession();
        config._retried = true;
        config.headers = { ...config.headers, Authorization: `Bearer ${session.accessToken}` };
        return apiClient.request(config);
      } catch {
        // Refresh failed (expired/revoked) — the guard redirects on next render.
        useAuthStore.getState().clearSession();
      }
    }

    return Promise.reject(toApiError(error));
  },
);
