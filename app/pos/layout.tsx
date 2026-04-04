import type { Metadata } from 'next';
import POSLayoutClient from './layout-client';

export const metadata: Metadata = {
  title: {
    template: '%s — POS | CediBites',
    default: 'POS',
  },
  robots: { index: false, follow: false },
};

export default function POSLayout({ children }: { children: React.ReactNode }) {
  return <POSLayoutClient>{children}</POSLayoutClient>;
}
