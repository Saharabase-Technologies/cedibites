import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Order History',
  description: 'View your past CediBites orders.',
  robots: { index: false, follow: false },
};

export default function OrderHistoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
