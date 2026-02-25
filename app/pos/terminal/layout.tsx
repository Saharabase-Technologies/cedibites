'use client';

import { ReactNode } from 'react';
import { POSProvider } from '../context';

export default function TerminalLayout({ children }: { children: ReactNode }) {
  return (
    <POSProvider>
      {children}
    </POSProvider>
  );
}
