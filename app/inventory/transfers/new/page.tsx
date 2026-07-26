import type { Metadata } from 'next';
import { TransferForm } from '../_components/TransferForm';

export const metadata: Metadata = { title: 'New Transfer - Inventory' };

export default function Page() {
  return <TransferForm mode="create" />;
}
