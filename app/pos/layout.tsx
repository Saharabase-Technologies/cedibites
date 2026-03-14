'use client';

import { ReactNode } from 'react';
import { POSProvider } from './context';
import './pos-animations.css';

interface POSLayoutProps {
  children: ReactNode;
}

export default function POSLayout({ children }: POSLayoutProps) {
  return (
    <POSProvider>
      <div className="min-h-dvh bg-neutral-card text-text-dark overflow-hidden select-none">
        {children}
      </div>
    </POSProvider>
  );
}
