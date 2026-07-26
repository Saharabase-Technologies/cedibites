import type { Metadata } from 'next';
import ItemDetailPage from '../_components/ItemDetailPage';

export const metadata: Metadata = { title: 'Item - Inventory' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ItemDetailPage id={Number(id)} />;
}
