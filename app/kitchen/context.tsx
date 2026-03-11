'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import type { Order, OrderStatus, FulfillmentType, OrderSource, CreateOrderInput } from '@/types/order';
import { useOrderStore } from '@/app/components/providers/OrderStoreProvider';
import { useKitchenOrders } from './hooks/useKitchenOrders';
import { useKitchenSounds } from './hooks/useSounds';

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
  };
  stats: KitchenStats;
  acceptOrder: (orderId: string) => void;
  startOrder: (orderId: string) => void;
  markReady: (orderId: string) => void;
  completeOrder: (orderId: string) => void;
  completeAllReady: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
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
  const kitchenOrders = useKitchenOrders();
  const { updateOrderStatus, createOrder } = useOrderStore();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const sounds = useKitchenSounds();
  const prevOrderCountRef = useRef(kitchenOrders.length);

  // Sync sound enabled state
  useEffect(() => {
    sounds.setEnabled(soundEnabled);
  }, [soundEnabled, sounds]);

  // Play sound when new order arrives
  useEffect(() => {
    if (kitchenOrders.length > prevOrderCountRef.current) {
      sounds.playNewOrder();
    }
    prevOrderCountRef.current = kitchenOrders.length;
  }, [kitchenOrders.length, sounds]);

  // Group and sort orders by status
  const ordersByStatus = useMemo(() => {
    const grouped = {
      received: [] as Order[],
      accepted: [] as Order[],
      preparing: [] as Order[],
      ready: [] as Order[],
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
      soundEnabled, setSoundEnabled,
      isFullscreen, toggleFullscreen,
      simulateNewOrder,
    }}>
      {children}
    </KitchenContext.Provider>
  );
}
