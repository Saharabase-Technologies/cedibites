'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  MonitorIcon,
  DeviceTabletIcon,
  ArrowRightIcon,
} from '@phosphor-icons/react';

export default function KitchenLandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-white">
      {/* Logo */}
      <Image src="/cblogo.webp" alt="CediBites" width={64} height={64} className="mb-4" />

      <h1 className="text-2xl font-bold text-text-dark mb-1 text-center font-body">
        Kitchen Display
      </h1>
      <p className="text-neutral-gray text-sm text-center mb-10 max-w-sm font-body">
        Choose a view mode for the kitchen
      </p>

      {/* Mode Selection */}
      <div className="w-full max-w-lg flex flex-col gap-3">
        {/* TV Display */}
        <button
          onClick={() => router.push('/kitchen/display')}
          className="
            w-full px-5 py-4 rounded-2xl bg-neutral-card/25 text-left
            border border-brown-light/30 hover:border-brown-light/75
            active:scale-[0.98] transition-all duration-150 group
            flex items-center gap-4
          "
        >
          <div className="w-12 h-12 rounded-xl bg-brown/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <MonitorIcon className="w-6 h-6 text-brown" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-text-dark font-body flex items-center gap-2">
              TV Display
              <ArrowRightIcon className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
            </h2>
            <p className="text-neutral-gray text-xs font-body mt-0.5">
              Read-only board for a mounted screen
            </p>
          </div>
        </button>

        {/* Tablet Control */}
        <button
          onClick={() => router.push('/kitchen/control')}
          className="
            w-full px-5 py-4 rounded-2xl bg-neutral-card/25 text-left
            border border-brown-light/30 hover:border-brown-light/75
            active:scale-[0.98] transition-all duration-150 group
            flex items-center gap-4
          "
        >
          <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <DeviceTabletIcon className="w-6 h-6 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-text-dark font-body flex items-center gap-2">
              Tablet Control
              <ArrowRightIcon className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
            </h2>
            <p className="text-neutral-gray text-xs font-body mt-0.5">
              Accept, cook, and complete orders
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
