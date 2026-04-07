'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  ClockIcon,
  CheckIcon,
  CheckCircleIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
  ForkKnifeIcon,
  PackageIcon,
  BicycleIcon,
  StorefrontIcon,
  WarningCircleIcon,
  ListIcon,
  XIcon,
  ProhibitIcon,
  SignOutIcon,
} from '@phosphor-icons/react';
import { useKitchenSounds } from '@/app/kitchen/hooks/useSounds';
import { useOrderStore } from '@/app/components/providers/OrderStoreProvider';
import { useOrderChannel } from '@/lib/hooks/useOrderChannel';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import BranchSelectPage from '@/app/components/ui/BranchSelectPage';
import BranchSwitcherDialog from '@/app/components/ui/BranchSwitcherDialog';
import { SignOutDialog } from '@/app/components/ui/SignOutDialog';
import { useBranch } from '@/app/components/providers/BranchProvider';
import type { Order, OrderStatus, FulfillmentType } from '@/types/order';
import { STATUS_CONFIG } from '@/lib/constants/order.constants';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';
import { toast } from '@/lib/utils/toast';
import apiClient from '@/lib/api/client';

function formatTimeAgo(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes === 1) return '1 min';
  return `${minutes} min`;
}

const ORDER_TYPE_LABELS: Record<FulfillmentType, { icon: React.ElementType; label: string }> = {
  dine_in: { icon: ForkKnifeIcon, label: 'Dine In' },
  takeaway: { icon: PackageIcon, label: 'Takeaway' },
  delivery: { icon: BicycleIcon, label: 'Delivery' },
  pickup: { icon: StorefrontIcon, label: 'Pickup' },
};

// Kitchen-style display labels
const OM_LABELS: Partial<Record<OrderStatus, string>> = {
  received: 'New',
  accepted: 'Accepted',
  preparing: 'Cooking',
  ready: 'Ready',
  cancel_requested: 'Cancel Req.',
};

function getDisplayLabel(status: OrderStatus): string {
  return OM_LABELS[status] ?? STATUS_CONFIG[status].label;
}

const STATUS_STRIPE: Partial<Record<OrderStatus, string>> = {
  received: 'border-l-blue-500',
  accepted: 'border-l-teal-500',
  preparing: 'border-l-amber-500',
  ready: 'border-l-green-600',
  cancel_requested: 'border-l-orange-500',
};

type ActiveStatus = 'received' | 'accepted' | 'preparing' | 'ready' | 'cancel_requested';

const ACTIVE_STATUSES = new Set<OrderStatus>(['received', 'accepted', 'preparing', 'ready', 'cancel_requested']);

