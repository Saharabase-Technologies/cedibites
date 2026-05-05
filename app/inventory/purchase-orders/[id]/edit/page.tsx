import type { Metadata } from 'next';
import { PurchaseOrderForm } from '../../_components/PurchaseOrderForm';

export const metadata: Metadata = { title: 'Edit Purchase Order — Inventory' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PurchaseOrderForm mode="edit" id={Number(id)} />;
}
