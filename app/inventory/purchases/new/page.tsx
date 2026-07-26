import type { Metadata } from 'next';
import { RecordPurchaseForm } from '../_components/RecordPurchaseForm';

export const metadata: Metadata = { title: 'Record Purchase - Inventory' };

export default function Page() {
  return <RecordPurchaseForm />;
}
