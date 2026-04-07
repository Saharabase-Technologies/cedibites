import type { Metadata } from 'next';
import StaffLayoutClient from './layout-client';

export const metadata: Metadata = {
  title: {
    template: '%s — Staff | CediBites',
    default: 'Staff Portal',
  },
  robots: { index: false, follow: false },
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <StaffLayoutClient>{children}</StaffLayoutClient>;
}
