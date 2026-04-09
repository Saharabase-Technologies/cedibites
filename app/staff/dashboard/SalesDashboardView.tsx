'use client';

import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { CashRegisterIcon, ListIcon } from '@phosphor-icons/react';
import { useEmployeeOrders } from '@/lib/api/hooks/useEmployeeOrders';
import { mapApiOrderToAdminOrder, mapApiOrderToOrder } from '@/lib/api/adapters/order.adapter';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useOrderStore } from '@/app/components/providers/OrderStoreProvider';
import { STATUS_CONFIG } from '@/app/staff/orders/constants';
import OrderDrawer from '@/app/staff/my-sales/components/OrderDrawer';
import type { Order } from '@/types/order';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// ─── Source badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="text-[10px] font-medium font-body text-text-dark dark:text-text-light border border-brown-light/20 dark:border-neutral-gray px-2 py-0.5 rounded-full">
      {source}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.received;
  return (
    <span className="inline-flex items-center font-bold gap-1.5 py-2 text-xs text-text-dark dark:text-text-light font-body px-2.5">
      <span className={`h-2 w-2 rounded-full shrink-0 ${config.dot} ${config.pulse ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function SalesDashboardView() {
  const { staffUser } = useStaffAuth();
  const { getOrdersByFilter } = useOrderStore();
  const { orders: rawOrders } = useEmployeeOrders({
    status: ['received', 'preparing', 'ready', 'ready_for_pickup', 'out_for_delivery'],
    per_page: 10,
  });

  const orders = useMemo(() => rawOrders.map(mapApiOrderToAdminOrder), [rawOrders]);

  // Orders mapped for the detail drawer (needs Order type, not AdminOrder)
  const drawerOrders = useMemo(() => rawOrders.map(mapApiOrderToOrder), [rawOrders]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = useMemo(
    () => drawerOrders.find(o => o.id === selectedOrderId) ?? null,
    [drawerOrders, selectedOrderId],
  );
  const handleOrderClick = useCallback((dbId: number) => setSelectedOrderId(String(dbId)), []);
  const handleDrawerClose = useCallback(() => setSelectedOrderId(null), []);

  // Staff's own orders today (for personal stats on the dashboard)
  const myOrders = useMemo(() => {
    if (!staffUser?.id) return [];
    return getOrdersByFilter({
      staffId: staffUser.id,
      dateFrom: startOfToday(),
      dateTo: endOfToday(),
    });
  }, [getOrdersByFilter, staffUser?.id]);

  const myActiveOrders = useMemo(() => myOrders.filter(o => o.status !== 'cancelled'), [myOrders]);
  const myReceivedCount = useMemo(() => myActiveOrders.filter(o => o.status === 'received').length, [myActiveOrders]);
  const myPreparingCount = useMemo(() => myActiveOrders.filter(o => o.status === 'preparing').length, [myActiveOrders]);

  const staffName = staffUser?.name ?? 'Staff';
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const displayStats = [
    { label: 'Received', value: String(myReceivedCount), sub: 'awaiting preparation' },
    { label: 'Preparing', value: String(myPreparingCount), sub: 'in progress' },
    { label: 'My Orders Today', value: String(myActiveOrders.length), sub: 'placed by you' },
  ];

  return (
    <div className="md:px-8 py-6 max-w-4xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-text-dark font-bold dark:text-text-light text-xl font-body">
          {greeting}, {staffName}.
        </h1>
        <p className="text-neutral-gray text-sm font-body mt-0.5">
          Here&apos;s what&apos;s happening across the branches today.
        </p>
      </div>

      {/* ── Primary CTA — Open POS ─────────────────────────────────────── */}
      <Link
        href="/pos/terminal"
        target="_blank"
        rel="noopener noreferrer"
        className="
          flex items-center justify-between
          bg-primary hover:bg-primary-hover
          text-brand-darker
          px-6 py-4 rounded-2xl mb-6
          transition-all duration-150 active:scale-[0.99]
          group
        "
      >
        <div className="flex items-center gap-3">
          <CashRegisterIcon size={24} weight="fill" className="shrink-0" />
          <div>
            <p className="font-semibold font-body text-base leading-none">Open POS Terminal</p>
            <p className="text-brand-darker/60 text-xs font-body mt-0.5">
              Place walk-in, phone, or delivery orders
            </p>
          </div>
        </div>
        <span className="text-brand-darker/60 group-hover:translate-x-0.5 transition-transform text-sm font-body font-medium">
          Start →
        </span>
      </Link>

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {displayStats.map(stat => (
          <div
            key={stat.label}
            className="bg-brown dark:bg-brown border-brown-light/15 rounded-2xl px-4 py-4"
          >
            <p className="text-text-light text-2xl font-semibold font-body leading-none">
              {stat.value}
            </p>
            <p className="text-neutral-gray text-sm font-body mt-1 leading-snug">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Recent orders ───────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-text-dark font-bold dark:text-text-light text-base font-body">Active Orders</h2>
          <Link
            href="/staff/sales/orders"
            className="text-text-brown dark:text-primary text-xs font-body hover:text-brown-light dark:hover:text-primary-hover transition-colors flex items-center gap-1"
          >
            <ListIcon size={14} weight="bold" />
            View all
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          {orders?.filter(o => o.status !== 'completed').map(order => (
            <button
              key={order.id}
              type="button"
              onClick={() => handleOrderClick(order.dbId)}
              className="
                bg-neutral-card dark:bg-brand-dark
                border-brown-light/30 border rounded-2xl
                px-4 py-3.5
                flex items-center hover:bg-brown-light/5 justify-between gap-4
                hover:border-brown-light/75 transition-colors
                group text-left w-full cursor-pointer
              "
            >
              {/* Left */}
              <div className="min-w-0 flex-1">
                <div className="flex text-text-dark dark:text-text-light items-center gap-2 mb-1">
                  <span className="text-text-dark dark:text-text-light text-base font-bold font-body">
                    {order.customer || 'Guest Customer'}
                  </span> ·
                  <SourceBadge source={order.source || 'Unknown'} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="dark:text-text-light/75 text-xs font-body">#{order.id}</span>
                  <span className="text-brown-light/40 text-xs">·</span>
                  <span className="dark:text-text-light/75 text-xs font-body">{order.branch || 'Unknown Branch'}</span>
                  <span className="text-brown-light/40 text-xs">·</span>
                  <span className="dark:text-text-light/75 text-xs font-body">{order.placedAt}</span>
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={order.status} />
                <span className="text-neutral-gray/80 group-hover:text-neutral-gray transition-colors text-base">
                  →
                </span>
              </div>
            </button>
          )) || (
            <div className="text-center py-8 text-neutral-gray">
              <p className="text-sm font-body">No active orders at the moment</p>
            </div>
          )}
        </div>
      </div>

      <OrderDrawer order={selectedOrder} onClose={handleDrawerClose} />
    </div>
  );
}
