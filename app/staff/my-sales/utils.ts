import type { Order } from '@/types/order';
export { formatGHS} from '@/lib/utils/currency';

export function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(d: Date) {
    return d.toLocaleDateString('en-GH', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export function itemCount(order: Order) {
    return order.items.reduce((s, i) => s + i.quantity, 0);
}
