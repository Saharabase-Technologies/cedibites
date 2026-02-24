import type { OrderStatus, StaffOrder } from './types';

// ─── Time display ─────────────────────────────────────────────────────────────

export function timeAgo(date: Date): { label: string; urgent: boolean } {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return { label: 'Just now', urgent: false };
    if (mins < 60) return { label: `${mins}m ago`, urgent: mins > 20 };
    const hrs = Math.floor(mins / 60);
    return { label: `${hrs}h ago`, urgent: false };
}

// ─── Currency ─────────────────────────────────────────────────────────────────

export function formatGHS(n: number): string {
    return `GHS ${n.toFixed(2)}`;
}

// ─── Next-status map ──────────────────────────────────────────────────────────

export function getNextStatuses(order: StaffOrder): { status: OrderStatus; label: string }[] {
    if (order.status === 'ready') {
        return order.type === 'delivery'
            ? [{ status: 'out_for_delivery', label: 'Out for Delivery' }]
            : [{ status: 'ready_for_pickup', label: 'Ready for Pickup' }];
    }
    if (order.status === 'out_for_delivery') return [{ status: 'delivered', label: 'Mark Delivered' }];
    if (order.status === 'ready_for_pickup') return [{ status: 'completed', label: 'Mark Completed' }];
    return [];
}

// ─── Terminal status check ────────────────────────────────────────────────────

export const TERMINAL_STATUSES: OrderStatus[] = ['delivered', 'completed', 'cancelled'];

export function isDoneStatus(status: OrderStatus): boolean {
    return TERMINAL_STATUSES.includes(status);
}

// Alias for backwards compatibility
export const isDone = isDoneStatus;
