'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { Order, OrderFilter, OrderStatus, CreateOrderInput } from '@/types/order';
import { getOrderService } from '@/lib/services/orders/order.service';
import { getStaffToken } from '@/lib/api/services/staff.service';

// ─── Context shape ──────────────────────────────────────────────────────────

interface OrderStoreContextType {
    /** All orders in the store */
    orders: Order[];
    /** Loading state */
    isLoading: boolean;

    /** Get a single order by ID */
    getOrderById: (id: string) => Order | undefined;
    /** Get filtered orders */
    getOrdersByFilter: (filter: OrderFilter) => Order[];

    /** Create a new order */
    createOrder: (input: CreateOrderInput) => Promise<Order>;
    /** Update order status */
    updateOrderStatus: (id: string, status: OrderStatus, timestamps?: Partial<Pick<Order, 'acceptedAt' | 'startedAt' | 'readyAt' | 'completedAt'>>) => Promise<Order>;
    /** Patch arbitrary order fields */
    updateOrder: (id: string, patch: Partial<Order>) => Promise<Order>;
    /** Delete an order */
    deleteOrder: (id: string) => Promise<void>;

    /** Force refresh from storage */
    refresh: () => Promise<void>;
}

const OrderStoreContext = createContext<OrderStoreContextType | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────

export function OrderStoreProvider({ children }: { children: ReactNode }) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load orders on mount + subscribe for cross-tab updates
    useEffect(() => {
        const service = getOrderService();

        const loadOrders = async () => {
            if (!getStaffToken()) {
                setIsLoading(false);
                return;
            }
            try {
                const data = await service.getAll();
                setOrders(data);
            } catch (error) {
                console.error('Failed to load orders:', error);
                setOrders([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadOrders();
        const unsubscribe = service.subscribe((updatedOrders) => setOrders(updatedOrders));

        const handleStaffLogin = () => {
            loadOrders();
        };
        window.addEventListener('staff-login', handleStaffLogin);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') loadOrders();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            unsubscribe();
            window.removeEventListener('staff-login', handleStaffLogin);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // ── Read ─────────────────────────────────────────────────────────────

    const getOrderById = useCallback(
        (id: string) => orders.find(o => o.id.toUpperCase() === id.toUpperCase()),
        [orders],
    );

    const getOrdersByFilter = useCallback(
        (filter: OrderFilter): Order[] => {
            let result = orders;

            if (filter.branchId) result = result.filter(o => o.branch.id === filter.branchId);
            if (filter.branchName) result = result.filter(o => o.branch.name === filter.branchName);
            if (filter.staffId) result = result.filter(o => o.staffId === filter.staffId);
            if (filter.status?.length) result = result.filter(o => filter.status!.includes(o.status));
            if (filter.fulfillmentType?.length) result = result.filter(o => filter.fulfillmentType!.includes(o.fulfillmentType));
            if (filter.source?.length) result = result.filter(o => filter.source!.includes(o.source));
            if (filter.contactPhone) result = result.filter(o => o.contact.phone === filter.contactPhone);
            if (filter.dateFrom) result = result.filter(o => o.placedAt >= filter.dateFrom!);
            if (filter.dateTo) result = result.filter(o => o.placedAt <= filter.dateTo!);
            if (filter.search) {
                const q = filter.search.toLowerCase();
                result = result.filter(o =>
                    o.id.toLowerCase().includes(q) ||
                    o.orderNumber.toLowerCase().includes(q) ||
                    o.contact.name.toLowerCase().includes(q) ||
                    o.contact.phone.includes(q)
                );
            }

            return result;
        },
        [orders],
    );

    // ── Write ────────────────────────────────────────────────────────────

    const createOrder = useCallback(async (input: CreateOrderInput): Promise<Order> => {
        const service = getOrderService();
        const order = await service.create(input);
        // Read authoritative list from storage — order is already written there by service.create()
        const allOrders = await service.getAll();
        setOrders(allOrders);
        return order;
    }, []);

    const updateOrderStatus = useCallback(async (
        id: string,
        status: OrderStatus,
        timestamps?: Partial<Pick<Order, 'acceptedAt' | 'startedAt' | 'readyAt' | 'completedAt'>>,
    ): Promise<Order> => {
        const service = getOrderService();
        const updated = await service.updateStatus(id, status, timestamps);
        // Optimistic update
        setOrders(prev => prev.map(o => o.id === id ? updated : o));
        return updated;
    }, []);

    const updateOrder = useCallback(async (id: string, patch: Partial<Order>): Promise<Order> => {
        const service = getOrderService();
        const updated = await service.update(id, patch);
        setOrders(prev => prev.map(o => o.id === id ? updated : o));
        return updated;
    }, []);

    const deleteOrder = useCallback(async (id: string): Promise<void> => {
        const service = getOrderService();
        await service.delete(id);
        setOrders(prev => prev.filter(o => o.id !== id));
    }, []);

    const refresh = useCallback(async () => {
        const service = getOrderService();
        const data = await service.getAll();
        setOrders(data);
    }, []);

    // ── Context value ────────────────────────────────────────────────────

    const value = useMemo<OrderStoreContextType>(() => ({
        orders,
        isLoading,
        getOrderById,
        getOrdersByFilter,
        createOrder,
        updateOrderStatus,
        updateOrder,
        deleteOrder,
        refresh,
    }), [orders, isLoading, getOrderById, getOrdersByFilter, createOrder, updateOrderStatus, updateOrder, deleteOrder, refresh]);

    return (
        <OrderStoreContext.Provider value={value}>
            {children}
        </OrderStoreContext.Provider>
    );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useOrderStore(): OrderStoreContextType {
    const ctx = useContext(OrderStoreContext);
    if (!ctx) throw new Error('useOrderStore must be used within OrderStoreProvider');
    return ctx;
}
