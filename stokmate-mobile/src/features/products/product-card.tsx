import { Image } from 'expo-image';
import { router } from 'expo-router';
import { TouchableRipple, Text, Chip } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';
import type { ProductDto } from '@/types/api';
import { STATUS_CHIP_PROPS, statusLabel, unitLabel } from '@/lib/enums';
import { formatKurus } from '@/lib/format';

function StockBadge({ product }: { product: ProductDto }) {
  if (product.stock === 0) {
    return <Chip compact textStyle={{ color: '#991b1b' }} style={{ backgroundColor: '#fee2e2' }}>Tükendi</Chip>;
  }
  if (product.stock <= product.minStock) {
    return (
      <Chip compact textStyle={{ color: '#92400e' }} style={{ backgroundColor: '#fef3c7' }}>
        {product.stock} {unitLabel(product.unit)} (kritik)
      </Chip>
    );
  }
  return <Text variant="bodySmall">{product.stock} {unitLabel(product.unit)}</Text>;
}

export function ProductCard({ product }: { product: ProductDto }) {
  const chip = STATUS_CHIP_PROPS[product.status];
  return (
    <TouchableRipple
      onPress={() => router.push(`/product/${product.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Ürün: ${product.name}`}
      style={styles.touch}
    >
      <View style={styles.row}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.image}
            contentFit="cover"
            recyclingKey={String(product.id)}
          />
        ) : (
          <View style={[styles.image, { backgroundColor: '#e4e4e7' }]} />
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text variant="titleSmall" numberOfLines={1} style={{ flexShrink: 1 }}>
              {product.name}
            </Text>
            {product.isFeatured && <Text style={{ color: '#d97706' }}>★</Text>}
          </View>
          <Text variant="bodySmall" style={{ opacity: 0.6 }}>
            {product.sku} · {product.categoryName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <Text variant="labelLarge" style={{ fontVariant: ['tabular-nums'] }}>
              {formatKurus(product.price)}
            </Text>
            <StockBadge product={product} />
            <Chip compact mode={chip.mode} selectedColor={chip.selectedColor} textStyle={chip.textStyle}>
              {statusLabel(product.status)}
            </Chip>
          </View>
        </View>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  touch: { borderRadius: 12 },
  row: { flexDirection: 'row', gap: 12, padding: 12, alignItems: 'center' },
  image: { width: 48, height: 48, borderRadius: 8 },
});
