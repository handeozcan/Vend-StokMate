import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { productApi } from '@/api/products';
import type {
  PagedResult,
  ProductDto,
  ProductQueryParams,
  UpdateProductRequest,
} from '@/types/api';

/** List — key is the full filter object. Polling parity with web (60s): the
 *  API has no push, so a web-side edit reaches an open mobile screen within
 *  a minute (focus refetch alone only fires on app switch, ≥30s stale). */
export function useProducts(params: ProductQueryParams) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productApi.list(params),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

export function useProductStats() {
  return useQuery({
    queryKey: ['product-stats'],
    queryFn: productApi.stats,
    refetchInterval: 60_000,
  });
}

/**
 * NO GET /products/{id} exists (verified). Resolution order: scan cached
 * ['products'] pages; cold cache → one bounded pageSize=100 fetch (seed is 80
 * rows); else null = confirmed missing.
 */
export function useProduct(id: number) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['products', 'detail', id],
    staleTime: Infinity,
    // Invalid route param (NaN/-1): fetch nothing — id must also be positive.
    enabled: Number.isFinite(id) && id > 0,
    queryFn: async (): Promise<ProductDto | null> => {
      for (const [key, data] of queryClient.getQueriesData<PagedResult<ProductDto>>({
        queryKey: ['products'],
      })) {
        if (key[1] === 'detail' || !Array.isArray(data?.items)) continue;
        const hit = data.items.find((p) => p.id === id);
        if (hit) return hit;
      }
      const page = await productApi.list({ pageSize: 100 });
      return page.items.find((p) => p.id === id) ?? null;
    },
  });
}

/** Same cache policy as web: write detail, invalidate lists (predicate
 *  excludes detail) + stats. */
function useApplyProductMutationResult() {
  const queryClient = useQueryClient();

  return (updated: ProductDto) => {
    queryClient.setQueryData(['products', 'detail', updated.id], updated);
    queryClient.invalidateQueries({
      queryKey: ['products'],
      predicate: (query) => query.queryKey[1] !== 'detail',
    });
    queryClient.invalidateQueries({ queryKey: ['product-stats'] });
  };
}

/** Infinite list for the mobile FlatList — pageParam follows API pagination. */
export function useProductsInfinite(params: ProductQueryParams) {
  return useInfiniteQuery({
    queryKey: ['products', 'infinite', params],
    queryFn: ({ pageParam }) => productApi.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.max(1, Math.ceil(lastPage.total / lastPage.pageSize));
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    placeholderData: keepPreviousData,
    // Keeps an open list screen in sync with edits made from the web app.
    refetchInterval: 60_000,
  });
}

export function useUpdateStock() {
  const apply = useApplyProductMutationResult();
  return useMutation({
    mutationFn: ({ id, stock }: { id: number; stock: number }) =>
      productApi.updateStock(id, stock),
    onSuccess: apply,
  });
}

export function useUpdateProduct() {
  const apply = useApplyProductMutationResult();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateProductRequest }) =>
      productApi.update(id, body),
    onSuccess: (updated) => apply(updated),
  });
}
