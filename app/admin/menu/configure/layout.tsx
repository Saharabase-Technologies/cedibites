import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Configure Menu' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
