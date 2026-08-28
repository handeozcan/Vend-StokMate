import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Button, Dialog, HelperText, Portal, Text, TextInput } from 'react-native-paper';
import type { ProductDto } from '@/types/api';
import { unitLabel } from '@/lib/enums';
import { useUpdateStock } from './hooks';

// Zod v4: `{ message }` customizes type errors.
const stockSchema = z.object({
  stock: z
    .number({ message: 'Stok girin.' })
    .int('Tam sayı girin.')
    .min(0, 'Stok negatif olamaz.'),
});

type StockFormValues = z.infer<typeof stockSchema>;

interface Props {
  product: ProductDto;
  /** Called with `true` after a successful save, `undefined` otherwise. */
  onClose: (updated?: boolean) => void;
}

export function StockDialog({ product, onClose }: Props) {
  const updateStock = useUpdateStock();
  const {
    control,
    handleSubmit,
  } = useForm<StockFormValues>({
    resolver: zodResolver(stockSchema),
    // Fresh defaults per product: the parent conditionally mounts this dialog.
    defaultValues: { stock: product.stock },
  });

  const onSubmit = handleSubmit((values) => {
    if (!updateStock.isPending) {
      updateStock.mutate({ id: product.id, stock: values.stock }, { onSuccess: () => onClose(true) });
    }
  });

  return (
    <Portal>
      <Dialog visible onDismiss={() => onClose()} style={{ backgroundColor: 'white' }}>
        {/* Expo keyboard rehberi: iOS "padding" / Android behavior undefined.
            Dialog tek çocuğu klonlayıp marginTop verir; ilk öğe Title olduğu
            için görsel fark yok. */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Dialog.Title>Stok Güncelle — {product.name}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ opacity: 0.6, marginBottom: 12 }}>
              Mevcut stok: {product.stock} {unitLabel(product.unit)} · Kritik eşik: {product.minStock}
            </Text>
            {updateStock.isError && (
              <HelperText type="error" visible style={{ fontSize: 14 }}>
                {updateStock.error.message}
              </HelperText>
            )}
            <Controller
              control={control}
              name="stock"
              render={({ field, fieldState }) => (
                <View>
                  <TextInput
                    label="Yeni stok"
                    keyboardType="number-pad"
                    value={field.value == null || Number.isNaN(field.value) ? '' : String(field.value)}
                    onChangeText={(text) => {
                      // Digits only, leading zeros stripped ("007"→"7", lone "0"
                      // stays). Empty → NaN: NOT undefined — RHF's Controller
                      // falls back to defaultValues on undefined, which made the
                      // field unclearable (it snapped back to the old stock).
                      const digits = text.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
                      field.onChange(digits === '' ? Number.NaN : Number(digits));
                    }}
                    onBlur={field.onBlur}
                    error={Boolean(fieldState.error)}
                  />
                  {fieldState.error && (
                    <HelperText type="error" visible>
                      {fieldState.error.message}
                    </HelperText>
                  )}
                </View>
              )}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => onClose()}>Vazgeç</Button>
            <Button onPress={onSubmit} disabled={updateStock.isPending} loading={updateStock.isPending}>
              Kaydet
            </Button>
          </Dialog.Actions>
        </KeyboardAvoidingView>
      </Dialog>
    </Portal>
  );
}
