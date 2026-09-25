import type { Metadata } from 'next';
import AdminLayoutClient from './layout-client';

export const metadata: Metadata = {
  title: {
    template: '%s · Admin | CediBites',
    default: 'Admin',
  },
  robots: { index: false, follow: false },
  // Installed from a staff page, the app opens on staff sign-in rather than
  // the customer home page. See public/staff.webmanifest.
  manifest: '/staff.webmanifest',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
