'use client';

import { ReactNode } from 'react';
import './pos-animations.css';

interface POSLayoutProps {
  children: ReactNode;
}

export default function POSLayout({ children }: POSLayoutProps) {
  return (
    <div className="min-h-dvh bg-brand-darker text-neutral-light overflow-hidden select-none">
      {children}
    </div>
  );
}
