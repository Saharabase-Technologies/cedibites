import type { Metadata } from 'next';
import { RequisitionsPage } from './_components/RequisitionsPage';

export const metadata: Metadata = { title: 'Requisitions — Inventory' };

export default function Page() {
  return <RequisitionsPage />;
}
