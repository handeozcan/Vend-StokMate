import {
  keepPreviousData,
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

/** List — key is the full filter object. */
export function useProducts(params: ProductQueryParams) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productApi.list(params),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000, // bonus: background refresh; active tab only (default)
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
 * There is NO GET /products/{id} endpoint (verified). Resolution order:
 * 1. Scan cached ['products'] pages — the normal path (arrived from the list).
 * 2. Cold cache (F5 / deep link): one bounded fetch with pageSize=100.
 *    NOTE: seed dataset is 80 rows — if the seed ever grows past 100, this
 *    fallback silently stops finding tail products.
 * 3. null → confirmed missing.
 */
export function useProduct(id: number) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['products', 'detail', id],
    staleTime: Infinity,
    // Invalid route param (NaN/-1): render the invalid-id state, fetch nothing.
    enabled: Number.isFinite(id),
    queryFn: async (): Promise<ProductDto | null> => {
      for (const [key, data] of queryClient.getQueriesData<PagedResult<ProductDto>>({
        queryKey: ['products'],
      })) {
        // Prefix match also returns ['products','detail',id] entries (their data
        // is a ProductDto|null, not a PagedResult) and this query's own cache —
        // skip anything that is not a paged list.
        if (key[1] === 'detail' || !Array.isArray(data?.items)) continue;
        const hit = data.items.find((p) => p.id === id);
        if (hit) return hit;
      }
      const page = await productApi.list({ pageSize: 100 });
      return page.items.find((p) => p.id === id) ?? null;
    },
  });
}

/**
 * Post-mutation cache policy: write the mutation response into the detail
 * cache, then invalidate list variants + stats. The predicate excludes
 * ['products','detail',id] from invalidation so the list refetch race can't
 * overwrite the fresh mutation response with a stale cache-scan result.
 */
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
