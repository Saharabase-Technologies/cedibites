'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  StorefrontIcon,
  ArrowLeftIcon,
  SignOutIcon,
  SpinnerIcon,
  ClockIcon,
  CheckCircleIcon,
  PrinterIcon,
  UserIcon,
  NoteIcon,
  PhoneIcon,
  FlaskIcon,
} from '@phosphor-icons/react';
import { usePOS } from '../context';
import type { Order } from '@/types/order';
import { formatGHS } from '@/lib/utils/currency';
import { BRANCHES } from '@/app/components/providers/BranchProvider';
import { printReceipt } from '@/lib/utils/printReceipt';
import { STATUS_CONFIG, FULFILLMENT_LABELS } from '@/lib/constants/order.constants';

type FilterTab = 'all' | 'active' | 'ready' | 'done';

function formatOrderTime(placedAt: number): string {
  const d = new Date(placedAt);
  return d.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function POSOrdersPage() {
  const router = useRouter();
  const {
    session,
    isSessionValid,
    isSessionLoaded,
    todayOrders,
    updateOrderStatus,
    seedTestOrders,
    logout,
  } = usePOS();

  const [activeTab, setActiveTab] = useState<FilterTab>('active');

  useEffect(() => {
    if (isSessionLoaded && !isSessionValid) {
      router.replace('/pos');
    }
  }, [isSessionLoaded, isSessionValid, router]);

  const branchInfo = useMemo(
    () => session ? BRANCHES.find(b => b.id === session.branchId) ?? null : null,
    [session]
  );

  const filteredOrders = useMemo(() => {
    switch (activeTab) {
      case 'active': return todayOrders.filter(o => o.status === 'received' || o.status === 'preparing');
      case 'ready': return todayOrders.filter(o => o.status === 'ready');
      case 'done': return todayOrders.filter(o => o.status === 'completed');
      default: return todayOrders;
    }
  }, [todayOrders, activeTab]);

  const tabCounts = useMemo(() => ({
    all: todayOrders.length,
    active: todayOrders.filter(o => o.status === 'received' || o.status === 'preparing').length,
    ready: todayOrders.filter(o => o.status === 'ready').length,
    done: todayOrders.filter(o => o.status === 'completed').length,
  }), [todayOrders]);

  const todayRevenue = useMemo(
    () => todayOrders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0),
    [todayOrders]
  );

  const TABS: { id: FilterTab; label: string }[] = [
    { id: 'active', label: 'Active' },
    { id: 'ready', label: 'Ready' },
    { id: 'all', label: 'All' },
    { id: 'done', label: 'Done' },
  ];

  if (!session) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-neutral-light">
        <SpinnerIcon className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-neutral-light">
      {/* Header */}
      <header className="shrink-0 px-4 py-3 border-b border-neutral-gray/20 flex items-center justify-between gap-4 bg-white">
        <div className="flex items-center gap-3">
          <Link
            href="/pos/terminal"
            className="w-9 h-9 rounded-xl bg-neutral-gray/10 flex items-center justify-center text-neutral-gray hover:text-text-dark hover:bg-neutral-gray/20 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <StorefrontIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-text-dark font-medium text-sm">{branchInfo?.name ?? 'Branch'}</p>
            <p className="text-neutral-gray text-xs">{session.staffName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats */}
          <div className="hidden sm:flex items-center gap-4 px-4 py-2 rounded-xl bg-neutral-gray/10">
            <div className="text-center">
              <p className="text-xs text-neutral-gray">Today</p>
              <p className="text-lg font-medium text-text-dark">{tabCounts.all}</p>
            </div>
            <div className="w-px h-8 bg-neutral-gray/20" />
            <div className="text-center">
              <p className="text-xs text-neutral-gray">Revenue</p>
              <p className="text-lg font-medium text-primary">{formatGHS(todayRevenue)}</p>
            </div>
          </div>

          <button
            onClick={seedTestOrders}
            className="w-10 h-10 rounded-xl bg-neutral-gray/10 flex items-center justify-center text-neutral-gray hover:text-primary hover:bg-primary/10 transition-colors"
            title="Seed test orders"
          >
            <FlaskIcon className="w-5 h-5" />
          </button>

          <button
            onClick={() => { if (confirm('Sign out of POS?')) { logout(); router.replace('/pos'); } }}
            className="w-10 h-10 rounded-xl bg-neutral-gray/10 flex items-center justify-center text-neutral-gray hover:text-error hover:bg-error/10 transition-colors"
            title="Sign Out"
          >
            <SignOutIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Page title + tabs */}
      <div className="shrink-0 px-4 pt-4 pb-0 bg-white border-b border-neutral-gray/15">
        <h1 className="text-xl font-bold text-text-dark mb-3">Today&apos;s Orders</h1>
        <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-2 rounded-t-xl font-medium whitespace-nowrap text-sm
                transition-all duration-150 flex items-center gap-1.5
                ${activeTab === tab.id
                  ? 'bg-primary text-brown'
                  : 'text-neutral-gray hover:text-text-dark hover:bg-neutral-gray/10'
                }
              `}
            >
              {tab.label}
              {tabCounts[tab.id] > 0 && (
                <span className={`
                  text-[11px] font-bold px-1.5 py-0.5 rounded-full
                  ${activeTab === tab.id ? 'bg-brown/20 text-brown' : 'bg-neutral-gray/20 text-neutral-gray'}
                `}>
                  {tabCounts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-gray">
            <ClockIcon className="w-14 h-14 mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">
              {activeTab === 'active' ? 'No active orders' :
                activeTab === 'ready' ? 'No orders ready yet' :
                  activeTab === 'done' ? 'No completed orders' :
                    'No orders today'}
            </p>
            <p className="text-sm opacity-60">
              {activeTab === 'done' ? 'Completed orders will appear here' : 'New orders will appear here'}
            </p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              branchName={branchInfo?.name ?? 'CediBites'}
              onComplete={() => updateOrderStatus(order.id, 'completed')}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Order Card ──────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: Order;
  branchName: string;
  onComplete: () => void;
}

function OrderCard({ order, branchName, onComplete }: OrderCardProps) {
  const isReady = order.status === 'ready';
  const isCompleted = order.status === 'completed';
  const statusCfg = STATUS_CONFIG[order.status];

  const itemSummary = order.items
    .map(i => `${i.name} ×${i.quantity}`)
    .join(', ');

  return (
    <div className={`
      bg-white rounded-2xl border shadow-sm overflow-hidden
      ${isReady ? 'border-primary/50 shadow-primary/10' : 'border-neutral-gray/15'}
    `}>
      {/* Top row: order ID, type, time */}
      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-text-dark text-sm">#{order.orderNumber}</span>
          <span className={`
            text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide
            ${order.fulfillmentType === 'dine_in' ? 'bg-info/10 text-info' : 'bg-secondary/10 text-secondary'}
          `}>
            {FULFILLMENT_LABELS[order.fulfillmentType]}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-brown border-2 ${statusCfg.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusCfg.dot} ${statusCfg.pulse ? 'animate-pulse' : ''}`} />
            <span className="text-text-light text-[11px] font-semibold">{statusCfg.label}</span>
          </span>
        </div>
        <span className="text-xs text-neutral-gray whitespace-nowrap shrink-0 mt-0.5">
          {formatOrderTime(order.placedAt)}
        </span>
      </div>

      {/* Items summary */}
      <div className="px-4 pb-2">
        <p className="text-text-dark text-sm leading-snug">{itemSummary}</p>
      </div>

      {/* Customer info + notes (if set) */}
      {(order.contact.name || order.contact.phone || order.contact.notes) && (
        <div className="px-4 pb-2 flex flex-col gap-0.5">
          {order.contact.name && order.contact.name !== 'Walk-in' && (
            <p className="text-xs text-neutral-gray flex items-center gap-1">
              <UserIcon className="w-3 h-3" /> {order.contact.name}
              {order.contact.phone && <span className="text-neutral-gray/60">· {order.contact.phone}</span>}
            </p>
          )}
          {(!order.contact.name || order.contact.name === 'Walk-in') && order.contact.phone && (
            <p className="text-xs text-neutral-gray flex items-center gap-1">
              <PhoneIcon className="w-3 h-3" /> {order.contact.phone}
            </p>
          )}
          {order.contact.notes && (
            <p className="text-xs text-neutral-gray flex items-center gap-1">
              <NoteIcon className="w-3 h-3" /> {order.contact.notes}
            </p>
          )}
        </div>
      )}

      {/* Bottom row: total + actions */}
      <div className="px-4 pb-3 flex items-center justify-between gap-2 border-t border-neutral-gray/10 pt-2.5 mt-1">
        <span className="font-bold text-primary">{formatGHS(order.total)}</span>
        <div className="flex items-center gap-2">
          {/* Print button */}
          <button
            onClick={() => printReceipt(order, branchName)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-gray hover:text-text-dark hover:bg-neutral-gray/10 transition-colors"
            title="Print Receipt"
          >
            <PrinterIcon className="w-4 h-4" />
          </button>

          {/* Mark complete — only when kitchen marks order ready */}
          {isReady && (
            <button
              onClick={onComplete}
              className="px-4 h-8 rounded-lg font-medium text-sm bg-secondary text-white hover:bg-secondary/90 transition-all active:scale-95"
            >
              Mark Complete
            </button>
          )}

          {isCompleted && (
            <span className="flex items-center gap-1 text-xs text-secondary font-medium">
              <CheckCircleIcon className="w-4 h-4" weight="fill" />
              Done
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
