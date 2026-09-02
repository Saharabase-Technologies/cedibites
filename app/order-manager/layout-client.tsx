'use client';

import { ReactNode } from 'react';
import { StaffAuthProvider } from '@/app/components/providers/StaffAuthProvider';
import { InterruptionGateProvider } from '@/app/components/providers/InterruptionGate';
import { CautionInterstitial } from '@/app/components/messaging/CautionInterstitial';
import { ReleaseWalkthrough } from '@/app/components/messaging/ReleaseWalkthrough';

export default function OrderManagerLayout({ children }: { children: ReactNode }) {
  return (
    <StaffAuthProvider>
      {/* The board is its own shell — it renders inside neither the staff
          layout nor the POS — so it needs its own gate and its own copies of
          the two interstitials. Without them, the people who spend a whole
          shift on this screen were the only staff a walkthrough could never
          reach. The claim that keeps them off a busy board lives in the page,
          which is where the tickets are. */}
      <InterruptionGateProvider>
        {children}
        <CautionInterstitial />
        <ReleaseWalkthrough />
      </InterruptionGateProvider>
    </StaffAuthProvider>
  );
}
