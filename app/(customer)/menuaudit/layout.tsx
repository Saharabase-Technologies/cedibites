import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Menu Audit',
  robots: { index: false, follow: false },
};

export default function MenuAuditLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
