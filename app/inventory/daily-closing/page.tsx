import type { Metadata } from 'next';
import { DailyClosingPage } from './_components/DailyClosingPage';

export const metadata: Metadata = { title: 'Daily Closing — Inventory' };

export default function Page() {
  return <DailyClosingPage />;
}
