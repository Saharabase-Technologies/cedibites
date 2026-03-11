'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ClockIcon,
  PlayIcon,
  CheckIcon,
  CheckCircleIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
  CaretLeftIcon,
  ForkKnifeIcon,
  PackageIcon,
  BicycleIcon,
  StorefrontIcon,
  WarningCircleIcon,
  PlusIcon,
  ListIcon,
  XIcon,
} from '@phosphor-icons/react';
import { useKitchen } from '../context';
import type { Order, OrderStatus, FulfillmentType } from '@/types/order';
import { STATUS_CONFIG, KITCHEN_STATUS_LABELS, FULFILLMENT_LABELS } from '@/lib/constants/order.constants';

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

// Kitchen only shows these 4 statuses
type KitchenStatus = 'received' | 'accepted' | 'preparing' | 'ready';

export default function KitchenControlPage() {
  const router = useRouter();
  const { orders, ordersByStatus, stats, acceptOrder, startOrder, markReady, completeOrder, completeAllReady, soundEnabled, setSoundEnabled, simulateNewOrder } = useKitchen();

  const [activeTab, setActiveTab] = useState<KitchenStatus>('received');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Keep timers fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  // Sync selected order with state
  useEffect(() => {
    if (!selectedOrder) return;
    const updated = orders.find(o => o.id === selectedOrder.id);
    setSelectedOrder(updated ?? null);
  }, [orders, selectedOrder]);

  const filteredOrders = useMemo(() => {
    return ordersByStatus[activeTab] || [];
  }, [activeTab, ordersByStatus]);

  const handleAction = (order: Order) => {
    if (order.status === 'received') acceptOrder(order.id);
    if (order.status === 'accepted') startOrder(order.id);
    if (order.status === 'preparing') markReady(order.id);
    if (order.status === 'ready') completeOrder(order.id);
  };

  const tabs: { id: KitchenStatus; label: string; count: number }[] = [
    { id: 'received', label: 'New', count: stats.received },
    { id: 'accepted', label: 'Accepted', count: stats.accepted },
    { id: 'preparing', label: 'Cooking', count: stats.preparing },
    { id: 'ready', label: 'Ready', count: stats.ready },
  ];

  return (
    <div className="min-h-dvh flex flex-col bg-white">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="shrink-0 px-4 py-3 bg-neutral-card/50 border-b border-brown-light/20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/kitchen')}
            className="w-10 h-10 rounded-xl bg-neutral-light border flex items-center justify-center text-neutral-gray/50 active:scale-95 transition-transform"
          >
            <CaretLeftIcon className="w-5 h-5" />
          </button>
          <Image src="/cblogo.webp" alt="CediBites" width={28} height={28} />
          <h1 className="text-lg font-bold text-text-dark font-body">Kitchen</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={simulateNewOrder}
            className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary active:scale-95 transition-transform"
          >
            <PlusIcon className="w-5 h-5" weight="bold" />
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform ${soundEnabled ? 'bg-primary/10 text-primary' : 'bg-neutral-light text-neutral-gray'}`}
          >
            {soundEnabled ? <SpeakerHighIcon className="w-5 h-5" /> : <SpeakerSlashIcon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-2.5 bg-neutral-card border-b border-brown-light/15 flex gap-2 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-4 py-2.5 rounded-xl font-medium text-sm font-body
              transition-all duration-150 flex items-center gap-2 shrink-0
              active:scale-95
              ${activeTab === tab.id
                ? 'bg-brown text-text-light'
                : 'bg-neutral-light text-text-dark border border-brown-light/20'
              }
            `}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${activeTab === tab.id ? 'bg-white/15' : 'bg-brown-light/15'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Orders grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-gray">
              <ListIcon className="w-14 h-14 mb-3 opacity-20" />
              <p className="text-base font-medium text-text-dark font-body">No orders</p>
              <p className="text-sm text-neutral-gray font-body">
                {activeTab === 'ready' ? 'Ready orders will appear here' : 'Waiting for new orders...'}
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'ready' && filteredOrders.length > 1 && (
                <button
                  onClick={completeAllReady}
                  className="mb-3 w-full h-12 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.95] transition-all font-body bg-transparent border border-primary text-primary hover:bg-primary/5"
                >
                  <CheckCircleIcon className="w-5 h-5" weight="bold" />
                  Mark All Done
                </button>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredOrders.map(order => (
                  <ControlOrderCard
                    key={order.id}
                    order={order}
                    isSelected={selectedOrder?.id === order.id}
                    onSelect={() => setSelectedOrder(order)}
                    onAction={() => handleAction(order)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Desktop detail panel */}
        {selectedOrder && (
          <div className="hidden lg:block w-96 border-l border-brown-light/20 bg-neutral-card overflow-y-auto">
            <OrderDetailPanel
              order={selectedOrder}
              onAction={() => handleAction(selectedOrder)}
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
              onClose={() => setSelectedOrder(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Control Order Card ───────────────────────────────────────────────────────

interface ControlOrderCardProps {
  order: Order;
  isSelected: boolean;
  onSelect: () => void;
  onAction: () => void;
}

function ControlOrderCard({ order, isSelected, onSelect, onAction }: ControlOrderCardProps) {
  const statusCfg = STATUS_CONFIG[order.status];
  const kitchenLabel = KITCHEN_STATUS_LABELS[order.status] ?? statusCfg.label;

  const actionConfig = {
    received: { label: 'Accept', icon: CheckIcon, color: 'bg-brown hover:bg-brown-light text-text-light' },
    accepted: { label: 'Start Cooking', icon: PlayIcon, color: 'bg-teal-600 hover:bg-teal-700 text-white' },
    preparing: { label: 'Ready', icon: CheckIcon, color: 'bg-secondary hover:bg-secondary-hover text-white' },
    ready: { label: 'Done', icon: CheckCircleIcon, color: 'bg-primary hover:bg-primary-hover text-white' },
  }[order.status as KitchenStatus];

  if (!actionConfig) return null;

  return (
    <div
      onClick={onSelect}
      className={`
        bg-transparent rounded-2xl overflow-hidden cursor-pointer
        transition-all duration-150 border
        ${isSelected
          ? 'ring-2 ring-primary border-primary/30'
          : 'border-brown-light/25 active:scale-[0.98]'
        }
      `}
    >
      <div className="p-4 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-text-dark font-body">{order.orderNumber}</span>
            </div>
            {order.contact.name && <p className="text-text-dark text-sm font-medium font-body ml-4">{order.contact.name}</p>}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold font-body ${statusCfg.bg} ${statusCfg.dot.replace('bg-', 'text-')}`}>
              {kitchenLabel}
            </span>
            <span className="text-xs font-body text-neutral-gray">{ORDER_TYPE_LABELS[order.fulfillmentType].label}</span>
          </div>
        </div>

        {/* Items preview */}
        <div className="mb-3">
          {order.items.slice(0, 3).map(item => (
            <div key={item.id} className="flex items-center gap-2 text-sm text-text-dark py-0.5 font-body">
              <span className="w-5 h-5 rounded bg-neutral-gray/5 border border-neutral-gray/25 text-text-gray text-xs font-bold flex items-center justify-center">
                {item.quantity}
              </span>
              <span className="truncate">{item.name}</span>
            </div>
          ))}
          {order.items.length > 3 && (
            <p className="text-xs text-neutral-gray mt-1 font-body">+{order.items.length - 3} more</p>
          )}
        </div>

        {/* Notes */}
        {order.contact.notes && (
          <div className="flex items-center gap-1.5 text-text-gray text-xs mb-3 font-body">
            <WarningCircleIcon className="w-4 h-4 shrink-0" />
            <span className="truncate">{order.contact.notes}</span>
          </div>
        )}

        {/* Action button — pinned to bottom */}
        <button
          onClick={(e) => { e.stopPropagation(); onAction(); }}
          className={`w-full mt-auto h-12 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.95] transition-all font-body ${actionConfig.color}`}
        >
          <actionConfig.icon className="w-5 h-5" weight="bold" />
          {actionConfig.label}
        </button>
      </div>
    </div>
  );
}

// ─── Order Detail Panel ───────────────────────────────────────────────────────

interface OrderDetailPanelProps {
  order: Order;
  onAction: () => void;
  onClose: () => void;
}

function OrderDetailPanel({ order, onAction, onClose }: OrderDetailPanelProps) {
  const statusCfg = STATUS_CONFIG[order.status];
  const kitchenLabel = KITCHEN_STATUS_LABELS[order.status] ?? statusCfg.label;
  const TypeIcon = ORDER_TYPE_LABELS[order.fulfillmentType].icon;

  const actionConfig = {
    received: { label: 'Accept Order', icon: CheckIcon, color: 'bg-brown text-text-light hover:bg-brown-light' },
    accepted: { label: 'Start Cooking', icon: PlayIcon, color: 'bg-teal-600 text-white hover:bg-teal-700' },
    preparing: { label: 'Mark Ready', icon: CheckIcon, color: 'bg-secondary text-white hover:bg-secondary-hover' },
    ready: { label: 'Complete Order', icon: CheckCircleIcon, color: 'bg-primary text-white hover:bg-primary-hover' },
  }[order.status as KitchenStatus];

  if (!actionConfig) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 py-4 border-b border-brown-light/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-text-dark font-body">#{order.orderNumber}</span>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-body ${statusCfg.bg} ${statusCfg.dot.replace('bg-', 'text-')}`}>
              {kitchenLabel}
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

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <h3 className="text-xs font-semibold text-neutral-gray mb-3 uppercase tracking-wide font-body">Items</h3>
        <div className="space-y-2">
          {order.items.map(item => (
            <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-neutral-light border border-brown-light/15">
              <span className="w-8 h-8 rounded-lg bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0 text-sm font-body">
                {item.quantity}
              </span>
              <div>
                <p className="text-text-dark font-medium font-body">{item.name}</p>
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
            <span className="font-medium text-text-dark">{new Date(order.placedAt).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {order.startedAt && (
            <div className="flex justify-between text-neutral-gray">
              <span>Started</span>
              <span className="font-medium text-text-dark">{new Date(order.startedAt).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
          {order.readyAt && (
            <div className="flex justify-between text-neutral-gray">
              <span>Ready</span>
              <span className="font-medium text-text-dark">{new Date(order.readyAt).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action footer — big touch target */}
      <div className="shrink-0 p-4 border-t border-brown-light/20">
        <button
          onClick={onAction}
          className={`w-full h-14 rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 active:scale-[0.95] transition-all font-body ${actionConfig.color}`}
        >
          <actionConfig.icon className="w-6 h-6" weight="bold" />
          {actionConfig.label}
        </button>
      </div>
    </div>
  );
}
