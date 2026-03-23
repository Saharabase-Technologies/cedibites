'use client';

import type { Order } from '@/types/order';
import { useOrderChannel } from '@/lib/hooks/useOrderChannel';

/**
 * Returns orders relevant to the kitchen display for a specific branch.
 * Subscribes to the Reverb channel for real-time updates.
 */
export function useKitchenOrders(branchId?: string): Order[] {
  const { orders } = useOrderChannel(branchId ?? null);
  return orders;
}
