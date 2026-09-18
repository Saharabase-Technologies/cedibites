import type { Metadata } from 'next';
import { OrderPrefixProvider } from '@/app/components/order/OrderPrefixProvider';
import { getOrderPrefix } from '@/lib/api/server';

export const metadata: Metadata = {
  title: 'My Orders',
  description: 'Every order you have placed with CediBites.',
  robots: { index: false, follow: false },
};

/**
 * The prefix is read here, on the server, so the tracking field is already
 * showing the right letters in the HTML the browser receives. Fetched from an
 * effect it arrived after first paint, and the field visibly rewrote itself.
 */
export default async function OrdersLayout({ children }: { children: React.ReactNode }) {
  const prefix = await getOrderPrefix();

  return <OrderPrefixProvider value={prefix}>{children}</OrderPrefixProvider>;
}
