'use client';

import { useMemo } from 'react';
import { useOrderStore } from '@/app/components/providers/OrderStoreProvider';
import type { Order } from '@/types/order';

/** Start of today in Unix ms */
function startOfToday(): number {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

/**
 * Returns POS orders for a specific branch, today only.
 * Optionally filtered by staff.
 */
export function usePOSOrders(branchId: string, staffId?: string): Order[] {
    const { getOrdersByFilter } = useOrderStore();

    return useMemo(() => {
        return getOrdersByFilter({
            branchId,
            source: ['pos'],
            staffId,
            dateFrom: startOfToday(),
        });
    }, [getOrdersByFilter, branchId, staffId]);
}
