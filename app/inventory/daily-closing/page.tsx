import type { Metadata } from 'next';
import ComingSoon from '../_components/ComingSoon';

export const metadata: Metadata = { title: 'Daily Closing' };

export default function DailyClosingPage() {
  return <ComingSoon title="Daily Closing" description="Daily closing stock entry coming soon." />;
}
