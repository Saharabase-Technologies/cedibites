import type { Metadata } from 'next';
import { DailyConsumptionReport } from './_components/DailyConsumptionReport';

export const metadata: Metadata = { title: 'Reports' };

export default function ReportsPage() {
  return <DailyConsumptionReport />;
}
