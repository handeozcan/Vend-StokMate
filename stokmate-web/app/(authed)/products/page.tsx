import type { Metadata } from 'next';
import { connection } from 'next/server';
import { ProductListView } from '@/features/products/ProductListView';

export const metadata: Metadata = { title: 'Ürünler' };

export default async function ProductsPage() {
  await connection();
  return <ProductListView />;
}

export const dynamic = 'force-dynamic';
