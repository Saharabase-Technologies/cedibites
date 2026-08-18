'use client';

import { useHoldsInterruption } from '@/app/components/providers/InterruptionGate';
import { usePOS } from '../context';

/**
 * Holds the interruption gate shut while a sale is in progress.
 *
 * A caution taking over the till with a customer standing there and a part-built
 * cart on screen is worse than the problem it reports — the cashier loses their
 * place and dismisses the message unread out of irritation. Decided with the
 * user: the question comes after a transaction, never during one.
 *
 * "In progress" is a cart with lines in it. Deliberately not "the POS is open" —
 * an idle till showing the menu is exactly when somebody is free to read
 * something, and gating on the route would mean cashiers, who spend the whole
 * shift here, never see a caution at all.
 *
 * Renders nothing. It exists to be mounted inside POSProvider, because the cart
 * it reads lives there.
 */
export function POSInterruptionClaim() {
    const { cartCount } = usePOS();

    useHoldsInterruption('pos-sale-in-progress', cartCount > 0);

    return null;
}
