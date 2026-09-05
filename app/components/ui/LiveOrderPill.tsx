'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { CaretRightIcon } from '@phosphor-icons/react';
import { useAuth } from '../providers/AuthProvider';
import { useOrders } from '@/lib/api/hooks/useOrders';
import type { OrderStatus } from '@/types/api';

/**
 * Statuses where the kitchen, the rider or the till still has the order. Once
 * it is delivered, completed or cancelled it belongs in history, not on the
 * home screen.
 */
const IN_FLIGHT: Partial<Record<OrderStatus, string>> = {
    pending: 'Placing',
    confirmed: 'Confirmed',
    received: 'Received',
    preparing: 'Preparing',
    ready: 'Ready',
    ready_for_pickup: 'Ready to collect',
    out_for_delivery: 'On the way',
};

/**
 * The one thing that earns the space beside the greeting.
 *
 * It is not a permanent slot. With nothing cooking it renders nothing at all,
 * and the quiet asymmetry of the greeting sitting alone is the intended state.
 * When something is cooking it is the most valuable thing on the screen, so it
 * gets the first line rather than a card halfway down.
 */
export default function LiveOrderPill() {
    const { isLoggedIn } = useAuth();
    const { orders } = useOrders({ per_page: 8 });

    const live = useMemo(
        () => orders.find(o => IN_FLIGHT[o.status] !== undefined) ?? null,
        [orders],
    );

    if (!isLoggedIn || !live) return null;

    return (
        <Link
            href={`/orders/${live.order_number}`}
            className="flex h-11 shrink-0 items-center gap-2 rounded-lg border border-hairline bg-surface pl-3 pr-2 transition-colors duration-150 ease-out hover:border-hairline-strong"
        >
            {/* Static, not pulsing. The label already says it is happening. */}
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-xs bg-primary" />
            <span className="text-xs font-bold text-fg">{IN_FLIGHT[live.status]}</span>
            <span className="hidden text-xs text-fg-muted tabular-nums sm:inline">
                {live.order_number}
            </span>
            <CaretRightIcon size={12} weight="bold" className="shrink-0 text-fg-muted" />
        </Link>
    );
}
