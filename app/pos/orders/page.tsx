'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  StorefrontIcon,
  ArrowLeftIcon,
  SignOutIcon,
  SpinnerIcon,
  ReceiptIcon,
  PrinterIcon,
  UserIcon,
  NoteIcon,
  PhoneIcon,
  FlaskIcon,
  ClockIcon,
} from '@phosphor-icons/react';
import { usePOS } from '../context';
import { SignOutDialog } from '@/app/components/ui/SignOutDialog';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import type { Order } from '@/types/order';
import { formatGHS } from '@/lib/utils/currency';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { printReceipt } from '@/lib/utils/printReceipt';
import { FULFILLMENT_LABELS, STATUS_CONFIG } from '@/lib/constants/order.constants';
import { useEmployeeOrders } from '@/lib/api/hooks/useEmployeeOrders';
import { mapApiOrderToOrder } from '@/lib/api/adapters/order.adapter';
import { formatOrderLineItemSummary } from '@/lib/utils/orderItemDisplay';
import CancelOrderModal from '@/app/components/ui/CancelOrderModal';
import { useRequestCancel, useCancelOrder } from '@/lib/api/hooks/useOrders';
import { toast } from '@/lib/utils/toast';
import { useQueryClient } from '@tanstack/react-query';
import { getEcho } from '@/lib/echo';

