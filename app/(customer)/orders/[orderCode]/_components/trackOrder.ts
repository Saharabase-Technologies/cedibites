import type { Order as ApiOrder, OrderStatus } from '@/types/api';

/**
 * Where an order has actually got to, and when it got there.
 *
 * The page this replaces built its timeline out of arithmetic. Every step was
 * `created_at` plus a fixed number of minutes: preparing at two, out for
 * delivery at twenty, delivered at thirty-five, always, whatever had really
 * happened. An order placed at seven and handed over at quarter past eight told
 * the customer it arrived at 7:35.
 *
 * `order_status_history` has carried a `changed_at` for every transition since
 * it was built, and the API has been sending it the whole time. Nothing here
 * invents a time. A stage with no history row shows no time at all, which is
 * honest and is what the branch would tell you if you rang them.
 *
 * The stages mirror the order machine in Order::$transitions rather than a
 * simplified version of it, so what a customer sees matches what the Order
 * Manager shows the kitchen. The old mapping folded `ready` into "out for
 * delivery", which told people the rider had left while the food was still on
 * the counter.
 */

export type StageState = 'done' | 'active' | 'todo';

export interface Stage {
    key: string;
    label: string;
    /** What is happening, shown only while this is the stage it is on. */
    note: string;
    /** Epoch millis, or null when nothing recorded it. Never invented. */
    at: number | null;
    state: StageState;
}

/** Delivery, in the order the kitchen actually moves through. */
const DELIVERY: Array<{ key: string; label: string; note: string; statuses: OrderStatus[] }> = [
    { key: 'received', label: 'Order received', note: 'Waiting for the branch to pick it up', statuses: ['received'] },
    { key: 'accepted', label: 'Accepted', note: 'The branch has your order', statuses: ['accepted'] },
    { key: 'preparing', label: 'Being cooked', note: 'The kitchen is on it', statuses: ['preparing'] },
    { key: 'ready', label: 'Ready', note: 'Packed and waiting for a rider', statuses: ['ready'] },
    { key: 'out_for_delivery', label: 'On the way', note: 'A rider is bringing it to you', statuses: ['out_for_delivery'] },
    { key: 'delivered', label: 'Delivered', note: 'Enjoy it', statuses: ['delivered', 'completed'] },
];

/** Pickup. No rider, and ready means come and get it. */
const PICKUP: Array<{ key: string; label: string; note: string; statuses: OrderStatus[] }> = [
    { key: 'received', label: 'Order received', note: 'Waiting for the branch to pick it up', statuses: ['received'] },
    { key: 'accepted', label: 'Accepted', note: 'The branch has your order', statuses: ['accepted'] },
    { key: 'preparing', label: 'Being cooked', note: 'The kitchen is on it', statuses: ['preparing'] },
    { key: 'ready_for_pickup', label: 'Ready to collect', note: 'Come for it at the counter', statuses: ['ready', 'ready_for_pickup'] },
    { key: 'completed', label: 'Collected', note: 'Enjoy it', statuses: ['completed'] },
];

const time = (iso?: string | null): number | null => {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    return Number.isFinite(t) ? t : null;
};

/**
 * When the order first reached each status.
 *
 * First, not last. An order that goes to cancel_requested and is put back to
 * preparing has two preparing rows, and the honest answer to "when did they
 * start cooking" is the first one.
 */
function firstSeen(order: ApiOrder): Map<string, number> {
    const seen = new Map<string, number>();

    for (const row of order.status_history ?? []) {
        const at = time(row.changed_at) ?? time(row.created_at);
        if (at === null) continue;

        const existing = seen.get(row.status);
        if (existing === undefined || at < existing) seen.set(row.status, at);
    }

    // Nothing records the moment an order was placed as a transition, so the
    // one time we can take from the order itself is the one it is named after.
    const placed = time(order.created_at);
    if (placed !== null && !seen.has('received')) seen.set('received', placed);

    return seen;
}

export interface TrackedOrder {
    stages: Stage[];
    /** Set when the order is cancelled. The stage list stops meaning anything. */
    cancelled: boolean;
    cancelledAt: number | null;
    /** The stage it is sitting on, for the headline. Null once it is finished. */
    current: Stage | null;
    done: boolean;
}

export function trackOrder(order: ApiOrder): TrackedOrder {
    const steps = order.order_type === 'delivery' ? DELIVERY : PICKUP;
    const seen = firstSeen(order);
    const status = order.status;

    const cancelled = status === 'cancelled';
    const cancelledAt = cancelled
        ? seen.get('cancelled') ?? time(order.stage_changed_at) ?? null
        : null;

    /**
     * A cancel request does not move the order backwards. The kitchen may still
     * be cooking while a manager decides, so the timeline keeps showing where
     * the food actually is and the request is reported separately.
     */
    const effective = status === 'cancel_requested'
        ? (order.status_history ?? [])
            .map(h => h.status)
            .filter(s => s !== 'cancel_requested')
            .pop() ?? 'received'
        : status;

    let currentIndex = steps.findIndex(s => s.statuses.includes(effective as OrderStatus));

    // A status the customer's stage list does not name, such as an order that
    // went straight to completed. Treat it as finished rather than as unstarted,
    // which is what a -1 would otherwise render.
    if (currentIndex === -1) {
        currentIndex = effective === 'completed' || effective === 'delivered' ? steps.length - 1 : 0;
    }

    const stages: Stage[] = steps.map((step, i) => {
        const at = step.statuses.reduce<number | null>((found, s) => {
            const t = seen.get(s);
            if (t === undefined) return found;
            return found === null ? t : Math.min(found, t);
        }, null);

        return {
            key: step.key,
            label: step.label,
            note: step.note,
            // A stage it has not reached has no time, and a stage it has reached
            // has one only if something wrote it down.
            at: i <= currentIndex ? at : null,
            state: i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'todo',
        };
    });

    const done = currentIndex === steps.length - 1;

    return {
        stages,
        cancelled,
        cancelledAt,
        current: cancelled ? null : stages[currentIndex] ?? null,
        done,
    };
}

/**
 * How long it should take, from here.
 *
 * One figure, deliberately loose. The kitchen never agreed to twenty-five
 * minutes and a customer told twenty-five who waits fifty rings the branch. An
 * hour is what the branches actually run at on a busy evening.
 */
export function expectedWait(order: ApiOrder): string | null {
    if (['completed', 'delivered', 'cancelled'].includes(order.status)) return null;
    return order.order_type === 'delivery' ? 'about an hour' : 'about 20 minutes';
}
