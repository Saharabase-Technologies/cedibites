import type { Metadata } from 'next';
import KitchenLayoutClient from './layout-client';

export const metadata: Metadata = {
  title: {
    template: '%s — Kitchen | CediBites',
    default: 'Kitchen',
  },
  robots: { index: false, follow: false },
};

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return <KitchenLayoutClient>{children}</KitchenLayoutClient>;
}
