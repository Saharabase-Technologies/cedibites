import type { Metadata } from 'next';
import { PurchaseOrdersPage } from './_components/PurchaseOrdersPage';

export const metadata: Metadata = { title: 'Purchase Orders — Inventory' };

export default function Page() {
  return <PurchaseOrdersPage />;
}
