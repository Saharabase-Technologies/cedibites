'use client';

import { useState, useEffect, useRef } from 'react';
import { useKitchen } from '../context';
import { useKitchenSounds } from '../hooks/useSounds';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { useSwitchKitchenBranch } from '../branch-context';
import BranchSwitcherDialog from '@/app/components/ui/BranchSwitcherDialog';
import type { Order } from '@/types/order';
import {
  TruckIcon,
  BagIcon,
  ShoppingBagIcon,
  ForkKnifeIcon,
  ArrowsOutIcon,
  ArrowsInIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
  StorefrontIcon,
  SignOutIcon,
} from '@phosphor-icons/react';

// ─── Elapsed timer hook ────────────────────────────────────────────────────

function useElapsed(placedAt: number): number {
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - placedAt) / 1000)
  );
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - placedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [placedAt]);
  return elapsed;
}

// ─── Order card ────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: Order;
  playUrgent: () => void;
}

function OrderCard({ order, playUrgent }: OrderCardProps) {
  const elapsed = useElapsed(order.placedAt);
  const hasAlertedRef = useRef(false);

  // Trigger urgent sound once when crossing 10 minutes
  useEffect(() => {
    if (elapsed >= 600 && !hasAlertedRef.current) {
      hasAlertedRef.current = true;
      playUrgent();
    }
  }, [elapsed, playUrgent]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timerStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const tier = elapsed < 300 ? 'green' : elapsed < 600 ? 'amber' : 'red';
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

  const FulfillmentIcon =
    order.fulfillmentType === 'delivery' ? TruckIcon
    : order.fulfillmentType === 'dine_in' ? ForkKnifeIcon
    : order.fulfillmentType === 'pickup' ? BagIcon
    : ShoppingBagIcon; // takeaway

  const cardCls =
    tier === 'green' ? 'bg-green-50 border-green-300' :
    tier === 'amber' ? 'bg-amber-50 border-amber-400' :
    'bg-red-50 border-red-500 kds-urgent';

  const numCls =
    tier === 'green' ? 'text-green-900' :
    tier === 'amber' ? 'text-amber-900' :
    'text-red-800';

  const timerCls =
    tier === 'green' ? 'text-green-700' :
    tier === 'amber' ? 'text-amber-700' :
    'text-red-600 font-extrabold';

  return (
    <div className={`rounded-2xl border-2 p-6 flex flex-col items-center gap-4 select-none ${cardCls}`}>
      <p className={`text-5xl font-black tracking-tight leading-none ${numCls}`}>
        {order.orderNumber}
      </p>
      <p className="text-sm font-medium text-black/50 text-center truncate w-full">
        {order.contact.name} · {itemCount} item{itemCount !== 1 ? 's' : ''}
      </p>
      <FulfillmentIcon size={22} weight="fill" className="text-black/30" />
      <p className={`text-3xl font-mono ${timerCls}`}>{timerStr}</p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function KitchenDisplayPage() {
  const {
    ordersByStatus,
    soundEnabled, setSoundEnabled,
    isFullscreen, toggleFullscreen,
  } = useKitchen();
  const { staffUser, logout } = useStaffAuth();
  const { branches } = useBranch();
  const { branchId: currentBranchId, switchBranch } = useSwitchKitchenBranch();

  const sounds = useKitchenSounds();
  const [isBranchSwitcherOpen, setIsBranchSwitcherOpen] = useState(false);

  const assignedIds: string[] = staffUser
    ? (staffUser.branchIds?.map(String) ?? (staffUser.branchId ? [String(staffUser.branchId)] : []))
    : [];
  const switchableBranches = assignedIds.length > 0
    ? branches.filter(b => assignedIds.includes(b.id))
    : branches;
  const currentBranchName = branches.find(b => b.id === currentBranchId)?.name;

  useEffect(() => {
    sounds.setEnabled(soundEnabled);
  }, [soundEnabled, sounds]);

  const activeOrders = [
    ...ordersByStatus.accepted,
    ...ordersByStatus.preparing,
  ].sort((a, b) => a.placedAt - b.placedAt);

  return (
    <>
      <style>{`
        @keyframes kds-flash {
          0%, 100% { background-color: rgb(254 242 242); }
          50%       { background-color: rgb(252 165 165); }
        }
        .kds-urgent { animation: kds-flash 1s ease-in-out infinite; }
      `}</style>

      <div className="min-h-dvh flex flex-col bg-gray-950 text-white">
        {/* Header */}
        <header className="shrink-0 flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-white/10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight">Kitchen Display</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-sm font-mono">
              {activeOrders.length} active
            </span>
          </div>
          <div className="flex items-center gap-2">
            {switchableBranches.length > 1 && (
              <button
                onClick={() => setIsBranchSwitcherOpen(true)}
                title="Switch Branch"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm"
              >
                <StorefrontIcon size={16} />
                {currentBranchName && (
                  <span className="hidden sm:inline">{currentBranchName}</span>
                )}
              </button>
            )}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              {soundEnabled ? <SpeakerHighIcon size={20} /> : <SpeakerSlashIcon size={20} />}
            </button>
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Go fullscreen'}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              {isFullscreen ? <ArrowsInIcon size={20} /> : <ArrowsOutIcon size={20} />}
            </button>
            <button
              onClick={logout}
              title="Sign out"
              className="p-2 rounded-lg bg-white/10 hover:bg-red-500/30 text-white/70 hover:text-red-300 transition-colors"
            >
              <SignOutIcon size={20} />
            </button>
          </div>
        </header>

        {/* Legend */}
        <div className="shrink-0 flex items-center gap-6 px-6 py-2 bg-gray-900/60 border-b border-white/5 text-xs font-medium text-white/40">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            0–5 min
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            5–10 min
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            10+ min
          </span>
        </div>

        {/* Order grid */}
        <main className="flex-1 p-6 overflow-y-auto">
          {activeOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-white/20">
              <ForkKnifeIcon size={64} weight="thin" />
              <p className="text-2xl font-light">No active orders</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {activeOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  playUrgent={sounds.playUrgent}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <BranchSwitcherDialog
        isOpen={isBranchSwitcherOpen}
        branches={switchableBranches}
        currentBranchId={currentBranchId}
        onSelect={id => { switchBranch(id); setIsBranchSwitcherOpen(false); }}
        onClose={() => setIsBranchSwitcherOpen(false)}
      />
    </>
  );
}
