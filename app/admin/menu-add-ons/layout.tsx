import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Menu Add-ons' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
