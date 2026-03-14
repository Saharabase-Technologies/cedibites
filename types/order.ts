// ─── CediBites Unified Order Types ───────────────────────────────────────────
// Single source of truth for ALL order-related types across every module:
// Customer, Staff (Sales/Manager), POS, Kitchen, Admin

// ─── Enums ───────────────────────────────────────────────────────────────────

export type OrderStatus =
    | 'received'
    | 'accepted'            // kitchen acknowledged
    | 'preparing'
    | 'ready'
    | 'out_for_delivery'
    | 'ready_for_pickup'
    | 'delivered'
    | 'completed'
    | 'cancel_requested'    // call_center requested; awaiting manager approval
    | 'cancelled';

export type OrderSource = 'online' | 'phone' | 'whatsapp' | 'social_media' | 'pos';

export type FulfillmentType = 'delivery' | 'pickup' | 'dine_in' | 'takeaway';

export type PaymentMethod = 'momo' | 'cash' | 'card' | 'no_charge';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

// ─── Sub-types ───────────────────────────────────────────────────────────────

export interface OrderItem {
    id: string;                 // line-item ID (unique within order)
    menuItemId: string;         // references SampleMenu item.id
    name: string;
    quantity: number;
    unitPrice: number;
    image?: string;
    icon?: string;
    sizeLabel?: string;         // display label: "Large", "350ml"
    variantKey?: string;        // lookup key: "plain", "large", "fried-rice"
    notes?: string;             // per-item kitchen notes
    category?: string;          // menu category for grouping
}

export interface OrderContact {
    name: string;
    phone: string;
    email?: string;
    address?: string;           // delivery address
    gpsCoords?: string;         // Ghana Post GPS code
    notes?: string;             // customer delivery notes
}

export interface OrderBranch {
    id: string;
    name: string;
    address: string;
    phone: string;
    coordinates: { latitude: number; longitude: number };
}

export interface OrderCoords {
    branch: { latitude: number; longitude: number };
    customer?: { latitude: number; longitude: number };
    rider?: { latitude: number; longitude: number };
}

export interface OrderTimelineEvent {
    status: OrderStatus;
    label: string;
    description: string;
    timestamp: number | null;
    done: boolean;
    active: boolean;
}

// ─── The Unified Order ───────────────────────────────────────────────────────

export interface Order {
    // Identity
    id: string;
    orderNumber: string;

    // Workflow
    status: OrderStatus;
    source: OrderSource;
    fulfillmentType: FulfillmentType;

    // Payment
    paymentMethod: PaymentMethod;
    isPaid: boolean;
    paymentStatus: PaymentStatus;

    // Items & pricing
    items: OrderItem[];
    subtotal: number;
    deliveryFee: number;
    discount: number;
    promoCode?: string;
    tax: number;
    total: number;

    // People
    contact: OrderContact;
    branch: OrderBranch;
    staffId?: string;               // who created/owns this order
    staffName?: string;

    // Timestamps (all Unix ms)
    placedAt: number;
    acceptedAt?: number;            // kitchen accepted
    startedAt?: number;             // kitchen started preparing
    readyAt?: number;               // kitchen marked ready
    completedAt?: number;           // order completed/delivered
    estimatedMinutes?: number;

    // Tracking
    kitchenConfirmed?: boolean;
    coords?: OrderCoords;

    // Notes & metadata
    allergyFlags?: string[];
    staffNotes?: string;

    // Cancel request workflow
    cancelRequestedBy?: string;      // staffId of who requested cancellation
    cancelRequestedAt?: number;      // timestamp of the request
    cancelRequestReason?: string;    // reason given by call_center
    cancelPreviousStatus?: OrderStatus; // for rejection — restore to this status

    // Customer-facing timeline (computed on read, not stored)
    timeline?: OrderTimelineEvent[];
}

// ─── Notification (used by kanban + kitchen) ─────────────────────────────────

export interface OrderNotification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'kitchen';
    title: string;
    message: string;
    orderId?: string;
    createdAt: number;
}

// ─── Kanban column config ────────────────────────────────────────────────────

export interface KanbanColumn {
    id: string;
    label: string;
    statuses: OrderStatus[];
    dot: string;
    nextStatus: OrderStatus | null;
    nextLabel: string | null;
    color: string;
}

// ─── User roles for permissions ──────────────────────────────────────────────

export type StaffRole = 'super_admin' | 'branch_partner' | 'manager' | 'call_center' | 'kitchen' | 'rider';
export type UserRole = 'call_center' | 'manager' | 'super_admin' | 'branch_partner';

// ─── Filter type (for service layer) ─────────────────────────────────────────

