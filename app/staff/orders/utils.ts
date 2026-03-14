// Re-export from unified sources
export { formatGHS } from '@/lib/utils/currency';
export { isDoneStatus, haversineKm, canAdvanceOrder } from '@/types/order';
import type { Order, OrderStatus } from '@/types/order';

// ─── Time display ─────────────────────────────────────────────────────────────

export function timeAgo(placedAt: number): { label: string; urgent: boolean } {
    const mins = Math.floor((Date.now() - placedAt) / 60000);
    if (mins < 1) return { label: 'Just now', urgent: false };
    if (mins < 60) return { label: `${mins}m ago`, urgent: mins > 20 };
    const hrs = Math.floor(mins / 60);
    return { label: `${hrs}h ago`, urgent: false };
}

// ─── Next-status map (with labels for UI) ────────────────────────────────────

export function getNextStatuses(order: Order): { status: OrderStatus; label: string }[] {
    if (order.status === 'ready') {
        return order.fulfillmentType === 'delivery'
            ? [{ status: 'out_for_delivery', label: 'Out for Delivery' }]
            : [{ status: 'ready_for_pickup', label: 'Ready for Pickup' }];
    }
    if (order.status === 'out_for_delivery') return [{ status: 'delivered', label: 'Mark Delivered' }];
    if (order.status === 'ready_for_pickup') return [{ status: 'completed', label: 'Mark Completed' }];
    return [];
}

// ─── Terminal status check ────────────────────────────────────────────────────

export const TERMINAL_STATUSES: OrderStatus[] = ['delivered', 'completed', 'cancelled'];
