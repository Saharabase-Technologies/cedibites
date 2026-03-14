'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Order, OrderStatus, UserRole, OrderNotification } from '@/types/order';
import { canAdvanceOrder } from '@/types/order';
import type { DateRange } from './components/DateFilter';
import { KANBAN_COLUMNS, BRANCH_COORDS } from '@/lib/constants/order.constants';
import { BRANCHES } from '@/app/components/providers/BranchProvider';
import { useOrderStore } from '@/app/components/providers/OrderStoreProvider';
import { useSounds, type SoundName } from './hooks/useSounds';

// ─── Context type ─────────────────────────────────────────────────────────────

interface OrdersContextValue {
    // Data
    orders: Order[];
    filteredOrders: Order[];
    userRole: UserRole;

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
    selectedOrder: Order | null;
    setSelectedOrder: (o: Order | null) => void;

    // Drag
    draggingId: string | null;
    setDraggingId: (id: string | null) => void;

    // Sound
    soundEnabled: boolean;
    toggleSound: () => void;
    playSound: (name: SoundName) => void;

    // Notifications
    notifications: OrderNotification[];
    dismissNotification: (id: string) => void;

    // Actions
    handleAdvance: (id: string, status: OrderStatus) => void;
    handleDrop: (e: React.DragEvent, targetStatus: OrderStatus) => void;
    simulateNewOrder: () => void;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function useOrders(): OrdersContextValue {
    const ctx = useContext(OrdersContext);
    if (!ctx) throw new Error('useOrders must be used within OrdersProvider');
    return ctx;
}

// ─── Test order factory ───────────────────────────────────────────────────────

const DEMO_CUSTOMERS = [
    { name: 'Kwame Asante',  phone: '0244100200' },
    { name: 'Abena Mensah',  phone: '0551234500' },
    { name: 'Kofi Boateng',  phone: '0277890100' },
    { name: 'Ama Darko',     phone: '0200998877' },
];
const DEMO_BRANCHES = ['East Legon', 'Osu', 'Tema', 'Madina'];
const DEMO_ITEMS = [
    [{ name: 'Jollof Rice', unitPrice: 35 }, { name: 'Coke', unitPrice: 10 }],
    [{ name: 'Waakye Special', unitPrice: 30 }],
    [{ name: 'Banku & Tilapia', unitPrice: 55 }, { name: 'Sobolo', unitPrice: 10 }],
    [{ name: 'Fufu & Goat Light Soup', unitPrice: 50 }],
];
const DEMO_CUSTOMER_COORDS = [
    { latitude: 5.6320, longitude: -0.1480 },
    { latitude: 5.5745, longitude: -0.1690 },
    { latitude: 5.6525, longitude: -0.0080 },
    { latitude: 5.6750, longitude: -0.1650 },
];

// ─── Provider ─────────────────────────────────────────────────────────────────

export function OrdersProvider({ children, role = 'call_center' }: { children: React.ReactNode; role?: UserRole }) {
    const { orders: storeOrders, updateOrderStatus, updateOrder, createOrder } = useOrderStore();

    const [search, setSearch] = useState('');
    const [branchFilter, setBranchFilter] = useState('All');
    const [dateRange, setDateRange] = useState<DateRange | null>(null);
    const [showCancelled, setShowCancelled] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [notifications, setNotifications] = useState<OrderNotification[]>([]);

    // Keep selectedOrder synced with store
    useEffect(() => {
        if (!selectedOrder) return;
        const updated = storeOrders.find(o => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
        else setSelectedOrder(null);
    }, [storeOrders, selectedOrder]);

    // Refs to avoid stale closures in async callbacks
    const ordersRef = useRef(storeOrders);
    useEffect(() => { ordersRef.current = storeOrders; }, [storeOrders]);

    const soundEnabledRef = useRef(soundEnabled);
    useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

    // Track all simulation timers/intervals so we can clean them up on unmount
    const simTimers    = useRef<ReturnType<typeof setTimeout>[]>([]);
    const simIntervals = useRef<ReturnType<typeof setInterval>[]>([]);
    useEffect(() => () => simTimers.current.forEach(clearTimeout),    []);
    useEffect(() => () => simIntervals.current.forEach(clearInterval), []);

    // ── Sound ──
    const { playSound: _play } = useSounds();
    const playSound = useCallback((name: SoundName) => {
        if (soundEnabledRef.current) _play(name);
    }, [_play]);

    const toggleSound = useCallback(() => setSoundEnabled(s => !s), []);

    // ── Notifications ──
    const notify = useCallback((
        n: Omit<OrderNotification, 'id' | 'createdAt'>,
        sound?: SoundName,
    ) => {
        const id = Math.random().toString(36).slice(2, 9);
        setNotifications(prev => [{ ...n, id, createdAt: Date.now() }, ...prev].slice(0, 6));
        if (sound) {
            if (soundEnabledRef.current) _play(sound);
        }
        const t = setTimeout(
            () => setNotifications(prev => prev.filter(x => x.id !== id)),
            5000,
        );
        simTimers.current.push(t);
    }, [_play]);

    const dismissNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    // ── Derived ──
    const branches = useMemo(
        () => ['All', ...Array.from(new Set(storeOrders.map(o => o.branch.name)))],
        [storeOrders],
    );
    const receivedCount  = useMemo(() => storeOrders.filter(o => o.status === 'received').length, [storeOrders]);
    const preparingCount = useMemo(() => storeOrders.filter(o => o.status === 'preparing').length, [storeOrders]);

    const filteredOrders = useMemo(() => {
        let list = storeOrders;
        if (!showCancelled) list = list.filter(o => o.status !== 'cancelled');
        if (branchFilter !== 'All') list = list.filter(o => o.branch.name === branchFilter);
        if (dateRange) {
            list = list.filter(o => {
                return o.placedAt >= dateRange.from.getTime() && o.placedAt <= dateRange.to.getTime();
            });
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(o =>
                o.contact.name.toLowerCase().includes(q) ||
                o.contact.phone.includes(q) ||
                o.id.toLowerCase().includes(q) ||
                o.orderNumber.toLowerCase().includes(q),
            );
        }
        return list;
    }, [storeOrders, showCancelled, branchFilter, dateRange, search]);

    // ── Rider simulation ──────────────────────────────────────────────────────
    const startRiderSim = useCallback((id: string) => {
        const order = ordersRef.current.find(o => o.id === id);
        if (!order?.coords) return;

        const { branch, customer } = order.coords;
        if (!customer) return;
        const STEPS = 36;
        let step = 0;

        const interval = setInterval(() => {
            step++;
            const t = Math.min(step / STEPS, 1);
            const rider = {
                latitude:  branch.latitude  + (customer.latitude  - branch.latitude)  * t,
                longitude: branch.longitude + (customer.longitude - branch.longitude) * t,
            };

            updateOrder(id, { coords: { branch, customer, rider } });

            const current = ordersRef.current.find(o => o.id === id);
            if (t >= 1 || !current || current.status !== 'out_for_delivery') {
                clearInterval(interval);
            }
        }, 5000);

        simIntervals.current.push(interval);
    }, [updateOrder]);

    // ── Kitchen simulation ────────────────────────────────────────────────────
    const scheduleKitchenSim = useCallback((orderId: string, customerName: string) => {
        // +30 s: kitchen accepts
        const t1 = setTimeout(() => {
            updateOrder(orderId, { kitchenConfirmed: true });
            notify({
                type: 'kitchen',
                title: 'Kitchen Confirmed',
                message: `Order #${orderId} accepted — kitchen is on it`,
                orderId,
            }, 'advance');
        }, 30_000);

        // +90 s: kitchen starts preparing
        const t2 = setTimeout(() => {
            updateOrderStatus(orderId, 'preparing', { startedAt: Date.now() });
            notify({
                type: 'kitchen',
                title: 'Now Preparing',
                message: `Kitchen started preparing #${orderId} for ${customerName}`,
                orderId,
            }, 'advance');
        }, 90_000);

        // +120 s: ready for dispatch
        const t3 = setTimeout(() => {
            updateOrderStatus(orderId, 'ready', { readyAt: Date.now() });
            notify({
                type: 'success',
                title: 'Order Ready!',
                message: `#${orderId} is ready — dispatch to ${customerName}`,
                orderId,
            }, 'complete');
        }, 120_000);

        simTimers.current.push(t1, t2, t3);
    }, [notify, updateOrder, updateOrderStatus]);

    // ── Add a simulated test order ────────────────────────────────────────────
    const simulateNewOrder = useCallback(() => {
        const idx  = Math.floor(Math.random() * DEMO_CUSTOMERS.length);
        const fulfillmentType = Math.random() > 0.5 ? 'delivery' as const : 'pickup' as const;
        const items = DEMO_ITEMS[idx].map((it, i) => ({
            menuItemId: `demo-${i}`,
            name: it.name,
            quantity: Math.random() > 0.5 ? 2 : 1,
            unitPrice: it.unitPrice,
        }));
        const branchName = DEMO_BRANCHES[idx];
        const branchCoords = BRANCH_COORDS[branchName] ?? { latitude: 5.6465, longitude: -0.1549 };

        createOrder({
            source: 'whatsapp',
            fulfillmentType,
            paymentMethod: 'momo',
            items,
            contact: {
                name: DEMO_CUSTOMERS[idx].name,
                phone: DEMO_CUSTOMERS[idx].phone,
                address: fulfillmentType === 'delivery' ? 'Test Address, Accra' : undefined,
            },
            branchId: BRANCHES.find(b => b.name === branchName)?.id ?? branchName,
            branchName,
            branchCoordinates: branchCoords,
        }).then(order => {
            notify({
                type: 'info',
                title: 'New Order Placed',
                message: `#${order.orderNumber} · ${order.contact.name} · ${fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'} · ₵${order.total}`,
                orderId: order.id,
            }, 'newOrder');
            scheduleKitchenSim(order.id, order.contact.name);
        });
    }, [createOrder, notify, scheduleKitchenSim]);

    // ── handleAdvance ─────────────────────────────────────────────────────────
    const handleAdvance = useCallback((id: string, status: OrderStatus) => {
        const order = ordersRef.current.find(o => o.id === id);
        if (!order || !canAdvanceOrder(role, order, status)) return;

        if (status === 'out_for_delivery' || status === 'ready_for_pickup') {
            notify({
                type: 'info',
                title: 'Customer Notified',
                message: `SMS sent to ${order.contact.name} · ${order.contact.phone}`,
                orderId: id,
            }, 'notification');
            if (status === 'out_for_delivery' && order.fulfillmentType === 'delivery' && order.coords) {
                startRiderSim(id);
            }
        } else if (status === 'delivered' || status === 'completed') {
            notify({
                type: 'success',
                title: status === 'delivered' ? 'Order Delivered' : 'Order Completed',
                message: `#${id} for ${order.contact.name} is closed out`,
                orderId: id,
            }, 'complete');
        } else {
            playSound('advance');
        }

        const timestamps: Partial<Pick<Order, 'acceptedAt' | 'startedAt' | 'readyAt' | 'completedAt'>> = {};
        if (status === 'preparing') timestamps.startedAt = Date.now();
        if (status === 'ready') timestamps.readyAt = Date.now();
        if (status === 'delivered' || status === 'completed') timestamps.completedAt = Date.now();

        updateOrderStatus(id, status, timestamps);
    }, [role, notify, playSound, startRiderSim, updateOrderStatus]);

    const handleDrop = useCallback((e: React.DragEvent, targetStatus: OrderStatus) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('orderId');
        if (id) handleAdvance(id, targetStatus);
    }, [handleAdvance]);

    // ── Kick off rider simulation for any orders already en-route at mount ────
    useEffect(() => {
        ordersRef.current
            .filter(o => o.status === 'out_for_delivery' && o.fulfillmentType === 'delivery' && o.coords)
            .forEach(o => startRiderSim(o.id));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <OrdersContext.Provider value={{
            orders: storeOrders, filteredOrders,
            userRole: role,
            search, setSearch,
            branchFilter, setBranchFilter,
            dateRange, setDateRange,
            showCancelled, setShowCancelled,
            branches, receivedCount, preparingCount,
            selectedOrder, setSelectedOrder,
            draggingId, setDraggingId,
            soundEnabled, toggleSound, playSound,
            notifications, dismissNotification,
            handleAdvance, handleDrop,
            simulateNewOrder,
        }}>
            {children}
        </OrdersContext.Provider>
    );
}
