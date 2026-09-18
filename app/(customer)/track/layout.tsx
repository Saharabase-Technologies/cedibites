import type { Metadata } from 'next';
import { OrderPrefixProvider } from '@/app/components/order/OrderPrefixProvider';
import { getOrderPrefix } from '@/lib/api/server';

export const metadata: Metadata = {
  title: 'Track an order',
  description: 'Enter your order code to see where your CediBites order has got to.',
  openGraph: {
    title: 'Track an order | CediBites',
    url: 'https://app.cedibites.com/track',
  },
};

export default async function TrackLayout({ children }: { children: React.ReactNode }) {
  const prefix = await getOrderPrefix();

  return <OrderPrefixProvider value={prefix}>{children}</OrderPrefixProvider>;
}
