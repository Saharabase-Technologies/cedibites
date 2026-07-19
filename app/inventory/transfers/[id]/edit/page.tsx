import type { Metadata } from 'next';
import { TransferForm } from '../../_components/TransferForm';

export const metadata: Metadata = { title: 'Edit Transfer — Inventory' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TransferForm mode="edit" id={Number(id)} />;
}
