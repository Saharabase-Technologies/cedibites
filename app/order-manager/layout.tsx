import type { Metadata } from 'next';
import OrderManagerLayoutClient from './layout-client';

export const metadata: Metadata = {
  title: 'Order Manager',
  robots: { index: false, follow: false },
};

export default function OrderManagerLayout({ children }: { children: React.ReactNode }) {
  return <OrderManagerLayoutClient>{children}</OrderManagerLayoutClient>;
}
