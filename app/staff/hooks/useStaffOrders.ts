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

/** Start of today in Unix ms */
function startOfToday(): number {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

/**
 * Returns orders created by a specific staff member today (for My Sales).
 */
export function useMySalesOrders(staffId: string): Order[] {
    const { getOrdersByFilter } = useOrderStore();

    return useMemo(() => {
        return getOrdersByFilter({
            staffId,
            dateFrom: startOfToday(),
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
