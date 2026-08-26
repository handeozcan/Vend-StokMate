import type { Metadata } from 'next';
import { connection } from 'next/server';
import { ProductDetailView } from '@/features/products/ProductDetailView';

// The product name isn't available server-side (client-side data) — static title.
export const metadata: Metadata = { title: 'Ürün Detayı' };

export default async function ProductDetailPage({
  params,
}: PageProps<'/products/[id]'>) {
  await connection();
  // Next 16: params is a Promise — await it in the server page, pass a plain
  // prop to the client view.
  const { id } = await params;
  return <ProductDetailView id={Number(id)} />;
}
