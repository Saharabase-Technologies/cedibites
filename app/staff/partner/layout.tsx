import type { Metadata } from 'next';
import PartnerLayoutClient from './layout-client';

export const metadata: Metadata = {
  title: {
    template: '%s — Partner | CediBites',
    default: 'Partner',
  },
};

export default function StaffPartnerLayout({ children }: { children: React.ReactNode }) {
  return <PartnerLayoutClient>{children}</PartnerLayoutClient>;
}
