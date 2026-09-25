import type { Metadata } from 'next';
import OrderManagerLayoutClient from './layout-client';

export const metadata: Metadata = {
  title: 'Order Manager',
  robots: { index: false, follow: false },
  // Installed from a staff page, the app opens on staff sign-in rather than
  // the customer home page. See public/staff.webmanifest.
  manifest: '/staff.webmanifest',
};

export default function OrderManagerLayout({ children }: { children: React.ReactNode }) {
  return <OrderManagerLayoutClient>{children}</OrderManagerLayoutClient>;
}
