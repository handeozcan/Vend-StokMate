import type { Metadata } from 'next';
import { connection } from 'next/server';
import { ProductListView } from '@/features/products/ProductListView';

export const metadata: Metadata = { title: 'Ürünler' };

// This build's prerender check rejects useSearchParams (used by the (authed)
// client layout) for this route even with connection(). force-dynamic is
// soft-deprecated but valid; behavior is identical to the intended dynamic
// rendering.
export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  await connection();
  return <ProductListView />;
}
