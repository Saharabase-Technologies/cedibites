import type { Metadata } from 'next';
import { RequisitionForm } from '../../_components/RequisitionForm';

export const metadata: Metadata = { title: 'Edit Requisition — Inventory' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RequisitionForm mode="edit" id={Number(id)} />;
}
