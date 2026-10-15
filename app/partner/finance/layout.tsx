import type { Metadata } from 'next';
import PartnerFinanceShell from './layout-client';

export const metadata: Metadata = { title: 'Finance' };

/**
 * Shared by the three Finance tabs, as in the admin portal. App Router keeps
 * a layout mounted while you move between its children, so the ledger is read
 * once and the filters hold from tab to tab.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PartnerFinanceShell>{children}</PartnerFinanceShell>;
}
