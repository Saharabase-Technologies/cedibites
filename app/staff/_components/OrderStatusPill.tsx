'use client';

import type { OrderStatus } from '@/types/order';
import { TONE, type StatusTone } from '@/app/inventory/_components/status-tokens';

// Where the food is, as a TONE pill. Status colour comes from TONE alone.

const STATUS: Record<OrderStatus, { label: string } & StatusTone> = {
    received: { label: 'Received', ...TONE.waiting },
    accepted: { label: 'Received', ...TONE.waiting },
    preparing: { label: 'Preparing', ...TONE.moving },
    ready: { label: 'Ready', ...TONE.decided },
    ready_for_pickup: { label: 'Ready', ...TONE.decided },
    out_for_delivery: { label: 'On the road', ...TONE.decided },
    delivered: { label: 'Delivered', ...TONE.done },
    completed: { label: 'Completed', ...TONE.done },
    cancel_requested: { label: 'Cancel asked', ...TONE.waiting },
    cancelled: { label: 'Cancelled', ...TONE.problem },
};

export function OrderStatusPill({ status }: { status: OrderStatus }) {
    const style = STATUS[status] ?? STATUS.received;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${style.bg} ${style.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} aria-hidden />
            {style.label}
        </span>
    );
}
