'use client';

import { ReactNode } from 'react';
import { KitchenProvider } from './context';

export default function KitchenLayout({ children }: { children: ReactNode }) {
  return (
    <KitchenProvider>
      <div className="min-h-dvh bg-neutral-light text-text-dark overflow-hidden select-none">
        {children}
      </div>
    </KitchenProvider>
  );
}
