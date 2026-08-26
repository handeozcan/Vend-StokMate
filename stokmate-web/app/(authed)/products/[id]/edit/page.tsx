import type { Metadata } from 'next';
import { connection } from 'next/server';
import { ProductEditView } from '@/features/products/ProductEditView';

export const metadata: Metadata = { title: 'Ürünü Düzenle' };

export default async function ProductEditPage({
  params,
}: PageProps<'/products/[id]/edit'>) {
  await connection();
  const { id } = await params;
  return <ProductEditView id={Number(id)} />;
}
