'use client';

import { ReactNode } from 'react';
import { POSProvider } from './context';
import { StaffAuthProvider } from '@/app/components/providers/StaffAuthProvider';
import './pos-animations.css';

interface POSLayoutProps {
  children: ReactNode;
}

export default function POSLayout({ children }: POSLayoutProps) {
  return (
    <StaffAuthProvider>
      <POSProvider>
        <div className="min-h-dvh bg-neutral-card text-text-dark overflow-hidden select-none">
          {children}
        </div>
      </POSProvider>
    </StaffAuthProvider>
  );
}
