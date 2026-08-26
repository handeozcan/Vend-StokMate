import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { View } from 'react-native';
import {
  Banner,
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
// Junk-only input ("abc") cleans to '' → undefined, never a silent 0.
const numeric = (text: string): number | undefined => {
  const [head, ...rest] = text.replace(/[^0-9.]/g, '').split('.');
  const cleaned = [head, rest.join('')].filter(Boolean).join('.');
  return cleaned === '' ? undefined : Number(cleaned);
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
      // No GET returns these three — they start empty and MUST be re-entered.
      supplierId: 0,
      price: product.price / 100,
      costPrice: undefined as unknown as number, // NOT NaN: renders "NaN" in inputs
      stock: product.stock,
      minStock: product.minStock,
      unit: product.unit,
      status: product.status,
      description: '',
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
      supplierId: values.supplierId,
      price: toKurus(values.price),
      costPrice: toKurus(values.costPrice),
      stock: values.stock,
      minStock: values.minStock,
      unit: values.unit as ProductUnit,
      status: values.status as ProductStatus,
      description: values.description,
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

      <Banner visible icon="information">
        Tedarikçi, maliyet ve açıklama alanları önceki değerlerini API&apos;den alamıyor (API hiçbir
        listeleme ucunda bu alanları döndürmüyor). Kaydetmek bu üç alanı girdiğiniz değerlerle
        üzerine yazar.
      </Banner>

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

      <SelectField
        label="Tedarikçi"
        control={control}
        name="supplierId"
        error={errors.supplierId}
        options={[
          { value: 0, label: 'Seçin…', disabled: true },
          ...(suppliers.data ?? []).map((s) => ({ value: s.id, label: s.name })),
        ]}
      />

      <Controller
        control={control}
        name="price"
        render={({ field, fieldState }) => (
          <View>
            <TextInput
              label="Fiyat (TL)"
              keyboardType="decimal-pad"
              value={field.value === undefined ? '' : String(field.value)}
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
        name="costPrice"
        render={({ field, fieldState }) => (
          <View>
            <TextInput
              label="Maliyet (TL)"
              keyboardType="decimal-pad"
              value={field.value === undefined ? '' : String(field.value)}
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
              value={field.value === undefined ? '' : String(field.value)}
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
              value={field.value === undefined ? '' : String(field.value)}
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

      <Controller
        control={control}
        name="description"
        render={({ field, fieldState }) => (
          <View>
            <TextInput
              label="Açıklama"
              multiline
              numberOfLines={3}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={Boolean(fieldState.error)}
            />
            {fieldState.error && <HelperText type="error" visible>{fieldState.error.message}</HelperText>}
          </View>
        )}
      />

      <Button mode="contained" onPress={onSubmit} disabled={updateProduct.isPending} loading={updateProduct.isPending}>
        Kaydet
      </Button>
    </Surface>
  );
}
