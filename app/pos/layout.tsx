import type { Metadata } from 'next';
import POSLayoutClient from './layout-client';

export const metadata: Metadata = {
  title: {
    template: '%s · POS | CediBites',
    default: 'POS',
  },
  robots: { index: false, follow: false },
  // Installed from a staff page, the app opens on staff sign-in rather than
  // the customer home page. See public/staff.webmanifest.
  manifest: '/staff.webmanifest',
};

export default function POSLayout({ children }: { children: React.ReactNode }) {
  return <POSLayoutClient>{children}</POSLayoutClient>;
}
