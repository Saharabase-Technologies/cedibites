'use client';

import { POSProvider } from '@/app/pos/context';
import POSTerminal from '@/app/pos/terminal/page';
import '@/app/pos/pos-animations.css';

/**
 * Order entry inside the staff portal — the same screen the tills run.
 *
 * This used to be a four-step wizard: pick a source, pick a branch, find the
 * customer, then the menu, then review. Taking an order over the phone is not a
 * form, it is a conversation, and the person on the other end is reading out
 * dishes while you page through steps. The till has always had the right shape
 * for that — the whole menu on one side, the cart building on the other — and
 * the call centre was the only part of the business not using it.
 *
 * Mounted rather than reimplemented. There is one order screen in this codebase
 * and it lives at app/pos/terminal; a second copy would be a second place for
 * every future change to a price, a payment method or the stock gate to land,
 * and one of the two would quietly fall behind.
 *
 * What differs is driven by the operator's role, not by the route: someone who
 * works across the whole company picks the branch for each order and says which
 * channel it came in on, while a cashier's branch is their shift and their
 * channel is always the till. See POSProvider's `isCompanyWide`.
 */
export default function SalesNewOrderPage() {
    return (
        <POSProvider>
            <POSTerminal embedded />
        </POSProvider>
    );
}
