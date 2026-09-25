import type { Metadata } from 'next';
import StaffLayoutClient from './layout-client';

export const metadata: Metadata = {
  title: {
    template: '%s · Staff | CediBites',
    default: 'Staff Portal',
  },
  robots: { index: false, follow: false },
  // Installed from a staff page, the app opens on staff sign-in rather than
  // the customer home page. See public/staff.webmanifest.
  manifest: '/staff.webmanifest',
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <StaffLayoutClient>{children}</StaffLayoutClient>;
}
