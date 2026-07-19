import type { Metadata } from 'next';
import { DailyClosingDetailPage } from '../_components/DailyClosingDetailPage';

export const metadata: Metadata = { title: 'Daily Closing — Inventory' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DailyClosingDetailPage id={Number(id)} />;
}
