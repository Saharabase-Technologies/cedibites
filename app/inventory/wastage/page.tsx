import type { Metadata } from 'next';
import ComingSoon from '../_components/ComingSoon';

export const metadata: Metadata = { title: 'Wastage' };

export default function WastagePage() {
  return <ComingSoon title="Wastage" description="Wastage recording and approval coming soon." />;
}
