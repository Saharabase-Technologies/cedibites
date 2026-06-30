import type { Metadata } from 'next';
import ProductionPage from './_components/ProductionPage';

export const metadata: Metadata = { title: 'Production — Inventory' };

export default function Page() {
  return <ProductionPage />;
}
