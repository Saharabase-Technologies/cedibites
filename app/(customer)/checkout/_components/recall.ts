/**
 * What this phone already knows about the person holding it.
 *
 * A signed-in customer's name and number come from their account. Everybody
 * else was typing all three fields on every order, including the address they
 * had typed the week before, because nothing on the customer side ever wrote
 * them down. The post-order prompt then offered to save the details it had just
 * made them enter, which is the wrong end of the problem.
 *
 * This is per-device and deliberately small: a name, a number, an address. No
 * note, because a note is about one order. Nothing here is trusted for anything
 * beyond filling a field in, and the customer can always type over it.
 */

const KEY = 'cedibites_checkout_recall';

export interface RecalledDetails {
    name: string;
    phone: string;
    address: string;
}

const EMPTY: RecalledDetails = { name: '', phone: '', address: '' };

export function readRecalled(): RecalledDetails {
    if (typeof window === 'undefined') return EMPTY;
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return EMPTY;
        const parsed = JSON.parse(raw) as Partial<RecalledDetails>;
        return {
            name: typeof parsed.name === 'string' ? parsed.name : '',
            phone: typeof parsed.phone === 'string' ? parsed.phone : '',
            address: typeof parsed.address === 'string' ? parsed.address : '',
        };
    } catch {
        // A private window, or somebody's cleared storage. Type it in again.
        return EMPTY;
    }
}

export function writeRecalled(details: RecalledDetails): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(KEY, JSON.stringify(details));
    } catch {
        /* Not worth telling anybody about. */
    }
}
