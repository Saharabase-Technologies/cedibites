import type { Metadata } from 'next';
import PartnerLayoutClient from './layout-client';

export const metadata: Metadata = {
  title: {
    template: '%s — Partner | CediBites',
    default: 'Partner',
  },
  robots: { index: false, follow: false },
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <PartnerLayoutClient>{children}</PartnerLayoutClient>;
}
