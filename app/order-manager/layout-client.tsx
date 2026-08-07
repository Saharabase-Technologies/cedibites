'use client';

import { ReactNode } from 'react';
import { StaffAuthProvider } from '@/app/components/providers/StaffAuthProvider';

export default function OrderManagerLayout({ children }: { children: ReactNode }) {
  return (
    <StaffAuthProvider>
      {children}
    </StaffAuthProvider>
  );
}
