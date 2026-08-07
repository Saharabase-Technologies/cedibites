'use client';

import { useMemo } from 'react';
import { useOrderStore } from '@/app/components/providers/OrderStoreProvider';
import type { Order, OrderFilter } from '@/types/order';

/**
 * Returns orders for the staff kanban, optionally filtered by branch.
 */
export function useStaffOrders(branchName?: string): Order[] {
    const { getOrdersByFilter } = useOrderStore();

    return useMemo(() => {
        const filter: OrderFilter = {};
        if (branchName && branchName !== 'All') {
            filter.branchName = branchName;
        }
        return getOrdersByFilter(filter);
    }, [getOrdersByFilter, branchName]);
}

/** Start of today in local calendar (Unix ms). */
function startOfToday(): number {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

/** End of today in local calendar (Unix ms). */
function endOfToday(): number {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
}

/**
 * Returns orders assigned to this staff member for the current local calendar day (My Sales / daily reconciliation).
 */
export function useMySalesOrders(staffId: string): Order[] {
    const { getOrdersByFilter } = useOrderStore();

    return useMemo(() => {
        if (!staffId) {
            return [];
        }

        return getOrdersByFilter({
            staffId,
            dateFrom: startOfToday(),
            dateTo: endOfToday(),
        });
    }, [getOrdersByFilter, staffId]);
}

/**
 * Returns orders for a specific customer by phone number.
 */
export function useCustomerOrders(phone: string): Order[] {
    const { getOrdersByFilter } = useOrderStore();

    return useMemo(() => {
        if (!phone) return [];
        return getOrdersByFilter({ contactPhone: phone });
    }, [getOrdersByFilter, phone]);
}
