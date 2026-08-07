import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'New Sales Order' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
