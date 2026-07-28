import type { Metadata } from 'next';
import { MenuShell } from './_components/MenuShell';

export const metadata: Metadata = { title: 'Menu' };

/**
 * Shared by every menu tab. App Router keeps a layout mounted while you
 * navigate between its children, so the header and tabs persist and only the
 * page below re-renders.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <MenuShell>{children}</MenuShell>;
}
