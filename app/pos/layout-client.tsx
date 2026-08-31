'use client';

import { ReactNode } from 'react';
import { POSProvider } from './context';
import { StaffAuthProvider } from '@/app/components/providers/StaffAuthProvider';
import { InterruptionGateProvider } from '@/app/components/providers/InterruptionGate';
import { CautionInterstitial } from '@/app/components/messaging/CautionInterstitial';
import { ReleaseWalkthrough } from '@/app/components/messaging/ReleaseWalkthrough';
import { POSInterruptionClaim } from './components/POSInterruptionClaim';
import { OnlineOrderBanner } from './components/OnlineOrderBanner';
import './pos-animations.css';

interface POSLayoutProps {
  children: ReactNode;
}

export default function POSLayout({ children }: POSLayoutProps) {
  return (
    <StaffAuthProvider>
      {/* The POS is its own shell, so it needs its own gate and its own copy of
          the interstitial — it never renders inside the staff layout. The claim
          sits INSIDE POSProvider because it reads the cart. */}
      <InterruptionGateProvider>
        <POSProvider>
          <POSInterruptionClaim />
          <div className="min-h-dvh bg-neutral-card text-text-dark overflow-hidden select-none">
            {children}
          </div>
          {/* In the shell, not on the orders page: the cashier is almost always
              mid-sale on the terminal when an online order lands, which is
              exactly when it would otherwise go unnoticed. */}
          <OnlineOrderBanner />
          <CautionInterstitial />
          <ReleaseWalkthrough />
        </POSProvider>
      </InterruptionGateProvider>
    </StaffAuthProvider>
  );
}
