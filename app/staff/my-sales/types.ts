export type OrderSource = 'online' | 'phone' | 'whatsapp' | 'instagram' | 'facebook' | 'pos';

export type OrderStatus =
    | 'received'
    | 'preparing'
    | 'ready'
    | 'out_for_delivery'
    | 'ready_for_pickup'
    | 'delivered'
    | 'completed'
    | 'cancelled';

export type PaymentMethod = 'momo' | 'cash_delivery' | 'cash_pickup';

export type FulfillmentType = 'delivery' | 'pickup';

export interface OrderItem {
    name: string;
    qty: number;
    unitPrice: number;
}

export interface SalesOrder {
    id: string;
    status: OrderStatus;
    source: OrderSource;
    branch: string;
    fulfillment: FulfillmentType;
    customer: { name: string; phone: string };
    items: OrderItem[];
    subtotal: number;
    discount: number;
    promoCode?: string;
    deliveryFee: number;
    tax: number;
    total: number;
    payment: PaymentMethod;
    deliveryAddress?: string;
    gpsCoords?: string;
    estimatedMinutes?: number;
    customerNotes?: string;
    allergyFlags?: string[];
    staffNotes?: string;
    placedAt: Date;
}
