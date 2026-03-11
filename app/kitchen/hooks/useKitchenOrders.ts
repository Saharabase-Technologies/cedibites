'use client';

import { useMemo } from 'react';
import { useOrderStore } from '@/app/components/providers/OrderStoreProvider';
import type { Order, OrderStatus } from '@/types/order';

const KITCHEN_STATUSES: OrderStatus[] = ['received', 'accepted', 'preparing', 'ready'];

/**
 * Returns orders relevant to the kitchen display for a specific branch.
 * Filters to: received, accepted, preparing, ready.
 */
export function useKitchenOrders(branchId?: string): Order[] {
    const { getOrdersByFilter } = useOrderStore();

    return useMemo(() => {
        return getOrdersByFilter({
            branchId,
            status: KITCHEN_STATUSES,
        });
    }, [getOrdersByFilter, branchId]);
}
