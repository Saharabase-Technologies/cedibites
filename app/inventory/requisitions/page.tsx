import type { Metadata } from 'next';
import ComingSoon from '../_components/ComingSoon';

export const metadata: Metadata = { title: 'Requisitions' };

export default function RequisitionsPage() {
  return <ComingSoon title="Requisitions" description="Requisition management coming soon." />;
}
