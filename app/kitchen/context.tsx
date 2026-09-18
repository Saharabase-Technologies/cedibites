'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from 'react';
import type { Order, FulfillmentType, OrderSource, CreateOrderInput, OrderStatus } from '@/types/order';
import { useOrderStore } from '@/app/components/providers/OrderStoreProvider';
import { useKitchenOrders } from './hooks/useKitchenOrders';
import { useKitchenSounds } from './hooks/useSounds';
import { useOrderAlerts, type OrderAlerts } from '@/lib/hooks/useOrderAlerts';
import { STAGE_SLA_S as KITCHEN_SLA_S } from '@/lib/constants/order.constants';
import { useSwitchKitchenBranch } from './branch-context';

// ─── Kitchen-specific stats (UI only) ──────────────────────────────────────

export interface KitchenStats {
  received: number;
  accepted: number;
  preparing: number;
  ready: number;
  avgPrepTime: number; // in seconds
}

interface KitchenContextValue {
  orders: Order[];
  ordersByStatus: {
    received: Order[];
    accepted: Order[];
    preparing: Order[];
    ready: Order[];
    cancel_requested: Order[];
  };
  stats: KitchenStats;
  acceptOrder: (orderId: string) => void;
  startOrder: (orderId: string) => void;
  markReady: (orderId: string) => void;
  completeOrder: (orderId: string) => void;
  completeAllReady: () => void;
  approveCancel: (orderId: string) => void;
  rejectCancel: (order: Order) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  /** Arrival + overdue state, shared with the Order Manager's alert layer. */
  alerts: OrderAlerts;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  simulateNewOrder: () => void;
}

const KitchenContext = createContext<KitchenContextValue | null>(null);

export function useKitchen() {
  const ctx = useContext(KitchenContext);
  if (!ctx) throw new Error('useKitchen must be used within KitchenProvider');
  return ctx;
}