export interface OrderFilter {
    branchId?: string;
    branchName?: string;
    staffId?: string;
    status?: OrderStatus[];
    fulfillmentType?: FulfillmentType[];
    source?: OrderSource[];
    contactPhone?: string;
    dateFrom?: number;
    dateTo?: number;
    search?: string;
}

// ─── Create order input ──────────────────────────────────────────────────────

export interface CreateOrderInput {
    source: OrderSource;
    fulfillmentType: FulfillmentType;
    paymentMethod: PaymentMethod;
    items: Omit<OrderItem, 'id'>[];
    contact: OrderContact;
    branchId: string;
    branchName: string;
    branchAddress?: string;
    branchPhone?: string;
    branchCoordinates?: { latitude: number; longitude: number };
    staffId?: string;
    staffName?: string;
    notes?: string;
    allergyFlags?: string[];
    discount?: number;
    promoCode?: string;
    deliveryFee?: number;
    tax?: number;
}

// ─── Terminal statuses ───────────────────────────────────────────────────────

export const TERMINAL_STATUSES: readonly OrderStatus[] = ['delivered', 'completed', 'cancelled'] as const;

export function isDoneStatus(status: OrderStatus): boolean {
    return TERMINAL_STATUSES.includes(status);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const formatPrice = (p: number) => `₵${p.toFixed(2)}`;

export function timeAgo(ts: number): string {
    const d = Date.now() - ts;
    const m = Math.floor(d / 60_000);
    const h = Math.floor(m / 60);
    const dy = Math.floor(h / 24);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (dy === 1) return 'Yesterday';
    return `${dy}d ago`;
}

export function timeAgoWithUrgency(ts: number): { label: string; urgent: boolean } {
    const d = Date.now() - ts;
    const m = Math.floor(d / 60_000);
    const h = Math.floor(m / 60);
    const dy = Math.floor(h / 24);
    let label: string;
    if (m < 1) label = 'Just now';
    else if (m < 60) label = `${m} min${m > 1 ? 's' : ''} ago`;
    else if (h < 24) label = `${h} hour${h > 1 ? 's' : ''} ago`;
    else if (dy === 1) label = 'Yesterday';
    else label = `${dy}d ago`;
    return { label, urgent: m > 30 };
}

export function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ─── Maps ────────────────────────────────────────────────────────────────────

export function staticMapUrl(lat: number, lng: number, zoom = 15, size = '600x280'): string {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return '';
    const marker = `color:0xe49925|${lat},${lng}`;
    return [
        `https://maps.googleapis.com/maps/api/staticmap`,
        `?center=${lat},${lng}&zoom=${zoom}&size=${size}&scale=2`,
        `&maptype=roadmap`,
        `&markers=${encodeURIComponent(marker)}`,
        `&style=feature:poi|visibility:off`,
        `&style=feature:transit|visibility:off`,
        `&style=feature:road|element:labels.icon|visibility:off`,
        `&key=${key}`,
    ].join('');
}

export function directionsUrl(lat: number, lng: number, _name: string): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

// ─── Timeline builders ──────────────────────────────────────────────────────

function buildTimeline(
    steps: { status: OrderStatus; label: string; description: string; offsetMins: number }[],
    current: OrderStatus,
    placedAt: number,
): OrderTimelineEvent[] {
    const idx = steps.findIndex(s => s.status === current);
    return steps.map((s, i) => ({
        status: s.status,
        label: s.label,
        description: s.description,
        timestamp: i <= idx ? placedAt + s.offsetMins * 60_000 : null,
        done: i < idx,
        active: i === idx,
    }));
}

export function buildDeliveryTimeline(status: OrderStatus, placedAt: number) {
    return buildTimeline([
        { status: 'received', label: 'Order received', description: 'Confirming your order', offsetMins: 0 },
        { status: 'preparing', label: 'Preparing', description: 'Kitchen is cooking your food', offsetMins: 2 },
        { status: 'out_for_delivery', label: 'Out for delivery', description: 'Rider is heading to you', offsetMins: 20 },
        { status: 'delivered', label: 'Delivered', description: 'Enjoy your meal', offsetMins: 35 },
    ], status, placedAt);
}

export function buildPickupTimeline(status: OrderStatus, placedAt: number) {
    return buildTimeline([
        { status: 'received', label: 'Order received', description: 'Confirming your order', offsetMins: 0 },
        { status: 'preparing', label: 'Preparing', description: 'Kitchen is cooking your food', offsetMins: 2 },
        { status: 'ready_for_pickup', label: 'Ready for pickup', description: 'Come collect at the branch', offsetMins: 15 },
        { status: 'completed', label: 'Completed', description: 'Thanks for choosing CediBites', offsetMins: 20 },
    ], status, placedAt);
}

export function buildDineInTimeline(status: OrderStatus, placedAt: number) {
    return buildTimeline([
        { status: 'received', label: 'Order received', description: 'Your order is in', offsetMins: 0 },
        { status: 'preparing', label: 'Preparing', description: 'Kitchen is cooking your food', offsetMins: 2 },
        { status: 'ready', label: 'Ready', description: 'Your food is ready', offsetMins: 15 },
        { status: 'completed', label: 'Completed', description: 'Enjoy your meal!', offsetMins: 20 },
    ], status, placedAt);
}

export function buildOrderTimeline(order: Pick<Order, 'fulfillmentType' | 'status' | 'placedAt'>): OrderTimelineEvent[] {
    switch (order.fulfillmentType) {
        case 'delivery':
            return buildDeliveryTimeline(order.status, order.placedAt);
        case 'pickup':
            return buildPickupTimeline(order.status, order.placedAt);
        case 'dine_in':
        case 'takeaway':
            return buildDineInTimeline(order.status, order.placedAt);
    }
}

// ─── Order ID generation ─────────────────────────────────────────────────────
// Format: letter + 3 digits (A001–Z999), resets daily.
// Cycles A→Z then wraps; each branch can handle 25,974 orders/day.

const DAILY_COUNTER_KEY = 'cedibites-order-counter';

export function generateOrderId(): string {
    if (typeof window === 'undefined') {
        // SSR fallback — should never be called server-side
        return `A${Date.now().toString().slice(-3).padStart(3, '0')}`;
    }
    const today = new Date().toDateString();
    let stored: { date: string; count: number } = { date: '', count: 0 };
    try {
        stored = JSON.parse(localStorage.getItem(DAILY_COUNTER_KEY) ?? '{"date":"","count":0}');
    } catch { /* ignore */ }
    const count = stored.date === today ? stored.count + 1 : 1;
    localStorage.setItem(DAILY_COUNTER_KEY, JSON.stringify({ date: today, count }));
    const letter = String.fromCharCode(65 + Math.floor((count - 1) / 999) % 26);
    const num = ((count - 1) % 999 + 1).toString().padStart(3, '0');
    return `${letter}${num}`;
}

// ─── Haversine distance (km) ─────────────────────────────────────────────────

export function haversineKm(
    a: { latitude: number; longitude: number },
    b: { latitude: number; longitude: number },
): number {
    const R = 6371;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
    const sin2 = Math.sin(dLat / 2) ** 2
        + Math.cos((a.latitude * Math.PI) / 180)
        * Math.cos((b.latitude * Math.PI) / 180)
        * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(sin2), Math.sqrt(1 - sin2));
}

