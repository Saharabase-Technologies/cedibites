import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import InventoryLayoutClient from './layout-client';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: {
    template: '%s - Inventory | CediBites',
    default: 'Inventory',
  },
  robots: { index: false, follow: false },
};

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={inter.variable}
      style={
        {
          '--font-family-brand': 'var(--font-inter), sans-serif',
          '--font-family-body':  'var(--font-inter), sans-serif',
          fontFamily:            'var(--font-inter), sans-serif',
        } as React.CSSProperties
      }
    >
      <InventoryLayoutClient>{children}</InventoryLayoutClient>
    </div>
  );
}