export function KitchenProvider({ children }: { children: ReactNode }) {
  const { branchId } = useSwitchKitchenBranch();
  const kitchenOrders = useKitchenOrders(branchId ?? undefined);
  const { updateOrderStatus, updateOrder, createOrder } = useOrderStore();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // `useKitchenSounds` is kept only for the per-action feedback below (tap,
  // started, ready). Arrivals are no longer its job.
  const sounds = useKitchenSounds();

  // Sync sound enabled state
  useEffect(() => {
    sounds.setEnabled(soundEnabled);
  }, [soundEnabled, sounds]);

  /**
   * Arrivals and overdue tickets, shared with the Order Manager.
   *
   * This used to be a count watch — `kitchenOrders.length > previous` — firing
   * `playNewOrder`, a three-note phrase that repeats itself once. Two things
   * were wrong with it. It could not tell an arrival from a net change, so an
   * order arriving in the same refresh window that another was completed made
   * no sound at all. And because this screen polled every second it beat the
   * websocket, so on a bench with both screens open the kitchen heard this
   * announce an order seconds before the Order Manager showed it — the two
   * boards disagreeing out loud.
   *
   * Both now run the same identity-based hook against the same thresholds, so
   * they agree by construction.
   */
  // Cancel requests are left out, the same as on the Order Manager. Only an
  // admin can settle one, so a request that sits for hours would take the
  // banner over as the worst offender and sound the escalation at a kitchen
  // that has no way to answer it. The two boards have to agree here as well.
  const alertOrders = useMemo(
    () =>
      kitchenOrders
        .filter(order => order.status !== 'cancel_requested')
        .map(order => ({
          id: order.id,
          label: order.orderNumber,
          stage: order.status,
          since: order.placedAt,
          awaitingAccept: order.status === 'received',
          // The bell rings for anything the kitchen has not started, which
          // includes a till sale that arrives already accepted.
          awaitingKitchen:
            order.status === 'received' || order.status === 'accepted',
        })),
    [kitchenOrders],
  );

  const alerts = useOrderAlerts({
    orders: alertOrders,
    sla: KITCHEN_SLA_S,
    enabled: soundEnabled,
    resetKey: branchId ?? null,
  });

  // Group and sort orders by status
  const ordersByStatus = useMemo(() => {
    const grouped = {
      received: [] as Order[],
      accepted: [] as Order[],
      preparing: [] as Order[],
      ready: [] as Order[],
      cancel_requested: [] as Order[],
    };

    const sorted = [...kitchenOrders].sort((a, b) => a.placedAt - b.placedAt);

    sorted.forEach(order => {
      if (order.status in grouped) {
        grouped[order.status as keyof typeof grouped].push(order);
      }
    });

    return grouped;
  }, [kitchenOrders]);

  // Stats
  const stats = useMemo((): KitchenStats => {
    const completedOrders = kitchenOrders.filter(o => o.readyAt && o.startedAt);
    const avgPrepTime = completedOrders.length > 0
      ? completedOrders.reduce((sum, o) => sum + (o.readyAt! - o.startedAt!), 0) / completedOrders.length / 1000
      : 0;

    return {
      received: ordersByStatus.received.length,
      accepted: ordersByStatus.accepted.length,
      preparing: ordersByStatus.preparing.length,
      ready: ordersByStatus.ready.length,
      avgPrepTime: Math.round(avgPrepTime),
    };
  }, [kitchenOrders, ordersByStatus]);

  const acceptOrder = useCallback((orderId: string) => {
    sounds.playTap();
    updateOrderStatus(orderId, 'accepted', { acceptedAt: Date.now() });
  }, [sounds, updateOrderStatus]);

  const startOrder = useCallback((orderId: string) => {
    sounds.playOrderStarted();
    updateOrderStatus(orderId, 'preparing', { startedAt: Date.now() });
  }, [sounds, updateOrderStatus]);

  const markReady = useCallback((orderId: string) => {
    sounds.playOrderReady();
    updateOrderStatus(orderId, 'ready', { readyAt: Date.now() });
  }, [sounds, updateOrderStatus]);

  const completeOrder = useCallback((orderId: string) => {
    sounds.playTap();
    updateOrderStatus(orderId, 'completed', { completedAt: Date.now() });
  }, [sounds, updateOrderStatus]);

  const completeAllReady = useCallback(() => {
    sounds.playTap();
    ordersByStatus.ready.forEach(order => {
      updateOrderStatus(order.id, 'completed', { completedAt: Date.now() });
    });
  }, [sounds, ordersByStatus.ready, updateOrderStatus]);

  const approveCancel = useCallback((orderId: string) => {
    sounds.playTap();
    updateOrderStatus(orderId, 'cancelled', { completedAt: Date.now() });
  }, [sounds, updateOrderStatus]);

  const rejectCancel = useCallback((order: Order) => {
    sounds.playTap();
    const restoreStatus = (order.cancelPreviousStatus ?? 'received') as OrderStatus;
    updateOrder(order.id, {
      status: restoreStatus,
      cancelRequestedBy: undefined,
      cancelRequestedAt: undefined,
      cancelRequestReason: undefined,
      cancelPreviousStatus: undefined,
    });
  }, [sounds, updateOrder]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const simulateNewOrder = useCallback(() => {
    const mockItems = [
      { menuItemId: 'm1', name: 'Jollof Rice', quantity: Math.ceil(Math.random() * 3), unitPrice: 35 },
      { menuItemId: 'm2', name: 'Fried Chicken', quantity: Math.ceil(Math.random() * 2), unitPrice: 25 },
      { menuItemId: 'm3', name: 'Waakye', quantity: 1, unitPrice: 30 },
      { menuItemId: 'm4', name: 'Banku & Tilapia', quantity: 1, unitPrice: 55 },
    ];

    const fulfillmentTypes: FulfillmentType[] = ['dine_in', 'takeaway', 'delivery', 'pickup'];
    const sources: OrderSource[] = ['pos', 'online', 'phone', 'whatsapp'];
    const names = ['Kwame', 'Ama', 'Kofi', 'Akua', 'Yaw', 'Abena'];

    const selectedItems = mockItems.slice(0, Math.ceil(Math.random() * 3) + 1);

    const input: CreateOrderInput = {
      source: sources[Math.floor(Math.random() * sources.length)],
      fulfillmentType: fulfillmentTypes[Math.floor(Math.random() * fulfillmentTypes.length)],
      paymentMethod: 'cash',
      items: selectedItems,
      contact: {
        name: names[Math.floor(Math.random() * names.length)],
        phone: '024' + Math.floor(1000000 + Math.random() * 9000000),
      },
      branchId: 'osu',
      branchName: 'Osu',
    };

    createOrder(input);
  }, [createOrder]);

  return (
    <KitchenContext.Provider value={{
      orders: kitchenOrders, ordersByStatus, stats,
      acceptOrder, startOrder, markReady, completeOrder, completeAllReady,
      approveCancel, rejectCancel,
      soundEnabled, setSoundEnabled, alerts,
      isFullscreen, toggleFullscreen,
      simulateNewOrder,
    }}>
      {children}
    </KitchenContext.Provider>
  );
}