// ─── Helper: get payment label with fulfillment context ──────────────────────

export function getPaymentLabel(method: PaymentMethod, fulfillment?: FulfillmentType): string {
    if (method === 'momo') return 'Mobile Money';
    if (method === 'card') return 'Card';
    if (method === 'cash') {
        if (fulfillment === 'delivery') return 'Cash on Delivery';
        if (fulfillment === 'pickup') return 'Cash at Pickup';
        return 'Cash';
    }
    return method;
}

// ─── Helper: get next possible statuses for an order ─────────────────────────

export function getNextStatuses(order: Pick<Order, 'status' | 'fulfillmentType'>): OrderStatus[] {
    const { status, fulfillmentType } = order;
    const next: OrderStatus[] = [];

    switch (status) {
        case 'received':
            next.push('accepted');
            break;
        case 'accepted':
            next.push('preparing');
            break;
        case 'preparing':
            next.push('ready');
            break;
        case 'ready':
            if (fulfillmentType === 'delivery') next.push('out_for_delivery');
            else if (fulfillmentType === 'pickup') next.push('ready_for_pickup');
            else next.push('completed'); // dine_in / takeaway
            break;
        case 'out_for_delivery':
            next.push('delivered');
            break;
        case 'ready_for_pickup':
            next.push('completed');
            break;
        case 'delivered':
            next.push('completed');
            break;
        case 'cancel_requested':
            next.push('cancelled'); // manager approval
            break;
        default:
            break;
    }

    // Any non-terminal status can be cancelled (managers can direct-cancel)
    if (!isDoneStatus(status)) {
        next.push('cancelled');
    }

    return next;
}

// ─── Permission check ────────────────────────────────────────────────────────

export function canAdvanceOrder(
    role: UserRole,
    order: Pick<Order, 'status' | 'fulfillmentType'>,
    targetStatus: OrderStatus,
): boolean {
    const allowed = getNextStatuses(order);
    if (!allowed.includes(targetStatus)) return false;

    // Full control: managers and super admins
    if (role === 'manager' || role === 'super_admin') return true;

    // Call center: read-only observers — cannot advance any order
    if (role === 'call_center') return false;

    // Branch partners: read-only, no order advancement
    return false;
}
