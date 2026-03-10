// ─── Types: Staff Orders ──────────────────────────────────────────────────────

export type UserRole = 'sales' | 'manager';

export type OrderStatus =
    | 'received'
    | 'preparing'
    | 'ready'
    | 'out_for_delivery'
    | 'ready_for_pickup'
    | 'delivered'
    | 'completed'
    | 'cancelled';

export type OrderSource = 'online' | 'phone' | 'whatsapp' | 'instagram' | 'facebook' | 'pos';
export type OrderType = 'delivery' | 'pickup';
export type PaymentMethod = 'momo' | 'cash_delivery' | 'cash_pickup';

export interface OrderItem {
    name: string;
    qty: number;
    unitPrice: number;
}

export interface StaffOrder {
    id: string;
    status: OrderStatus;
    source: OrderSource;
    type: OrderType;
    branch: string;
    customer: { name: string; phone: string };
    items: OrderItem[];
    total: number;
    payment: PaymentMethod;
    notes?: string;
    placedAt: Date;
    address?: string;
    kitchenConfirmed?: boolean; // true once kitchen has acknowledged the order
    coords?: {
        branch:   { latitude: number; longitude: number };
        customer: { latitude: number; longitude: number };
        rider?:   { latitude: number; longitude: number }; // live-updated position
    };
}

export interface OrderNotification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'kitchen';
    title: string;
    message: string;
    orderId?: string;
    createdAt: number;
}

export interface KanbanColumn {
    id: string;
    label: string;
    statuses: OrderStatus[];
    dot: string;
    nextStatus: OrderStatus | null; // null = terminal / branching
    nextLabel: string | null;
    color: string; // header accent
}
