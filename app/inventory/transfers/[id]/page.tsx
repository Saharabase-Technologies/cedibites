import type { Metadata } from 'next';
import { TransferDetailPage } from '../_components/TransferDetailPage';

export const metadata: Metadata = { title: 'Transfer - Inventory' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TransferDetailPage id={Number(id)} />;
}
