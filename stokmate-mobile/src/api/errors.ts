import axios from 'axios';

/**
 * Normalized API failure. `status === undefined` means the request never
 * reached the server (network/offline). `message` comes from the API's
 * plain-text body when available and is safe to show to users (Turkish).
 */
export class ApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Convert any thrown value (typically an AxiosError) to an ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;

    // Error bodies are text/plain — data is a string, NOT JSON.
    if (typeof data === 'string' && data.trim().length > 0) {
      return new ApiError(data, status);
    }
    if (status !== undefined) {
      return new ApiError(`Sunucu hatası (${status}).`, status);
    }
    return new ApiError('Sunucuya bağlanılamadı.');
  }

  return new ApiError('Beklenmeyen bir hata oluştu.');
}
