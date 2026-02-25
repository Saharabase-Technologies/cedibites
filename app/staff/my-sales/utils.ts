import type { SalesOrder } from './types';
export { formatGHS } from '@/lib/utils/currency';

export function formatTime(d: Date) {
    return d.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(d: Date) {
    return d.toLocaleDateString('en-GH', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export function itemCount(order: SalesOrder) {
    return order.items.reduce((s, i) => s + i.qty, 0);
}
