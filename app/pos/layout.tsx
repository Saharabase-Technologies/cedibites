'use client';

import { ReactNode } from 'react';
import './pos-animations.css';

interface POSLayoutProps {
  children: ReactNode;
}

export default function POSLayout({ children }: POSLayoutProps) {
  return (
    <div className="min-h-dvh bg-neutral-light text-text-dark overflow-hidden select-none">
      {children}
    </div>
  );
}
