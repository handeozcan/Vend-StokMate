import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { View } from 'react-native';
import {
  Button,
  HelperText,
  Surface,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import type { ProductDto, ProductStatus, ProductUnit, UpdateProductRequest } from '@/types/api';
import { STATUS_LABELS, UNIT_LABELS } from '@/lib/enums';
import { toKurus } from '@/lib/format';
import { useBrands, useCategories, useSuppliers } from '@/features/lookups/hooks';
import { useUpdateProduct } from './hooks';
import { SelectField } from './select-field';
import { productEditSchema, type ProductEditFormValues } from './edit-schema';

// Keep digits and at most the FIRST dot ("1.2.3" would Number() to NaN).
// Empty/junk-only input ("abc") → NaN sentinel: z.number() rejects it with the
// field's message. NOT undefined — RHF's Controller falls back to defaultValues
// on undefined, which made cleared fields snap back (unclearable input bug).
const numeric = (text: string): number => {
  const [head, ...rest] = text.replace(/[^0-9.]/g, '').split('.');
  const cleaned = [head, rest.join('')].filter(Boolean).join('.');
  return cleaned === '' ? Number.NaN : Number(cleaned);
};

interface Props {
  product: ProductDto;
  onSaved: () => void;
}

export function EditForm({ product, onSaved }: Props) {
  const categories = useCategories();
  const brands = useBrands();
  const suppliers = useSuppliers();
  const updateProduct = useUpdateProduct();

  const {
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<ProductEditFormValues>({
    resolver: zodResolver(productEditSchema),
    defaultValues: {
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      categoryId: product.categoryId,
      brandId: product.brandId,
      price: product.price / 100,
      stock: product.stock,
      minStock: product.minStock,
      unit: product.unit,
      status: product.status,
      isFeatured: product.isFeatured,
    },
  });

  const onSubmit = handleSubmit((values) => {
    if (updateProduct.isPending) return;
    const body: UpdateProductRequest = {
      name: values.name,
      sku: values.sku,
      barcode: values.barcode,
      categoryId: values.categoryId,
      brandId: values.brandId,
      // PUT is a full replace and no GET returns these three (API trap), but
      // the fields are hidden from the form — send neutral values instead of
      // forcing a re-entry of values the user can never see. supplierId must
      // reference an existing supplier; costPrice 0 and empty description are
      // both accepted by the API.
      supplierId: suppliers.data?.[0]?.id ?? 1,
      price: toKurus(values.price),
      costPrice: 0,
      stock: values.stock,
      minStock: values.minStock,
      unit: values.unit as ProductUnit,
      status: values.status as ProductStatus,
      description: '',
      isFeatured: values.isFeatured,
    };
    updateProduct.mutate(
      { id: product.id, body },
      {
        onSuccess: onSaved,
        onError: (error) => {
          if (error instanceof Error && (error as { status?: number }).status === 409) {
            setError('sku', { message: error.message });
            setFocus('sku');
          }
        },
      },
    );
  });

  return (
    <Surface style={{ borderRadius: 16, padding: 16, gap: 12 }} elevation={1}>
      <Text variant="titleLarge">Ürünü Düzenle</Text>

      {updateProduct.isError &&
        (updateProduct.error as { status?: number }).status !== 409 && (
          <HelperText type="error" visible style={{ fontSize: 14 }}>
            {updateProduct.error.message}
          </HelperText>
        )}

      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <View>
            <TextInput label="Ürün adı" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={Boolean(fieldState.error)} />
            {fieldState.error && <HelperText type="error" visible>{fieldState.error.message}</HelperText>}
          </View>
        )}
      />
      <Controller
        control={control}
        name="sku"
        render={({ field, fieldState }) => (
          <View>
            {/* ref wires RHF's setFocus('sku') for the 409 conflict case */}
            <TextInput ref={field.ref} label="Stok kodu (SKU)" autoCapitalize="none" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={Boolean(fieldState.error)} />
            {fieldState.error && <HelperText type="error" visible>{fieldState.error.message}</HelperText>}
          </View>
        )}
      />
      <Controller
        control={control}
        name="barcode"
        render={({ field, fieldState }) => (
          <View>
            <TextInput label="Barkod" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={Boolean(fieldState.error)} />
            {fieldState.error && <HelperText type="error" visible>{fieldState.error.message}</HelperText>}
          </View>
        )}
      />

      <SelectField
        label="Kategori"
        control={control}
        name="categoryId"
        error={errors.categoryId}
        options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
      />

      <SelectField
        label="Marka"
        control={control}
        name="brandId"
        error={errors.brandId}
        options={(brands.data ?? []).map((b) => ({ value: b.id, label: b.name }))}
      />

      <Controller
        control={control}
        name="price"
        render={({ field, fieldState }) => (
          <View>
            <TextInput
              label="Fiyat (TL)"
              keyboardType="decimal-pad"
              value={field.value == null || Number.isNaN(field.value) ? '' : String(field.value)}
              onChangeText={(t) => field.onChange(numeric(t))}
              onBlur={field.onBlur}
              error={Boolean(fieldState.error)}
            />
            {fieldState.error && <HelperText type="error" visible>{fieldState.error.message}</HelperText>}
          </View>
        )}
      />
      <Controller
        control={control}
        name="stock"
        render={({ field, fieldState }) => (
          <View>
            <TextInput
              label="Stok"
              keyboardType="number-pad"
              value={field.value == null || Number.isNaN(field.value) ? '' : String(field.value)}
              onChangeText={(t) => field.onChange(numeric(t))}
              onBlur={field.onBlur}
              error={Boolean(fieldState.error)}
            />
            {fieldState.error && <HelperText type="error" visible>{fieldState.error.message}</HelperText>}
          </View>
        )}
      />
      <Controller
        control={control}
        name="minStock"
        render={({ field, fieldState }) => (
          <View>
            <TextInput
              label="Minimum stok"
              keyboardType="number-pad"
              value={field.value == null || Number.isNaN(field.value) ? '' : String(field.value)}
              onChangeText={(t) => field.onChange(numeric(t))}
              onBlur={field.onBlur}
              error={Boolean(fieldState.error)}
            />
            {fieldState.error && <HelperText type="error" visible>{fieldState.error.message}</HelperText>}
          </View>
        )}
      />

      <SelectField
        label="Birim"
        control={control}
        name="unit"
        error={errors.unit}
        options={Object.entries(UNIT_LABELS).map(([key, label]) => ({
          value: Number(key),
          label,
        }))}
      />

      <SelectField
        label="Durum"
        control={control}
        name="status"
        error={errors.status}
        options={Object.entries(STATUS_LABELS).map(([key, label]) => ({
          value: Number(key),
          label,
        }))}
      />

      <Controller
        control={control}
        name="isFeatured"
        render={({ field }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Switch value={field.value} onValueChange={field.onChange} />
            <Text>Öne çıkan ürün</Text>
          </View>
        )}
      />

      <Button mode="contained" onPress={onSubmit} disabled={updateProduct.isPending} loading={updateProduct.isPending}>
        Kaydet
      </Button>
    </Surface>
  );
}
