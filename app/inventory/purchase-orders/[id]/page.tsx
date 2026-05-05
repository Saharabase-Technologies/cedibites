import type { Metadata } from 'next';
import { PurchaseOrderDetailPage } from '../_components/PurchaseOrderDetailPage';

export const metadata: Metadata = { title: 'Purchase Order — Inventory' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PurchaseOrderDetailPage id={Number(id)} />;
}
