import type { Metadata } from 'next';
import { ReconciliationPage } from './_components/ReconciliationPage';

export const metadata: Metadata = { title: 'Reconciliation — Inventory' };

export default function Page() {
  return <ReconciliationPage />;
}
