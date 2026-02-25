'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { StaffOrder, OrderStatus, UserRole, OrderNotification } from './types';
import type { DateRange } from './components/DateFilter';
import { MOCK_ORDERS, BRANCH_COORDS } from './constants';
import { canAdvanceOrder } from './utils';
import { useSounds, type SoundName } from './hooks/useSounds';

// ─── Context type ─────────────────────────────────────────────────────────────

interface OrdersContextValue {
    // Data
    orders: StaffOrder[];
    filteredOrders: StaffOrder[];
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
    selectedOrder: StaffOrder | null;
    setSelectedOrder: (o: StaffOrder | null) => void;

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
const DEMO_ITEMS   = [
    [{ name: 'Jollof Rice', quantity: 2, price: 35 }, { name: 'Coke', quantity: 2, price: 10 }],
    [{ name: 'Waakye Special', quantity: 1, price: 30 }],
    [{ name: 'Banku & Tilapia', quantity: 1, price: 55 }, { name: 'Sobolo', quantity: 1, price: 10 }],
    [{ name: 'Fufu & Goat Light Soup', quantity: 2, price: 50 }],
];
// Customer delivery coords paired with each demo branch
const DEMO_CUSTOMER_COORDS = [
    { latitude: 5.6320, longitude: -0.1480 }, // near East Legon
    { latitude: 5.5745, longitude: -0.1690 }, // near Osu (Cantonments)
    { latitude: 5.6525, longitude: -0.0080 }, // near Tema
    { latitude: 5.6750, longitude: -0.1650 }, // near Madina
];

function createTestOrder(): StaffOrder {
    const id   = `CB${Math.floor(100_000 + Math.random() * 900_000)}`;
    const idx  = Math.floor(Math.random() * DEMO_CUSTOMERS.length);
    const type = Math.random() > 0.5 ? 'delivery' : 'pickup';
    const items = DEMO_ITEMS[idx];
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const branchName = DEMO_BRANCHES[idx];
    const branchCoords = BRANCH_COORDS[branchName] ?? { latitude: 5.6465, longitude: -0.1549 };
    return {
        id,
        status:   'received',
        source:   'whatsapp',
        type,
        branch:   branchName,
        customer: DEMO_CUSTOMERS[idx],
        items,
        total,
        payment:  'momo',
        placedAt: new Date(),
        address:  type === 'delivery' ? 'Test Address, Accra' : undefined,
        coords: type === 'delivery' ? {
            branch:   branchCoords,
            customer: DEMO_CUSTOMER_COORDS[idx],
            rider:    { ...branchCoords }, // rider starts at branch
        } : undefined,
    };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function OrdersProvider({ children, role = 'sales' }: { children: React.ReactNode; role?: UserRole }) {
    const [orders, setOrders] = useState<StaffOrder[]>(MOCK_ORDERS);
    const [search, setSearch] = useState('');
    const [branchFilter, setBranchFilter] = useState('All');
    const [dateRange, setDateRange] = useState<DateRange | null>(null);
    const [showCancelled, setShowCancelled] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<StaffOrder | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [notifications, setNotifications] = useState<OrderNotification[]>([]);

    // Refs to avoid stale closures in async callbacks
    const ordersRef = useRef(orders);
    useEffect(() => { ordersRef.current = orders; }, [orders]);

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
        // Auto-dismiss after 5 s
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
        () => ['All', ...Array.from(new Set(orders.map(o => o.branch)))],
        [orders],
    );
    const receivedCount  = useMemo(() => orders.filter(o => o.status === 'received').length, [orders]);
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

    // ── Direct status setter (bypasses role check — used by kitchen simulation) ──
    const setStatusDirect = useCallback((id: string, status: OrderStatus) => {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
        setSelectedOrder(prev => prev?.id === id ? { ...prev, status } : prev);
    }, []);

    // ── Rider simulation ──────────────────────────────────────────────────────
    // Interpolates rider position from branch → customer over ~3 minutes (36 × 5 s steps).
    const startRiderSim = useCallback((id: string) => {
        const order = ordersRef.current.find(o => o.id === id);
        if (!order?.coords) return;

        const { branch, customer } = order.coords;
        const STEPS = 36;
        let step = 0;

        const interval = setInterval(() => {
            step++;
            const t = Math.min(step / STEPS, 1);
            const rider = {
                latitude:  branch.latitude  + (customer.latitude  - branch.latitude)  * t,
                longitude: branch.longitude + (customer.longitude - branch.longitude) * t,
            };

            setOrders(prev => prev.map(o =>
                o.id === id && o.status === 'out_for_delivery' && o.coords
                    ? { ...o, coords: { ...o.coords, rider } }
                    : o,
            ));
            setSelectedOrder(prev =>
                prev?.id === id && prev.status === 'out_for_delivery' && prev.coords
                    ? { ...prev, coords: { ...prev.coords, rider } }
                    : prev,
            );

            const current = ordersRef.current.find(o => o.id === id);
            if (t >= 1 || !current || current.status !== 'out_for_delivery') {
                clearInterval(interval);
            }
        }, 5000);

        simIntervals.current.push(interval);
    }, []);

    // ── Kitchen simulation ────────────────────────────────────────────────────
    // Timeline (from order placement):
    //   +30 s  → Kitchen confirmed receipt (notification only)
    //   +90 s  → Kitchen starts preparing (status: preparing)
    //   +120 s → Kitchen marks ready     (status: ready)
    const scheduleKitchenSim = useCallback((order: StaffOrder) => {
        const { id } = order;
        const customerName = order.customer.name;

        // +30 s: kitchen accepts — flip the confirmed flag + notify
        const t1 = setTimeout(() => {
            setOrders(prev => prev.map(o => o.id === id ? { ...o, kitchenConfirmed: true } : o));
            setSelectedOrder(prev => prev?.id === id ? { ...prev, kitchenConfirmed: true } : prev);
            notify({
                type: 'kitchen',
                title: 'Kitchen Confirmed',
                message: `Order #${id} accepted — kitchen is on it`,
                orderId: id,
            }, 'advance');
        }, 30_000);

        // +90 s: kitchen starts preparing
        const t2 = setTimeout(() => {
            setStatusDirect(id, 'preparing');
            notify({
                type: 'kitchen',
                title: 'Now Preparing',
                message: `Kitchen started preparing #${id} for ${customerName}`,
                orderId: id,
            }, 'advance');
        }, 90_000);

        // +120 s: ready for dispatch
        const t3 = setTimeout(() => {
            setStatusDirect(id, 'ready');
            notify({
                type: 'success',
                title: 'Order Ready!',
                message: `#${id} is ready — dispatch to ${customerName}`,
                orderId: id,
            }, 'complete');
        }, 120_000);

        simTimers.current.push(t1, t2, t3);
    }, [notify, setStatusDirect]);

    // ── Add a simulated test order ────────────────────────────────────────────
    const simulateNewOrder = useCallback(() => {
        const order = createTestOrder();
        setOrders(prev => [order, ...prev]);
        notify({
            type: 'info',
            title: 'New Order Placed',
            message: `#${order.id} · ${order.customer.name} · ${order.type === 'delivery' ? 'Delivery' : 'Pickup'} · GHS ${order.total}`,
            orderId: order.id,
        }, 'newOrder');
        scheduleKitchenSim(order);
    }, [notify, scheduleKitchenSim]);

    // ── handleAdvance ─────────────────────────────────────────────────────────
    const handleAdvance = useCallback((id: string, status: OrderStatus) => {
        const order = ordersRef.current.find(o => o.id === id);
        if (!order || !canAdvanceOrder(role, order, status)) return;

        if (status === 'out_for_delivery' || status === 'ready_for_pickup') {
            // TODO: POST /api/v1/notifications/sms
            notify({
                type: 'info',
                title: 'Customer Notified',
                message: `SMS sent to ${order.customer.name} · ${order.customer.phone}`,
                orderId: id,
            }, 'notification');
            if (status === 'out_for_delivery' && order.type === 'delivery' && order.coords) {
                startRiderSim(id);
            }
        } else if (status === 'delivered' || status === 'completed') {
            notify({
                type: 'success',
                title: status === 'delivered' ? 'Order Delivered' : 'Order Completed',
                message: `#${id} for ${order.customer.name} is closed out`,
                orderId: id,
            }, 'complete');
        } else {
            playSound('advance');
        }

        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
        setSelectedOrder(prev => prev?.id === id ? { ...prev, status } : prev);
        // TODO: PATCH /api/v1/staff/orders/:id/status { status }
    }, [role, notify, playSound, startRiderSim]);

    const handleDrop = useCallback((e: React.DragEvent, targetStatus: OrderStatus) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('orderId');
        if (id) handleAdvance(id, targetStatus);
    }, [handleAdvance]);

    // ── Kick off rider simulation for any orders already en-route at mount ────
    useEffect(() => {
        ordersRef.current
            .filter(o => o.status === 'out_for_delivery' && o.type === 'delivery' && o.coords)
            .forEach(o => startRiderSim(o.id));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <OrdersContext.Provider value={{
            orders, filteredOrders,
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