export default function OrderManagerPage() {
  const { updateOrderStatus, updateOrder } = useOrderStore();
  const { staffUser, isLoading: isAuthLoading, logout } = useStaffAuth();

  // Branch selection gate — derived from live auth context
  const assignedIds: string[] = staffUser?.branches.map(b => b.id) ?? [];

  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('cedibites-om-branchId') : null
  );
  const [isBranchSwitcherOpen, setIsBranchSwitcherOpen] = useState(false);
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);

  // Auto-select if exactly 1 branch; use explicit selection otherwise
  const autoSelectedBranchId = assignedIds.length === 1 ? assignedIds[0] : null;
  const effectiveBranchId = selectedBranchId ?? autoSelectedBranchId;

  const { branches } = useBranch();
  const branchInfo = useMemo(
    () => effectiveBranchId ? branches.find(b => b.id === effectiveBranchId) ?? null : null,
    [effectiveBranchId, branches]
  );
  const isAdmin = staffUser?.role === 'admin' || staffUser?.role === 'tech_admin';

  const { orders } = useOrderChannel(effectiveBranchId);
  const sounds = useKitchenSounds();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    sounds.setEnabled(soundEnabled);
  }, [soundEnabled, sounds]);

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(id);
  }, []);

  // Sync selected order with live store
  useEffect(() => {
    if (!selectedOrder) return;
    const updated = orders.find(o => o.id === selectedOrder.id);
    setSelectedOrder(updated ?? null);
  }, [orders, selectedOrder]);

  // Group active orders by status
  const ordersByStatus = useMemo(() => {
    const grouped: Record<ActiveStatus, Order[]> = {
      received: [], accepted: [], preparing: [], ready: [], cancel_requested: [],
    };
    orders.forEach(order => {
      if (ACTIVE_STATUSES.has(order.status)) {
        grouped[order.status as ActiveStatus].push(order);
      }
    });
    (Object.keys(grouped) as ActiveStatus[]).forEach(k => {
      grouped[k].sort((a, b) => a.placedAt - b.placedAt);
    });
    return grouped;
  }, [orders]);

  // Cancel-requested first, then oldest-first; deduplicate by id
  const allActiveOrders = useMemo(() => {
    const seen = new Set<string>();
    return [
      ...ordersByStatus.cancel_requested,
      ...ordersByStatus.received,
      ...ordersByStatus.accepted,
      ...ordersByStatus.preparing,
      ...ordersByStatus.ready,
    ].filter(o => seen.has(o.id) ? false : (seen.add(o.id), true));
  }, [ordersByStatus]);

  const receivedCount = ordersByStatus.received.length;
  const acceptedCount = ordersByStatus.accepted.length;
  const cookingCount = ordersByStatus.preparing.length;
  const readyCount = ordersByStatus.ready.length;
  const cancelReqCount = ordersByStatus.cancel_requested.length;
  const totalActive = allActiveOrders.length;

  // Play sound only when a genuinely new order arrives (not on mount or branch switch)
  const prevReceivedCountRef = useRef<number | null>(null);
  useEffect(() => {
    prevReceivedCountRef.current = null;
  }, [effectiveBranchId]);
  useEffect(() => {
    if (prevReceivedCountRef.current !== null && receivedCount > prevReceivedCountRef.current) {
      sounds.playNewOrder();
    }
    prevReceivedCountRef.current = receivedCount;
  }, [receivedCount, sounds]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleStatusUpdate = useCallback(async (
    orderId: string,
    status: OrderStatus,
    timestamps?: Partial<Pick<Order, 'acceptedAt' | 'startedAt' | 'readyAt' | 'completedAt'>>,
  ) => {
    try {
      await updateOrderStatus(orderId, status, timestamps);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update order status';
      toast.error(message);
    }
  }, [updateOrderStatus]);

  const acceptOrder = useCallback((orderId: string) => {
    handleStatusUpdate(orderId, 'accepted', { acceptedAt: Date.now() });
  }, [handleStatusUpdate]);

  const startCooking = useCallback((orderId: string) => {
    handleStatusUpdate(orderId, 'preparing', { startedAt: Date.now() });
  }, [handleStatusUpdate]);

  const markReady = useCallback((orderId: string) => {
    handleStatusUpdate(orderId, 'ready', { readyAt: Date.now() });
  }, [handleStatusUpdate]);

  const completeOrder = useCallback((orderId: string) => {
    handleStatusUpdate(orderId, 'completed', { completedAt: Date.now() });
  }, [handleStatusUpdate]);

  const approveCancel = useCallback(async (orderId: string) => {
    try {
      await apiClient.post(`/admin/orders/${orderId}/approve-cancel`);
      // Refresh local state
      handleStatusUpdate(orderId, 'cancelled', { completedAt: Date.now() });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to approve cancellation';
      toast.error(message);
    }
  }, [handleStatusUpdate]);

  const rejectCancel = useCallback(async (order: Order) => {
    try {
      await apiClient.post(`/admin/orders/${order.id}/reject-cancel`);
      const restoreStatus = (order.cancelPreviousStatus ?? 'received') as OrderStatus;
      await updateOrder(order.id, {
        status: restoreStatus,
        cancelRequestedBy: undefined,
        cancelRequestedAt: undefined,
        cancelRequestReason: undefined,
        cancelPreviousStatus: undefined,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reject cancellation';
      toast.error(message);
    }
  }, [updateOrder]);

  const handleAction = useCallback((order: Order) => {
    if (order.status === 'received') acceptOrder(order.id);
    else if (order.status === 'accepted') startCooking(order.id);
    else if (order.status === 'preparing') markReady(order.id);
    else if (order.status === 'ready') completeOrder(order.id);
  }, [acceptOrder, startCooking, markReady, completeOrder]);

  // Block render until auth resolves
  if (isAuthLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-neutral-light">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show picker once auth is loaded, if staff has ≠1 branch and hasn't picked yet
  const needsBranchSelection = !effectiveBranchId && assignedIds.length !== 1;
  const selectableBranches = staffUser?.branches ?? [];

  if (needsBranchSelection) {
    return (
      <BranchSelectPage
        branches={selectableBranches}
        onSelect={id => { localStorage.setItem('cedibites-om-branchId', id); setSelectedBranchId(id); }}
        subtitle="Choose which branch to manage orders for"
      />
    );
  }

  // Guard: branch is closed or inactive — admin/tech_admin bypass
  if (!isAdmin && branchInfo && (!branchInfo.isActive || !branchInfo.isOpen)) {
    const isInactive = !branchInfo.isActive;
    return (
      <div className="min-h-dvh flex items-center justify-center bg-neutral-light p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-8 flex flex-col items-center gap-5 text-center">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
            <WarningCircleIcon weight="fill" size={36} className="text-error" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-dark">
              {isInactive ? 'Branch Inactive' : 'Branch Closed'}
            </h2>
            <p className="text-sm text-neutral-gray mt-2">
              {isInactive
                ? `${branchInfo.name} is currently inactive. Contact an administrator to reactivate it.`
                : `${branchInfo.name} is currently closed. Order management is unavailable outside operating hours.`}
            </p>
          </div>
          {selectableBranches.length > 1 && (
            <button
              onClick={() => setIsBranchSwitcherOpen(true)}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold px-6 py-3 rounded-2xl transition-all active:scale-[0.98]"
            >
              <StorefrontIcon weight="fill" size={18} />
              Switch Branch
            </button>
          )}
          <button
            onClick={() => setIsSignOutOpen(true)}
            className="flex items-center gap-2 text-sm font-semibold text-neutral-gray hover:text-error transition-colors"
          >
            <SignOutIcon weight="bold" size={16} />
            Sign Out
          </button>
        </div>
        {selectableBranches.length > 1 && (
          <BranchSwitcherDialog
            isOpen={isBranchSwitcherOpen}
            branches={selectableBranches}
            currentBranchId={effectiveBranchId ?? undefined}
            onSelect={id => { localStorage.setItem('cedibites-om-branchId', id); setSelectedBranchId(id); setIsBranchSwitcherOpen(false); }}
            onClose={() => setIsBranchSwitcherOpen(false)}
          />
        )}
        <SignOutDialog isOpen={isSignOutOpen} onClose={() => setIsSignOutOpen(false)} onSignOut={logout} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-white">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="shrink-0 px-4 py-3 bg-neutral-card/50 border-b border-brown-light/20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Image src="/cblogo.webp" alt="CediBites" width={28} height={28} />
          <div>
            <h1 className="text-lg font-bold text-text-dark font-body leading-tight">
              Order Manager
              {cancelReqCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold">
                  {cancelReqCount}
                </span>
              )}
            </h1>
            <p className="text-xs text-neutral-gray font-body">
              {totalActive} active{receivedCount > 0 && ` · ${receivedCount} new`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {assignedIds.length !== 1 && (
            <button
              onClick={() => setIsBranchSwitcherOpen(true)}
              className="flex items-center gap-1.5 px-3 h-10 rounded-xl bg-neutral-light border border-brown-light/20 text-neutral-gray hover:text-primary hover:border-primary/30 active:scale-95 transition-all text-xs font-medium"
              title="Switch Branch"
            >
              <StorefrontIcon className="w-4 h-4" />
              <span className="hidden sm:inline">
                {selectableBranches.find(b => b.id === effectiveBranchId)?.name ?? 'All Branches'}
              </span>
            </button>
          )}
          <button
            onClick={() => setSoundEnabled(v => !v)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform ${soundEnabled ? 'bg-primary/10 text-primary' : 'bg-neutral-light text-neutral-gray'}`}
          >
            {soundEnabled ? <SpeakerHighIcon className="w-5 h-5" /> : <SpeakerSlashIcon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setIsSignOutOpen(true)}
            title="Sign out"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-neutral-gray hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all"
          >
            <SignOutIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── Status legend ─────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-2 bg-neutral-card border-b border-brown-light/15 flex items-center gap-5 text-xs font-medium text-neutral-gray font-body overflow-x-auto">
        {cancelReqCount > 0 && (
          <span className="flex items-center gap-1.5 shrink-0 text-orange-600 font-semibold">
            <span className="w-3 h-3 rounded-sm bg-orange-500 inline-block animate-pulse" />
            Cancel Req. ({cancelReqCount})
          </span>
        )}
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />
          New ({receivedCount})
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="w-3 h-3 rounded-sm bg-teal-500 inline-block" />
          Accepted ({acceptedCount})
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
          Cooking ({cookingCount})
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="w-3 h-3 rounded-sm bg-green-600 inline-block" />
          Ready ({readyCount})
        </span>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* Orders grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {allActiveOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-gray">
              <ListIcon className="w-14 h-14 mb-3 opacity-20" />
              <p className="text-base font-medium text-text-dark font-body">No active orders</p>
              <p className="text-sm text-neutral-gray font-body">Waiting for new orders...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {allActiveOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isSelected={selectedOrder?.id === order.id}
                  onSelect={() => setSelectedOrder(order)}
                  onAction={() => handleAction(order)}
                  onApproveCancel={() => approveCancel(order.id)}
                  onRejectCancel={() => rejectCancel(order)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Desktop detail panel */}
        {selectedOrder && (
          <div className="hidden lg:block w-96 border-l border-brown-light/20 bg-neutral-card overflow-y-auto">
            <OrderDetailPanel
              order={selectedOrder}
              onAction={() => handleAction(selectedOrder)}
              onApproveCancel={() => { approveCancel(selectedOrder.id); setSelectedOrder(null); }}
              onRejectCancel={() => { rejectCancel(selectedOrder); setSelectedOrder(null); }}
              onClose={() => setSelectedOrder(null)}
            />
          </div>
        )}
      </div>

      {/* Mobile bottom sheet */}
      {selectedOrder && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedOrder(null)} />
          <div className="absolute bottom-0 left-0 right-0 bg-neutral-card rounded-t-3xl max-h-[80vh] overflow-y-auto shadow-2xl">
            <OrderDetailPanel
              order={selectedOrder}
              onAction={() => handleAction(selectedOrder)}
              onApproveCancel={() => { approveCancel(selectedOrder.id); setSelectedOrder(null); }}
              onRejectCancel={() => { rejectCancel(selectedOrder); setSelectedOrder(null); }}
              onClose={() => setSelectedOrder(null)}
            />
          </div>
        </div>
      )}

      <BranchSwitcherDialog
        isOpen={isBranchSwitcherOpen}
        branches={selectableBranches}
        currentBranchId={effectiveBranchId}
        onSelect={id => { localStorage.setItem('cedibites-om-branchId', id); setSelectedBranchId(id); setSelectedOrder(null); }}
        onClose={() => setIsBranchSwitcherOpen(false)}
      />

      <SignOutDialog
        isOpen={isSignOutOpen}
        onCancel={() => setIsSignOutOpen(false)}
        onConfirm={() => logout()}
      />
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: Order;
  isSelected: boolean;
  onSelect: () => void;
  onAction: () => void;
  onApproveCancel: () => void;
  onRejectCancel: () => void;
}

function OrderCard({ order, isSelected, onSelect, onAction, onApproveCancel, onRejectCancel }: OrderCardProps) {
  const statusCfg = STATUS_CONFIG[order.status];
  const displayLabel = getDisplayLabel(order.status);
  const stripe = STATUS_STRIPE[order.status] ?? 'border-l-gray-300';
  const isCancelReq = order.status === 'cancel_requested';

  const actionConfig: { label: string; icon: React.ElementType; color: string } | null =
    isCancelReq ? null
      : order.status === 'received'
        ? { label: 'Accept Order', icon: CheckIcon, color: 'bg-teal-600 hover:bg-teal-700 text-white' }
        : order.status === 'accepted'
          ? { label: 'Start Cooking', icon: CheckIcon, color: 'bg-brown hover:bg-brown-light text-text-light' }
          : order.status === 'preparing'
            ? { label: 'Mark Ready', icon: CheckIcon, color: 'bg-secondary hover:bg-secondary-hover text-white' }
            : order.status === 'ready'
              ? { label: 'Complete', icon: CheckCircleIcon, color: 'bg-primary hover:bg-primary-hover text-white' }
              : null;

  return (
    <div
      onClick={onSelect}
      className={`
        rounded-2xl overflow-hidden cursor-pointer bg-white
        transition-all duration-150
        
        ${isSelected ? 'ring-2 ring-primary shadow-md' : 'shadow-sm active:scale-[0.98]'}
      `}
    >
      <div className="p-4 flex flex-col h-full">

        {/* Cancel requested banner */}
        {isCancelReq && (
          <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 rounded-lg bg-orange-100 border border-orange-300">
            <WarningCircleIcon className="w-3.5 h-3.5 text-orange-600 shrink-0" weight="fill" />
            <span className="text-orange-700 text-[11px] font-semibold font-body truncate">
              {order.cancelRequestReason ?? 'Cancellation requested'}
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-xl font-bold text-text-dark font-body">{order.orderNumber}</span>
            {order.contact.name && (
              <p className="text-text-dark text-sm font-medium font-body mt-0.5">{order.contact.name}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold font-body ${statusCfg.bg} ${statusCfg.dot.replace('bg-', 'text-')}`}>
              {displayLabel}
            </span>
            <span className="text-xs font-body text-neutral-gray">
              {ORDER_TYPE_LABELS[order.fulfillmentType].label}
            </span>
          </div>
        </div>

        {/* Items preview */}
        <div className="mb-3">
          {order.items.slice(0, 3).map(item => (
            <div key={item.id} className="flex items-center gap-2 text-sm text-text-dark py-0.5 font-body">
              <span className="w-5 h-5 rounded bg-neutral-gray/5 border border-neutral-gray/25 text-text-gray text-xs font-bold flex items-center justify-center">
                {item.quantity}
              </span>
              <span className="truncate">{getOrderItemLineLabel(item)}</span>
            </div>
          ))}
          {order.items.length > 3 && (
            <p className="text-xs text-neutral-gray mt-1 font-body">+{order.items.length - 3} more</p>
          )}
        </div>

        {/* Notes */}
        {order.contact.notes && !isCancelReq && (
          <div className="flex items-center gap-1.5 text-text-gray text-xs mb-3 font-body">
            <WarningCircleIcon className="w-4 h-4 shrink-0" />
            <span className="truncate">{order.contact.notes}</span>
          </div>
        )}

        {/* Time ago + action */}
        <div className="mt-auto flex items-center gap-2">
          <span className="text-xs text-neutral-gray font-body flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            {formatTimeAgo(order.placedAt)}
          </span>

          {isCancelReq ? (
            <div className="flex-1 flex gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); onRejectCancel(); }}
                className="flex-1 h-10 rounded-xl font-semibold text-xs flex items-center justify-center gap-1 active:scale-[0.95] transition-all font-body bg-neutral-light hover:bg-neutral-gray/10 text-neutral-gray border border-neutral-gray/20"
              >
                <XIcon className="w-3.5 h-3.5" weight="bold" />
                Reject
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onApproveCancel(); }}
                className="flex-1 h-10 rounded-xl font-semibold text-xs flex items-center justify-center gap-1 active:scale-[0.95] transition-all font-body bg-error hover:bg-error/80 text-white"
              >
                <ProhibitIcon className="w-3.5 h-3.5" weight="bold" />
                Approve
              </button>
            </div>
          ) : actionConfig ? (
            <button
              onClick={(e) => { e.stopPropagation(); onAction(); }}
              className={`flex-1 h-10 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 active:scale-[0.95] transition-all font-body ${actionConfig.color}`}
            >
              <actionConfig.icon className="w-4 h-4" weight="bold" />
              {actionConfig.label}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Order Detail Panel ───────────────────────────────────────────────────────

interface OrderDetailPanelProps {
  order: Order;
  onAction: () => void;
  onApproveCancel: () => void;
  onRejectCancel: () => void;
  onClose: () => void;
}

function OrderDetailPanel({ order, onAction, onApproveCancel, onRejectCancel, onClose }: OrderDetailPanelProps) {
  const statusCfg = STATUS_CONFIG[order.status];
  const displayLabel = getDisplayLabel(order.status);
  const TypeIcon = ORDER_TYPE_LABELS[order.fulfillmentType].icon;
  const isCancelReq = order.status === 'cancel_requested';

  const actionConfig: { label: string; icon: React.ElementType; color: string } | null =
    isCancelReq ? null
      : order.status === 'received'
        ? { label: 'Accept Order', icon: CheckIcon, color: 'bg-teal-600 hover:bg-teal-700 text-white' }
        : order.status === 'accepted'
          ? { label: 'Start Cooking', icon: CheckIcon, color: 'bg-brown hover:bg-brown-light text-text-light' }
          : order.status === 'preparing'
            ? { label: 'Mark Ready', icon: CheckIcon, color: 'bg-secondary hover:bg-secondary-hover text-white' }
            : order.status === 'ready'
              ? { label: 'Complete', icon: CheckCircleIcon, color: 'bg-primary hover:bg-primary-hover text-white' }
              : null;

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="shrink-0 px-4 py-4 border-b border-brown-light/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-text-dark font-body">#{order.orderNumber}</span>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-body ${statusCfg.bg} ${statusCfg.dot.replace('bg-', 'text-')}`}>
              {displayLabel}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-neutral-light flex items-center justify-center text-neutral-gray active:scale-95 transition-transform"
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-neutral-gray font-body flex-wrap">
          {order.contact.name && <span className="text-text-dark font-medium">{order.contact.name}</span>}
          <span className="flex items-center gap-1">
            <TypeIcon className="w-4 h-4" />
            {ORDER_TYPE_LABELS[order.fulfillmentType].label}
          </span>
          <span className="flex items-center gap-1">
            <ClockIcon className="w-4 h-4" />
            {formatTimeAgo(order.placedAt)}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {isCancelReq && (
          <div className="mb-4 p-3 rounded-xl bg-orange-50 border border-orange-300">
            <p className="text-orange-700 text-xs font-semibold font-body mb-1">Cancellation Reason</p>
            <p className="text-orange-900 text-sm font-body">{order.cancelRequestReason ?? 'No reason provided'}</p>
          </div>
        )}

        <h3 className="text-xs font-semibold text-neutral-gray mb-3 uppercase tracking-wide font-body">Items</h3>
        <div className="space-y-2">
          {order.items.map(item => (
            <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-neutral-light">
              <span className="w-8 h-8 rounded-lg bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0 text-sm font-body">
                {item.quantity}
              </span>
              <div>
                <p className="text-text-dark font-medium font-body">{getOrderItemLineLabel(item)}</p>
                {item.notes && <p className="text-sm text-warning mt-0.5 font-body">{item.notes}</p>}
              </div>
            </div>
          ))}
        </div>

        {order.contact.notes && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold text-neutral-gray mb-2 uppercase tracking-wide font-body">Notes</h3>
            <div className="p-3 rounded-xl bg-warning/8 border border-warning/20">
              <p className="text-warning text-sm font-body">{order.contact.notes}</p>
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="mt-4 space-y-2 text-sm border-t border-brown-light/15 pt-4 font-body">
          <div className="flex justify-between text-neutral-gray">
            <span>Received</span>
            <span className="font-medium text-text-dark">
              {new Date(order.placedAt).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {order.startedAt && (
            <div className="flex justify-between text-neutral-gray">
              <span>Started Cooking</span>
              <span className="font-medium text-text-dark">
                {new Date(order.startedAt).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
          {order.readyAt && (
            <div className="flex justify-between text-neutral-gray">
              <span>Ready</span>
              <span className="font-medium text-text-dark">
                {new Date(order.readyAt).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
          {isCancelReq && order.cancelRequestedAt && (
            <div className="flex justify-between text-orange-600">
              <span>Cancel Requested</span>
              <span className="font-medium">
                {new Date(order.cancelRequestedAt).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action footer */}
      <div className="shrink-0 p-4 border-t border-brown-light/20">
        {isCancelReq ? (
          <div className="flex gap-2">
            <button
              onClick={onRejectCancel}
              className="flex-1 h-14 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.95] transition-all font-body bg-neutral-light hover:bg-neutral-gray/10 text-text-dark border border-brown-light/20"
            >
              <XIcon className="w-5 h-5" weight="bold" />
              Reject
            </button>
            <button
              onClick={onApproveCancel}
              className="flex-1 h-14 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.95] transition-all font-body bg-error hover:bg-error/80 text-white"
            >
              <ProhibitIcon className="w-5 h-5" weight="bold" />
              Approve Cancel
            </button>
          </div>
        ) : actionConfig ? (
          <button
            onClick={onAction}
            className={`w-full h-14 rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 active:scale-[0.95] transition-all font-body ${actionConfig.color}`}
          >
            <actionConfig.icon className="w-6 h-6" weight="bold" />
            {actionConfig.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
