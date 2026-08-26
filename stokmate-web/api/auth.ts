import { apiClient } from './client';
import type { AuthResponse, UserDto } from '@/types/api';

export const authApi = {
  login: (email: string, password: string) =>
    apiClient
      .post<AuthResponse>('/auth/login', { email, password }, { skipAuth: true })
      .then((r) => r.data),

  logout: (refreshToken: string) =>
    apiClient.post<void>('/auth/logout', { refreshToken }).then((r) => r.data),

  me: () => apiClient.get<UserDto>('/auth/me').then((r) => r.data),
};
