'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { StaffOrder, OrderStatus } from './types';
import type { DateRange } from './components/DateFilter';
import { MOCK_ORDERS } from './constants';

// ─── Context type ─────────────────────────────────────────────────────────────

interface OrdersContextValue {
    // Data
    orders: StaffOrder[];
    filteredOrders: StaffOrder[];

    // Filters
    search: string;
    setSearch: (v: string) => void;
    branchFilter: string;
    setBranchFilter: (v: string) => void;
    dateRange: DateRange | null;
    setDateRange: (r: DateRange | null) => void;
    showCancelled: boolean;
    setShowCancelled: React.Dispatch<React.SetStateAction<boolean>>;

    // Derived
    branches: string[];
    receivedCount: number;
    preparingCount: number;

    // Selection
    selectedOrder: StaffOrder | null;
    setSelectedOrder: (o: StaffOrder | null) => void;

    // Drag
    draggingId: string | null;
    setDraggingId: (id: string | null) => void;

    // Actions
    handleAdvance: (id: string, status: OrderStatus) => void;
    handleDrop: (e: React.DragEvent, targetStatus: OrderStatus) => void;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function useOrders(): OrdersContextValue {
    const ctx = useContext(OrdersContext);
    if (!ctx) throw new Error('useOrders must be used within OrdersProvider');
    return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function OrdersProvider({ children }: { children: React.ReactNode }) {
    const [orders, setOrders] = useState<StaffOrder[]>(MOCK_ORDERS);
    const [search, setSearch] = useState('');
    const [branchFilter, setBranchFilter] = useState('All');
    const [dateRange, setDateRange] = useState<DateRange | null>(null);
    const [showCancelled, setShowCancelled] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<StaffOrder | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);

    // ── Derived ──
    const branches = useMemo(
        () => ['All', ...Array.from(new Set(orders.map(o => o.branch)))],
        [orders],
    );

    const receivedCount = useMemo(() => orders.filter(o => o.status === 'received').length, [orders]);
    const preparingCount = useMemo(() => orders.filter(o => o.status === 'preparing').length, [orders]);

    const filteredOrders = useMemo(() => {
        let list = orders;

        if (!showCancelled) list = list.filter(o => o.status !== 'cancelled');
        if (branchFilter !== 'All') list = list.filter(o => o.branch === branchFilter);

        if (dateRange) {
            list = list.filter(o => {
                const t = o.placedAt.getTime();
                return t >= dateRange.from.getTime() && t <= dateRange.to.getTime();
            });
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(o =>
                o.customer.name.toLowerCase().includes(q) ||
                o.customer.phone.includes(q) ||
                o.id.toLowerCase().includes(q),
            );
        }

        return list;
    }, [orders, showCancelled, branchFilter, dateRange, search]);

    // ── Actions ──
    const handleAdvance = useCallback((id: string, status: OrderStatus) => {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
        // Also update the open detail panel in real-time
        setSelectedOrder(prev => prev?.id === id ? { ...prev, status } : prev);
        // TODO: PATCH /api/v1/staff/orders/:id/status { status }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, targetStatus: OrderStatus) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('orderId');
        if (id) handleAdvance(id, targetStatus);
    }, [handleAdvance]);

    return (
        <OrdersContext.Provider value={{
            orders, filteredOrders,
            search, setSearch,
            branchFilter, setBranchFilter,
            dateRange, setDateRange,
            showCancelled, setShowCancelled,
            branches, receivedCount, preparingCount,
            selectedOrder, setSelectedOrder,
            draggingId, setDraggingId,
            handleAdvance, handleDrop,
        }}>
            {children}
        </OrdersContext.Provider>
    );
}
