import { useQuery } from '@tanstack/react-query';
import { lookupApi } from '@/api/lookups';

// Static seed data with no mutation endpoints — fetch once per session.
export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: lookupApi.categories, staleTime: Infinity });
}

export function useBrands() {
  return useQuery({ queryKey: ['brands'], queryFn: lookupApi.brands, staleTime: Infinity });
}

export function useSuppliers() {
  return useQuery({ queryKey: ['suppliers'], queryFn: lookupApi.suppliers, staleTime: Infinity });
}
