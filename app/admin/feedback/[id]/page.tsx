import type { Metadata } from 'next';
import { FeedbackDetailPage } from '../_components/FeedbackDetailPage';

export const metadata: Metadata = { title: 'Feedback report · Admin' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FeedbackDetailPage id={Number(id)} />;
}
