import { useState } from 'react';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Button, Card, Chip, Snackbar, Surface, Text } from 'react-native-paper';
import { STATUS_CHIP_PROPS, statusLabel, unitLabel } from '@/lib/enums';
import { formatDateTime, formatKurus } from '@/lib/format';
import { useProduct } from '@/features/products/hooks';
import { StockDialog } from '@/features/products/stock-dialog';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
      <Text variant="bodyMedium" style={{ opacity: 0.6 }}>{label}</Text>
      <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const productId = Number(id);
  const product = useProduct(Number.isFinite(productId) && productId > 0 ? productId : -1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // Invalid route param short-circuits BEFORE query state: with the enabled
  // guard in useProduct, a disabled query never resolves, so invalid-id must
  // be its own branch (never derived from pending/null).
  if (!Number.isFinite(productId) || productId <= 0) {
    return (
      <Surface style={{ margin: 16, borderRadius: 12, padding: 24, alignItems: 'center' }}>
        <Text variant="bodyMedium" style={{ opacity: 0.7 }}>Ürün bulunamadı.</Text>
      </Surface>
    );
  }

  if (product.isPending) {
    return <Text style={{ padding: 16, opacity: 0.6 }}>Yükleniyor…</Text>;
  }

  if (product.isError) {
    return (
      <Surface style={{ margin: 16, borderRadius: 12, padding: 24, gap: 8, alignItems: 'center' }}>
        <Text variant="bodyMedium" style={{ color: '#dc2626' }}>{product.error.message}</Text>
        <Chip onPress={() => product.refetch()}>Tekrar dene</Chip>
      </Surface>
    );
  }

  if (product.data === null) {
    return (
      <Surface style={{ margin: 16, borderRadius: 12, padding: 24, alignItems: 'center' }}>
        <Text variant="bodyMedium" style={{ opacity: 0.7 }}>Ürün bulunamadı.</Text>
      </Surface>
    );
  }

  const data = product.data;
  const chip = STATUS_CHIP_PROPS[data.status];

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card mode="elevated">
          <Card.Content style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              {data.imageUrl ? (
                <Image source={{ uri: data.imageUrl }} style={{ width: 96, height: 96, borderRadius: 12 }} contentFit="cover" />
              ) : (
                <View style={{ width: 96, height: 96, borderRadius: 12, backgroundColor: '#e4e4e7' }} />
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text variant="titleMedium">{data.name}</Text>
                  {data.isFeatured && <Text style={{ color: '#d97706' }}>★</Text>}
                  <Chip compact mode={chip.mode} selectedColor={chip.selectedColor} textStyle={chip.textStyle}>
                    {statusLabel(data.status)}
                  </Chip>
                </View>
                <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                  {data.sku} · Barkod: {data.barcode || '—'}
                </Text>
              </View>
            </View>
            <Row label="Kategori" value={data.categoryName} />
            <Row label="Marka" value={data.brandName} />
            <Row label="Fiyat" value={formatKurus(data.price)} />
            <Row label="Stok" value={`${data.stock} ${unitLabel(data.unit)} (kritik: ${data.minStock})`} />
            <Row label="Son güncelleme" value={formatDateTime(data.updatedAt)} />
          </Card.Content>
        </Card>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button mode="contained" style={{ flex: 1 }} onPress={() => setDialogOpen(true)}>
            Stoğu Güncelle
          </Button>
          <Button mode="outlined" style={{ flex: 1 }} onPress={() => router.push(`/product/${data.id}/edit`)}>
            Düzenle
          </Button>
        </View>
      </ScrollView>

      {dialogOpen && (
        <StockDialog
          product={data}
          onClose={(updated) => {
            setDialogOpen(false);
            if (updated) setSnackbar('Stok güncellendi.');
          }}
        />
      )}

      <Snackbar visible={snackbar !== null} onDismiss={() => setSnackbar(null)} duration={4000}>
        {snackbar}
      </Snackbar>
    </>
  );
}
