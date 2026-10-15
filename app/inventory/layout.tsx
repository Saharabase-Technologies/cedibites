import type { Metadata } from 'next';
import { preload } from 'react-dom';
import InventoryLayoutClient from './layout-client';
import { GOOGLE_FONT_PRELOADS } from '../fonts/google-fonts-preload';

// Inter is served from our own files with the other Google fonts, and
// --font-inter is set in app/fonts/google-fonts.css. See
// scripts/fetch-google-fonts.mjs.

export const metadata: Metadata = {
  title: {
    template: '%s - Inventory | CediBites',
    default: 'Inventory',
  },
  robots: { index: false, follow: false },
  // Installed from a staff page, the app opens on staff sign-in rather than
  // the customer home page. See public/staff.webmanifest.
  manifest: '/staff.webmanifest',
};

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  for (const href of GOOGLE_FONT_PRELOADS.inventory) {
    preload(href, { as: 'font', type: 'font/woff2', crossOrigin: '' });
  }

  return (
    <div
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
