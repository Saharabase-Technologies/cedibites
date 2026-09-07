'use client';

import { useOrderByNumber } from '@/lib/api/hooks/useOrders';
import { clearLastOrder, readLastOrder } from '@/lib/orders/lastOrder';
import { ArrowRightIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * The order you are waiting on, on the first screen you see.
 *
 * A customer with food coming does not open the app to browse. They open it to
 * find out where the food is, and until now that meant remembering a code and
 * finding the tracking box. This puts it beside the greeting.
 *
 * It reads the order this phone last placed rather than an account, because
 * most orders are placed by people who never sign in, and the phone that placed
 * it is the phone they are holding.
 *
 * `useOrderByNumber` brings the Reverb subscription with it, so the status here
 * changes as the kitchen moves the ticket. No polling of its own.
 */

/** Finished is finished. Nothing below stays on the home screen. */
const DONE = ['completed', 'delivered', 'cancelled'];

const LABEL: Record<string, string> = {
    received: 'Received',
    accepted: 'Accepted',
    preparing: 'Being cooked',
    ready: 'Ready',
    ready_for_pickup: 'Ready to collect',
    out_for_delivery: 'On the way',
    cancel_requested: 'Cancelling',
};

export default function ActiveOrderChip() {
    // Read after mount: localStorage during render makes the server pass and
    // the first client pass disagree.
    const [number, setNumber] = useState<string | null>(null);
    useEffect(() => { setNumber(readLastOrder()?.number ?? null); }, []);

    const { order } = useOrderByNumber(number ?? '');

    // Delivered, collected or cancelled. Take it off the screen and stop asking
    // about it on every visit.
    useEffect(() => {
        if (order && DONE.includes(order.status)) clearLastOrder();
    }, [order]);

    if (!number || !order || DONE.includes(order.status)) return null;

    return (
        <Link
            href={`/orders/${order.order_number}`}
            className="group inline-flex shrink-0 items-center gap-2 rounded-lg bg-surface-sunken py-1.5 pl-2.5 pr-2 transition-colors duration-150 ease-out hover:bg-hairline"
        >
            <span className="font-brand text-sm uppercase leading-none tracking-[0.04em] text-fg">
                {order.order_number}
            </span>
            <span aria-hidden className="h-3 w-px bg-hairline-strong" />
            <span className="text-[13px] font-semibold leading-none text-fg-muted">
                {LABEL[order.status] ?? order.status}
            </span>
            <ArrowRightIcon
                size={13}
                weight="bold"
                className="text-fg-subtle transition-colors duration-150 ease-out group-hover:text-fg"
            />
        </Link>
    );
}
