import type { Metadata } from 'next';
import { WastageDetailPage } from '../_components/WastageDetailPage';

export const metadata: Metadata = { title: 'Wastage' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WastageDetailPage id={Number(id)} />;
}
