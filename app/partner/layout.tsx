import type { Metadata } from 'next';
import PartnerLayoutClient from './layout-client';

export const metadata: Metadata = {
  title: {
    template: '%s · Partner | CediBites',
    default: 'Partner',
  },
  robots: { index: false, follow: false },
  // Installed from a staff page, the app opens on staff sign-in rather than
  // the customer home page. See public/staff.webmanifest.
  manifest: '/staff.webmanifest',
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <PartnerLayoutClient>{children}</PartnerLayoutClient>;
}
