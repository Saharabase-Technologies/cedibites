// ─── Types: Staff Orders ──────────────────────────────────────────────────────

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
    quantity: number;
    price: number;
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
