import type { Metadata } from 'next';
import { RequisitionDetailPage } from '../_components/RequisitionDetailPage';

export const metadata: Metadata = { title: 'Requisition — Inventory' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RequisitionDetailPage id={Number(id)} />;
}
