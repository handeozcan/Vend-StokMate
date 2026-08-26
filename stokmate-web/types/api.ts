// Mirrors the .NET contract (StokMate.Api/Models). Do not "improve" field names.

export type ProductUnit = 1 | 2 | 3 | 4;
export type ProductStatus = 1 | 2 | 3;
export type ProductSort = 'name' | 'price' | 'stock' | 'updatedAt';
export type SortDir = 'asc' | 'desc';

export interface UserDto {
  id: number;
  email: string;
  fullName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  /** UTC ISO-8601. Stored for display only; refresh is reactive (401-driven). */
  expiresAt: string;
  user: UserDto;
}

export interface PagedResult<T> {
  items: T[];
  /** Total matching rows BEFORE pagination (after filters). */
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductDto {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  imageUrl: string;
  categoryId: number;
  categoryName: string;
  brandId: number;
  brandName: string;
  /** Sale price in KURUŞ (1999 = 19,99 ₺). */
  price: number;
  stock: number;
  minStock: number;
  unit: ProductUnit;
  status: ProductStatus;
  isFeatured: boolean;
  updatedAt: string;
}

export interface ProductQueryParams {
  q?: string;
  categoryId?: number;
  brandId?: number;
  status?: ProductStatus;
  page?: number;
  pageSize?: number;
  sort?: ProductSort;
  dir?: SortDir;
}

export interface ProductStatsDto {
  total: number;
  outOfStock: number;
  lowStock: number;
}

/** PUT /products/{id} is a FULL replace — every field is required. */
export interface UpdateProductRequest {
  name: string;
  sku: string;
  barcode: string | null;
  categoryId: number;
  brandId: number;
  supplierId: number;
  /** KURUŞ. */
  price: number;
  /** KURUŞ. Never returned by any GET — the edit form must collect it. */
  costPrice: number;
  stock: number;
  minStock: number;
  unit: ProductUnit;
  status: ProductStatus;
  /** Never returned by any GET — the edit form must collect it. */
  description: string | null;
  isFeatured: boolean;
}

export interface CategoryDto {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface BrandDto {
  id: number;
  name: string;
}

export interface SupplierDto {
  id: number;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  city: string;
}
