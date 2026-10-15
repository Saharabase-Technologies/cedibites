'use client';

import { useMemo } from 'react';
import type { Order, OrderStatus } from '@/types/order';
import { useOrderChannel } from '@/lib/hooks/useOrderChannel';
import { orderTickets } from '@/lib/utils/orderRounds';

/** What the kitchen display shows. Anything else is somebody else's screen. */
const KITCHEN_STATUSES = new Set<OrderStatus>(['received', 'accepted', 'preparing', 'ready', 'cancel_requested']);

/**
 * Returns the kitchen's tickets for a specific branch.
 * Subscribes to the Reverb channel for real-time updates.
 *
 * Items added to an order after it was placed are a ticket of their own, with
 * their own status (Phase 4b). An order with none is one ticket, as before.
 */
export function useKitchenOrders(branchId?: string): Order[] {
  const { orders } = useOrderChannel(branchId ?? null);
  return useMemo(
    () => orders.flatMap(orderTickets).filter((ticket) => KITCHEN_STATUSES.has(ticket.status)),
    [orders],
  );
}
