import type { Metadata } from 'next';
import { TransfersPage } from './_components/TransfersPage';

export const metadata: Metadata = { title: 'Transfers — Inventory' };

export default function Page() {
  return <TransfersPage />;
}
