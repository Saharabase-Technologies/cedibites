import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Track an order',
  description: 'Enter your order code to see where your CediBites order has got to.',
  openGraph: {
    title: 'Track an order | CediBites',
    url: 'https://app.cedibites.com/track',
  },
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
