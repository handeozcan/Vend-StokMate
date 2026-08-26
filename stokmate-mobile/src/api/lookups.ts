import { apiClient } from './client';
import type { BrandDto, CategoryDto, SupplierDto } from '@/types/api';

export const lookupApi = {
  categories: () => apiClient.get<CategoryDto[]>('/categories').then((r) => r.data),
  brands: () => apiClient.get<BrandDto[]>('/brands').then((r) => r.data),
  suppliers: () => apiClient.get<SupplierDto[]>('/suppliers').then((r) => r.data),
};
