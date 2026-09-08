'use client';

import { useOrderByNumber, useOrders } from '@/lib/api/hooks/useOrders';
import { clearLastOrder, readLastOrder, type LastOrder } from '@/lib/orders/lastOrder';
import { ArrowRightIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

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
 * changes as the kitchen moves the ticket. No polling of its own — which is the
 * licence for the pulsing dot. It is a claim that this line is live, and it
 * would be a lie over a cached figure.
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

/**
 * Red is action, yellow is attention, green is confirmation. So the dot carries
 * the family and the label carries the stage: yellow while somebody is working
 * on it, green once the food is made. Splitting Accepted from Being cooked by
 * colour would need a fourth hue the brand does not have, and the words beside
 * it already say which is which.
 */
const TONE: Record<string, string> = {
    received: 'bg-fg-subtle',
    accepted: 'bg-accent',
    preparing: 'bg-accent',
    ready: 'bg-success',
    ready_for_pickup: 'bg-success',
    out_for_delivery: 'bg-success',
    cancel_requested: 'bg-danger',
};

export default function ActiveOrderChip() {
    // Read after mount: localStorage during render makes the server pass and
    // the first client pass disagree.
    const [last, setLast] = useState<LastOrder | null>(null);
    useEffect(() => { setLast(readLastOrder()); }, []);

    const { order: deviceOrder } = useOrderByNumber(last?.number ?? '', last?.token);

    /**
     * The same order, seen from any other phone they are signed in on.
     *
     * `lastOrder` lives in localStorage, which is one browser on one device and
     * nothing else. That is right for a guest — the phone that placed the order
     * is the phone they are holding, and there is no account to hang it on. But
     * it is why somebody who ordered on their phone and then opened the site on
     * a laptop saw no chip at all: the record was never theirs, it was the
     * other browser's.
     *
     * An account is the thing that does cross a device, so a signed-in customer
     * also gets their live order off `/orders`. The query only runs when a
     * token is present, so this costs a guest nothing.
     */
    const { orders } = useOrders({ per_page: 8 });
    const accountOrder = useMemo(
        () => orders.find(o => !DONE.includes(o.status) && LABEL[o.status] !== undefined) ?? null,
        [orders],
    );

    // The device's own record wins when both point somewhere, because it is the
    // one carrying the tracking token and therefore the address.
    const order = deviceOrder && !DONE.includes(deviceOrder.status) ? deviceOrder : accountOrder;

    // Delivered, collected or cancelled. Take it off the screen and stop asking
    // about it on every visit.
    useEffect(() => {
        if (deviceOrder && DONE.includes(deviceOrder.status)) clearLastOrder();
    }, [deviceOrder]);

    if (!order || DONE.includes(order.status)) return null;

    // Only the device that placed it holds the token.
    const token = order === deviceOrder ? last?.token : undefined;
    const tone = TONE[order.status] ?? 'bg-fg-subtle';

    return (
        <Link
            /**
             * The token rides along.
             *
             * It is the secret half of the link we texted, and the tracking page
             * shows the delivery address only to whoever holds it. Tapping
             * through from your own phone used to drop it, so the screen told
             * the person who placed the order that the address was only on the
             * SMS — while they were looking at it on the device that placed it.
             */
            href={token
                ? `/orders/${order.order_number}?t=${encodeURIComponent(token)}`
                : `/orders/${order.order_number}`}
            className="group mt-1 inline-flex shrink-0 items-center gap-2 rounded-lg bg-surface-sunken py-1.5 pl-2.5 pr-2 transition-colors duration-150 ease-out hover:bg-hairline"
        >
            {/* A square, like the Open mark directly below it. Nothing in the
                brand's artwork is a circle, and a round dot beside a square one
                on the same screen reads as two different systems. */}
            <span aria-hidden className="relative grid h-2 w-2 shrink-0 place-items-center">
                <span className={`absolute inline-flex h-full w-full rounded-xs ${tone} animate-live-ring`} />
                <span className={`relative inline-flex h-2 w-2 rounded-xs ${tone}`} />
            </span>
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
