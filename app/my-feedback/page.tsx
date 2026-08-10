import type { Metadata } from 'next';
import { MyFeedbackPage } from './_components/MyFeedbackPage';

export const metadata: Metadata = { title: 'My feedback · CediBites' };

export default function Page() {
  return <MyFeedbackPage />;
}
