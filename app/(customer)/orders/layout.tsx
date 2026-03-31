import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Track Your Order',
  description: 'Enter your order code to get real-time updates on your CediBites delivery.',
  openGraph: {
    title: 'Track Your Order | CediBites',
    url: 'https://app.cedibites.com/orders',
  },
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
