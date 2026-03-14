// ─── Order Service Interface ─────────────────────────────────────────────────
// The contract all order service implementations must fulfill.
// Swap MockOrderService → ApiOrderService when backend is ready.

import type { Order, OrderFilter, OrderStatus, CreateOrderInput } from '@/types/order';
import { MockOrderService } from './order.service.mock';

export interface OrderService {
    /** Get all orders, optionally filtered */
    getAll(filter?: OrderFilter): Promise<Order[]>;

    /** Get a single order by ID */
    getById(id: string): Promise<Order | null>;

    /** Create a new order */
    create(input: CreateOrderInput): Promise<Order>;

    /** Update order status (the most common mutation) */
    updateStatus(id: string, status: OrderStatus, timestamps?: Partial<Pick<Order, 'acceptedAt' | 'startedAt' | 'readyAt' | 'completedAt'>>): Promise<Order>;

    /** Patch arbitrary order fields */
    update(id: string, patch: Partial<Order>): Promise<Order>;

    /** Subscribe to order changes (cross-tab + in-tab). Returns unsubscribe fn. */
    subscribe(callback: (orders: Order[]) => void): () => void;

    /** Delete an order (admin only) */
    delete(id: string): Promise<void>;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

let _instance: OrderService | null = null;

export function getOrderService(): OrderService {
    if (!_instance) {
        // When backend is ready, swap this line:
        // _instance = new ApiOrderService();
        _instance = new MockOrderService();
    }
    return _instance;
}