function formatOrderTime(placedAt: number): string {
  if (!placedAt) {
    return '—';
  }
  const d = new Date(placedAt);
  return d.toLocaleTimeString('en-GH', { timeZone: 'Africa/Accra', hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function POSOrdersPage() {
  const router = useRouter();
  const {
    session,
    isSessionValid,
    isSessionLoaded,
    isManualEntry,
    setIsManualEntry,
  } = usePOS();
  const { logout, staffUser } = useStaffAuth();
  const { branches } = useBranch();
  const isAdmin = staffUser?.role === 'admin' || staffUser?.role === 'super_admin';

  const [isSignOutOpen, setIsSignOutOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const { requestCancel } = useRequestCancel();
  const { cancelOrder } = useCancelOrder();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isSessionLoaded && !isSessionValid) {
      router.replace('/pos');
    }
  }, [isSessionLoaded, isSessionValid, router]);

  const branchInfo = useMemo(
    () => session ? branches.find(b => b.id === session.branchId) ?? null : null,
    [session, branches]
  );

  // Fetch today's POS orders placed by this staff member only
  const today = new Date().toISOString().split('T')[0];
  const { orders: rawOrders, isLoading } = useEmployeeOrders({
    branch_id: session?.branchId ? Number(session.branchId) : undefined,
    staff_id: session?.staffId,
    order_source: ['pos', 'manual_entry'],
    date_from: today,
    date_to: today,
    per_page: 100,
  });

  // ─── Real-time order updates via Reverb ───────────────────────────────
  useEffect(() => {
    const branchId = session?.branchId;
    if (!branchId) return;

    const echo = getEcho();
    if (!echo) return;

    const channel = echo.private(`orders.branch.${branchId}`);

    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['employee-orders'] });
    };

    channel.listen('.order.updated', handler);

    return () => {
      channel.stopListening('.order.updated', handler);
    };
  }, [session?.branchId, queryClient]);

  const todayOrders = useMemo(
    () => rawOrders.map(mapApiOrderToOrder).sort((a, b) => b.placedAt - a.placedAt),
    [rawOrders]
  );

  const todayRevenue = useMemo(
    () => todayOrders.reduce((s, o) => s + o.total, 0),
    [todayOrders]
  );

  if (!session || isLoading) {
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
          <div className="hidden sm:flex items-center gap-4 px-4 py-2 rounded-xl bg-neutral-gray/10">
            <div className="text-center">
              <p className="text-xs text-neutral-gray">Orders</p>
              <p className="text-lg font-medium text-text-dark">{todayOrders.length}</p>
            </div>
            <div className="w-px h-8 bg-neutral-gray/20" />
            <div className="text-center">
              <p className="text-xs text-neutral-gray">Revenue</p>
              <p className="text-lg font-medium text-primary">{formatGHS(todayRevenue)}</p>
            </div>
          </div>


          <button
            onClick={() => setIsSignOutOpen(true)}
            className="w-10 h-10 rounded-xl bg-neutral-gray/10 flex items-center justify-center text-neutral-gray hover:text-error hover:bg-error/10 transition-colors"
            title="Sign Out"
          >
            <SignOutIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Page title */}
      <div className="shrink-0 px-4 pt-4 pb-3 bg-white border-b border-neutral-gray/15">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-text-dark">Today&apos;s Orders</h1>
            <p className="text-xs text-neutral-gray mt-0.5">Today · {session.staffName}</p>
          </div>
          <button
            type="button"
            onClick={() => { setIsManualEntry(true); router.push('/pos/terminal'); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-gray hover:text-amber-700 hover:bg-amber-50 border border-neutral-gray/20 hover:border-amber-300 transition-colors"
          >
            <ClockIcon className="w-3.5 h-3.5" />
            Record Past Order
          </button>
        </div>
      </div>

      <SignOutDialog
        isOpen={isSignOutOpen}
        onCancel={() => setIsSignOutOpen(false)}
        onConfirm={() => logout('/pos')}
      />

      {cancelTarget && (
        <CancelOrderModal
          orderNumber={cancelTarget.orderNumber}
          theme="light"
          context="staff"
          onCancel={() => setCancelTarget(null)}
          onConfirm={async (reason) => {
            if (isAdmin) {
              await cancelOrder({ id: Number(cancelTarget.id), reason: reason || 'Cancelled by POS admin' });
            } else {
              await requestCancel({ id: Number(cancelTarget.id), reason: reason || 'Requested by POS staff' });
            }
          }}
        />
      )}

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {todayOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-gray">
            <ReceiptIcon className="w-14 h-14 mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">No orders yet today</p>
            <p className="text-sm opacity-60">Orders placed from the terminal will appear here</p>
          </div>
        ) : (
          todayOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              branchName={branchInfo?.name ?? 'CediBites'}
              staffName={session.staffName}
              isAdmin={isAdmin}
              onCancelRequested={setCancelTarget}
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
  staffName: string;
  isAdmin: boolean;
  onCancelRequested: (order: Order) => void;
}

function OrderCard({ order, branchName, staffName, isAdmin, onCancelRequested }: OrderCardProps) {
  const itemSummary = order.items.map((i) => formatOrderLineItemSummary(i)).join(', ');

  return (
    <div className="bg-white rounded-2xl border border-neutral-gray/15 shadow-sm overflow-hidden">
      {/* Top row: order number, type, status, time */}
      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-text-dark text-sm">#{order.orderNumber}</span>
          <span className={`
            text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide
            ${order.fulfillmentType === 'dine_in' ? 'bg-info/10 text-info' : 'bg-secondary/10 text-secondary'}
          `}>
            {FULFILLMENT_LABELS[order.fulfillmentType]}
          </span>
          {(() => {
            const cfg = STATUS_CONFIG[order.status];
            return (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${cfg.bg}${cfg.pulse ? ' animate-pulse' : ''}`}
                style={{ color: cfg.textColor }}
              >
                {cfg.label}
              </span>
            );
          })()}
          {order.source === 'manual_entry' && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-neutral-gray/10 text-neutral-gray">
              Past Order
            </span>
          )}
        </div>
        <span className="text-xs text-neutral-gray whitespace-nowrap shrink-0 mt-0.5">
          {formatOrderTime(order.placedAt)}
        </span>
        {/* Cancel row — separated to avoid accidental taps */}
        {order.source !== 'manual_entry' && order.status !== 'cancelled' && order.status !== 'completed' && order.status !== 'cancel_requested' && (
          <div className="">
            <button
              onClick={() => onCancelRequested(order)}
              className="w-ful px-3 py-2 rounded-lg text-xs font-medium text-amber-600/70 hover:text-amber-700 hover:bg-amber-50 transition-colors border border-dashed border-amber-300/40 hover:border-amber-400"
              title={isAdmin ? 'Cancel Order' : 'Request Cancel'}
            >
              {isAdmin ? 'Cancel' : 'Request Cancel'}
            </button>
          </div>
        )}
        {order.status === 'cancel_requested' && (
          <span className="text-[11px] font-medium text-amber-600 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
            Cancel pending approval
          </span>
        )}
      </div>

      {/* Items summary */}
      <div className="px-4 pb-2">
        <p className="text-text-dark text-sm leading-snug">{itemSummary}</p>
      </div>

      {/* Customer info */}
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

      {/* Bottom row: total + reprint */}
      <div className="px-4 pb-2 flex items-center justify-between gap-2 border-t border-neutral-gray/10 pt-2.5 mt-1">
        <span className="font-bold text-primary">{formatGHS(order.total)}</span>
        <button
          onClick={() => printReceipt({ ...order, staffName: order.staffName ?? staffName }, branchName, { kind: 'reprint' })}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium text-neutral-gray border border-neutral-gray/20 hover:text-text-dark hover:border-neutral-gray/40 transition-colors"
          title="Reprint Receipt"
        >
          <PrinterIcon className="w-3.5 h-3.5" />
          Reprint
        </button>
      </div>


    </div>
  );
}
