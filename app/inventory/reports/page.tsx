import type { Metadata } from 'next';
import ComingSoon from '../_components/ComingSoon';

export const metadata: Metadata = { title: 'Reports' };

export default function ReportsPage() {
  return <ComingSoon title="Reports" description="Stock Ledger, Variance, Wastage and other reports coming soon." />;
}
