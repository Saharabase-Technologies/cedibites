import type { Metadata } from 'next';
import { PurchaseOrderForm } from '../_components/PurchaseOrderForm';

export const metadata: Metadata = { title: 'New Purchase Order - Inventory' };

export default function Page() {
  return <PurchaseOrderForm mode="create" />;
}
