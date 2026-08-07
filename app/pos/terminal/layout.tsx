import type { Metadata } from 'next';
import TerminalLayoutClient from './layout-client';

export const metadata: Metadata = {
  title: 'Terminal',
};

export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  return <TerminalLayoutClient>{children}</TerminalLayoutClient>;
}
