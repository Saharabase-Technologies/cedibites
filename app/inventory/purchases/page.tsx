import type { Metadata } from 'next';
import { PurchasesPage } from './_components/PurchasesPage';

export const metadata: Metadata = { title: 'Purchases — Inventory' };

export default function Page() {
  return <PurchasesPage />;
}
