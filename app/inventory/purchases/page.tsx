import type { Metadata } from 'next';
import ComingSoon from '../_components/ComingSoon';

export const metadata: Metadata = { title: 'Purchases — Inventory' };

export default function Page() {
  return (
    <ComingSoon
      title="Purchases"
      description="Record receipts against purchase orders. Coming in the next chunk."
    />
  );
}
