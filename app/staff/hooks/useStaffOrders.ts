'use client';

import { useMemo } from 'react';
import { useOrderStore } from '@/app/components/providers/OrderStoreProvider';
import type { Order, OrderFilter } from '@/types/order';
import { ghanaDayBounds } from '@/lib/utils/serverClock';

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

/**
 * Orders assigned to this staff member on one day, by the server's calendar
 * (staff portal D21). The caller passes the day, from `serverToday()` or a date
 * the server sent, so a POS with a wrong clock still shows the right day.
 */
export function useMySalesOrders(staffId: string, date: string): Order[] {
    const { getOrdersByFilter } = useOrderStore();

    return useMemo(() => {
        if (!staffId || !date) {
            return [];
        }

        const { from, to } = ghanaDayBounds(date);
        return getOrdersByFilter({ staffId, dateFrom: from, dateTo: to });
    }, [getOrdersByFilter, staffId, date]);
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
