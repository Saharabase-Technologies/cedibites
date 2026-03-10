import type { OrderStatus, StaffOrder, UserRole } from './types';
export { formatGHS } from '@/lib/utils/currency';

// ─── Time display ─────────────────────────────────────────────────────────────

export function timeAgo(date: Date): { label: string; urgent: boolean } {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return { label: 'Just now', urgent: false };
    if (mins < 60) return { label: `${mins}m ago`, urgent: mins > 20 };
    const hrs = Math.floor(mins / 60);
    return { label: `${hrs}h ago`, urgent: false };
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

// ─── Role-based permission ────────────────────────────────────────────────────
//
// Kitchen (not in portal yet): received → preparing → ready
// Sales:                        ready → out_for_delivery / ready_for_pickup → delivered / completed
// Manager:                      full access across all transitions

export function canAdvanceOrder(role: UserRole, order: StaffOrder, targetStatus: OrderStatus): boolean {
    const { status } = order;

    if (role === 'manager') return true;

    // Sales only handles post-kitchen stages — cannot touch received/preparing/ready transitions
    return (status === 'ready' && (targetStatus === 'out_for_delivery' || targetStatus === 'ready_for_pickup')) ||
           (status === 'out_for_delivery' && targetStatus === 'delivered') ||
           (status === 'ready_for_pickup' && targetStatus === 'completed');
}

// ─── Geolocation ──────────────────────────────────────────────────────────────

export function haversineKm(
    a: { latitude: number; longitude: number },
    b: { latitude: number; longitude: number },
): number {
    const R = 6371;
    const dLat = (b.latitude  - a.latitude)  * (Math.PI / 180);
    const dLon = (b.longitude - a.longitude) * (Math.PI / 180);
    const x =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(a.latitude * (Math.PI / 180)) *
        Math.cos(b.latitude * (Math.PI / 180)) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// ─── Terminal status check ────────────────────────────────────────────────────

export const TERMINAL_STATUSES: OrderStatus[] = ['delivered', 'completed', 'cancelled'];

export function isDoneStatus(status: OrderStatus): boolean {
    return TERMINAL_STATUSES.includes(status);
}
