import type { Metadata } from 'next';
import { FeedbackInboxPage } from './_components/FeedbackInboxPage';

export const metadata: Metadata = { title: 'Feedback — Admin' };

export default function Page() {
  return <FeedbackInboxPage />;
}
