import type { Metadata } from 'next';
import ComingSoon from '../_components/ComingSoon';

export const metadata: Metadata = { title: 'Transfers' };

export default function TransfersPage() {
  return <ComingSoon title="Transfers" description="Stock transfer management coming soon." />;
}
