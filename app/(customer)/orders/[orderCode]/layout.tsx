import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Track Order',
  description: 'Track the live status of your CediBites order.',
  robots: { index: false, follow: false },
};

export default function OrderCodeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
