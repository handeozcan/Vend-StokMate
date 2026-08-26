import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  View,
} from 'react-native';
import { Chip, Surface, Text, TextInput } from 'react-native-paper';
import type { ProductQueryParams, ProductStatus } from '@/types/api';
import { STATUS_LABELS } from '@/lib/enums';
import { useCategories } from '@/features/lookups/hooks';
import { ProductCard } from '@/features/products/product-card';
import { StatsCards } from '@/features/products/stats-cards';
import { useProductsInfinite } from '@/features/products/hooks';

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function ProductList() {
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q);
  const [status, setStatus] = useState<ProductStatus | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const categories = useCategories();

  // Filters live in SCREEN STATE on mobile (spec §4.2) — no URL params.
  const filters = useMemo<ProductQueryParams>(
    () => ({ q: debouncedQ || undefined, status, categoryId, sort: 'name', dir: 'asc' }),
    [debouncedQ, status, categoryId],
  );
  const products = useProductsInfinite(filters);

  const items = products.data?.pages.flatMap((page) => page.items) ?? [];
  const total = products.data?.pages[0]?.total ?? 0;
  const hasFilters = Boolean(debouncedQ || status !== undefined || categoryId !== undefined);

  const reset = () => {
    setQ('');
    setStatus(undefined);
    setCategoryId(undefined);
  };

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <ProductCard product={item} />}
      onEndReached={() => {
        if (products.hasNextPage && !products.isFetchingNextPage && !products.isError) {
          products.fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.4}
      contentContainerStyle={{ padding: 12, gap: 8 }}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: 8 }}>
          <StatsCards />
          <TextInput
            mode="outlined"
            label="Ara (ad, stok kodu, barkod)"
            value={q}
            onChangeText={setQ}
            left={<TextInput.Icon icon="magnify" />}
            dense
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            <Chip selected={status === undefined && categoryId === undefined} onPress={hasFilters ? reset : undefined}>
              Tümü
            </Chip>
            {(Object.keys(STATUS_LABELS) as unknown as string[]).map((key) => (
              <Chip
                key={key}
                selected={status === Number(key)}
                onPress={() => setStatus(status === Number(key) ? undefined : (Number(key) as ProductStatus))}
              >
                {STATUS_LABELS[Number(key) as ProductStatus]}
              </Chip>
            ))}
            {(categories.data ?? []).map((category) => (
              <Chip
                key={category.id}
                selected={categoryId === category.id}
                onPress={() => setCategoryId(categoryId === category.id ? undefined : category.id)}
              >
                {category.name}
              </Chip>
            ))}
          </ScrollView>
          {products.isPending && <ActivityIndicator style={{ padding: 8 }} />}
          {hasFilters && <Text variant="labelSmall" style={{ opacity: 0.6 }}>{total} ürün</Text>}
        </View>
      }
      ListEmptyComponent={
        products.isError ? (
          <Surface style={{ borderRadius: 12, padding: 24, gap: 8, alignItems: 'center' }}>
            <Text variant="bodyMedium" style={{ color: '#dc2626' }}>{products.error.message}</Text>
            <Chip onPress={() => products.refetch()}>Tekrar dene</Chip>
          </Surface>
        ) : products.isPending ? null : (
          <Surface style={{ borderRadius: 12, padding: 24, gap: 8, alignItems: 'center' }}>
            <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
              {hasFilters ? 'Aramanıza uygun ürün bulunamadı.' : 'Görüntülenecek ürün yok.'}
            </Text>
            {hasFilters && <Chip onPress={reset}>Filtreleri temizle</Chip>}
          </Surface>
        )
      }
      ListFooterComponent={
        products.isFetchingNextPage ? (
          <ActivityIndicator style={{ padding: 12 }} />
        ) : products.isError && items.length > 0 ? (
          // A failed fetchNextPage leaves loaded pages visible — surface the
          // error here (ListEmptyComponent never renders when items exist).
          <View style={{ padding: 12, gap: 4, alignItems: 'center' }}>
            <Text variant="bodySmall" style={{ color: '#dc2626' }}>{products.error.message}</Text>
            <Chip onPress={() => products.fetchNextPage()}>Tekrar dene</Chip>
          </View>
        ) : items.length > 0 && !products.hasNextPage ? (
          <Text variant="labelSmall" style={{ textAlign: 'center', opacity: 0.5, padding: 12 }}>
            {total} ürünün tamamı listelendi
          </Text>
        ) : null
      }
    />
  );
}
