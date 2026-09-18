/**
 * The order this phone most recently placed.
 *
 * Kept so the home screen can say "A141, being cooked" beside the greeting
 * without anybody signing in. A guest has no order list and never will, but the
 * phone that placed the order is the phone the customer is holding, and that is
 * enough to put the thing they care about on the first screen they see.
 *
 * The token goes with it. It is the secret half of the tracking link, so a tap
 * from here opens the order with the address showing, exactly as the link we
 * texted would.
 *
 * Cleared once the order is finished. A delivered order is history, and history
 * belongs on the orders page rather than at the top of the home screen.
 */

const KEY = 'cedibites_last_order';

export interface LastOrder {
    number: string;
    token?: string;
    /** Epoch millis, so a forgotten order can age out on its own. */
    placedAt: number;
}

/** Past this, stop showing it whatever the server says. */
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export function readLastOrder(): LastOrder | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as Partial<LastOrder>;
        if (typeof parsed.number !== 'string' || !parsed.number) return null;

        const placedAt = typeof parsed.placedAt === 'number' ? parsed.placedAt : 0;
        // A day-old order nobody closed out. Let it go rather than asking the
        // API about it on every visit forever.
        if (placedAt && Date.now() - placedAt > MAX_AGE_MS) {
            clearLastOrder();
            return null;
        }

        return {
            number: parsed.number,
            token: typeof parsed.token === 'string' ? parsed.token : undefined,
            placedAt,
        };
    } catch {
        return null;
    }
}

export function writeLastOrder(order: { number: string; token?: string }): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(KEY, JSON.stringify({ ...order, placedAt: Date.now() }));
    } catch {
        /* Private window. The home screen simply will not mention it. */
    }
}

export function clearLastOrder(): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(KEY);
    } catch { /* nothing to do */ }
}
