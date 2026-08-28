import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAwareScrollView, KeyboardToolbar } from 'react-native-keyboard-controller';
import { Chip, Snackbar, Surface, Text } from 'react-native-paper';
import { useProduct } from '@/features/products/hooks';
import { EditForm } from '@/features/products/edit-form';

export default function ProductEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const productId = Number(id);
  const product = useProduct(Number.isFinite(productId) && productId > 0 ? productId : -1);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // Invalid route param is its own branch (a disabled query never resolves).
  if (!Number.isFinite(productId) || productId <= 0) {
    return (
      <Surface style={{ margin: 16, borderRadius: 12, padding: 24, alignItems: 'center' }}>
        <Text variant="bodyMedium" style={{ opacity: 0.7 }}>Ürün bulunamadı.</Text>
      </Surface>
    );
  }

  if (product.isPending && !product.isPlaceholderData)
    return <Text style={{ padding: 16, opacity: 0.6 }}>Yükleniyor…</Text>;

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

  return (
    <>
      {/* Expo keyboard rehberi: çok inputlu form → KeyboardAwareScrollView
          focuslanan input'u klavyenin üstüne otomatik kaydırır; KeyboardToolbar
          alanlar arası ileri/geri + kapatma verir. bottomOffset = input'un
          altındaki hata mesajı payı. */}
      <KeyboardAwareScrollView
        bottomOffset={62}
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <EditForm
          product={product.data}
          onSaved={() => {
            // Success feedback HERE (a toast on the next screen would mount
            // too late) — brief Snackbar, then navigate to the detail.
            setSnackbar('Ürün güncellendi.');
            setTimeout(() => router.dismissTo(`/product/${productId}`), 700);
          }}
        />
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
      <Snackbar visible={snackbar !== null} onDismiss={() => setSnackbar(null)} duration={1400}>
        {snackbar}
      </Snackbar>
    </>
  );
}
