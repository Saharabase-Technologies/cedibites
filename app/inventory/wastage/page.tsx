import type { Metadata } from 'next';
import { WastagePage } from './_components/WastagePage';

export const metadata: Metadata = { title: 'Wastage' };

export default function Page() {
  return <WastagePage />;
}
