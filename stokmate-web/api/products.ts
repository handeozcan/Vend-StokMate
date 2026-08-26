import { apiClient } from './client';
import type {
  PagedResult,
  ProductDto,
  ProductQueryParams,
  ProductStatsDto,
  UpdateProductRequest,
} from '@/types/api';

export const productApi = {
  list: (params: ProductQueryParams) =>
    apiClient
      .get<PagedResult<ProductDto>>('/products', { params })
      .then((r) => r.data),

  stats: () => apiClient.get<ProductStatsDto>('/products/stats').then((r) => r.data),

  update: (id: number, body: UpdateProductRequest) =>
    apiClient.put<ProductDto>(`/products/${id}`, body).then((r) => r.data),

  /** Quick stock correction — the only partial update the API offers. */
  updateStock: (id: number, stock: number) =>
    apiClient.patch<ProductDto>(`/products/${id}/stock`, { stock }).then((r) => r.data),
};
