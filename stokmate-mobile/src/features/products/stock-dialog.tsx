import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { View } from 'react-native';
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
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

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
      updateStock.mutate(
        { id: product.id, stock: values.stock },
        { onSuccess: () => onCloseRef.current(true) },
      );
    }
  });

  return (
    <Portal>
      <Dialog visible onDismiss={() => onClose()} style={{ backgroundColor: 'white' }}>
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
                  value={field.value === undefined ? '' : String(field.value)}
                  onChangeText={(text) => field.onChange(text === '' ? undefined : Number(text.replace(/[^0-9]/g, '')))}
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
      </Dialog>
    </Portal>
  );
}
