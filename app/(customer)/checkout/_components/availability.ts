import type { Branch } from '@/app/components/providers/BranchProvider';
import { isValidGhanaPhone } from '@/app/lib/phone';
import type { ContactDetails, OrderType, PaymentMethod, Stage } from './types';

/**
 * What this branch will actually accept, and whether the order is ready to go.
 *
 * The old page worked all of this out twice. `StepDetails` decided which order
 * types to show and whether Continue was pressable; `StepPayment` decided which
 * payment methods to show and whether Place Order was pressable. Neither knew
 * what the other had settled, and the page that owned the button knew neither.
 *
 * One screen means one button, so it has to be derived in one place.
 */

/** The database calls them momo and cash_on_delivery. The UI never has to. */
const PAYMENT_KEYS: Record<PaymentMethod, string> = {
    mobile_money: 'momo',
    cash: 'cash_on_delivery',
};

const ALL_ORDER_TYPES: OrderType[] = ['delivery', 'pickup'];
const ALL_PAYMENT_METHODS: PaymentMethod[] = ['mobile_money', 'cash'];

/**
 * A setting that has never been written is an allowed one. Only an explicit
 * false turns something off, which is what keeps a branch nobody has configured
 * yet from being unable to take an order at all.
 */
export function enabledOrderTypes(branch: Branch | null): OrderType[] {
    if (!branch) return ALL_ORDER_TYPES;
    return ALL_ORDER_TYPES.filter(t => branch.orderTypes[t]?.is_enabled !== false);
}

export function enabledPaymentMethods(branch: Branch | null): PaymentMethod[] {
    if (!branch) return ALL_PAYMENT_METHODS;
    return ALL_PAYMENT_METHODS.filter(m => branch.paymentMethods[PAYMENT_KEYS[m]]?.is_enabled !== false);
}

/**
 * Why the button at the foot is dead, in the words shown beside it.
 *
 * Asked per stage, because the form only ever shows one question and it would
 * be nonsense to refuse to continue past the address over a phone number
 * nobody has been asked for yet. Returns undefined when this stage is answered.
 */
export function stageBlocker(stage: Stage, { branch, orderType, contact, orderTypes, methods }: {
    branch: Branch | null;
    orderType: OrderType;
    contact: ContactDetails;
    orderTypes: OrderType[];
    methods: PaymentMethod[];
}): string | undefined {
    // A shut branch stops everything, at every stage. There is no point letting
    // somebody fill in three answers for an order that cannot be cooked.
    if (!branch) return 'Choose a branch to order from.';
    if (!branch.isActive) return `${branch.name} is not taking orders.`;
    if (!branch.isOpen) return `${branch.name} is closed.`;
    if (orderTypes.length === 0) return `${branch.name} is not taking orders right now.`;

    if (stage === 'where') {
        if (orderType === 'delivery' && !contact.address.trim()) return 'Add the address it goes to.';
        return undefined;
    }

    if (stage === 'who') {
        if (!contact.name.trim()) return 'Add the name for the order.';
        if (!contact.phone.trim()) return 'Add a phone number.';
        if (!isValidGhanaPhone(contact.phone)) return 'That phone number is not a Ghana number.';
        return undefined;
    }

    if (methods.length === 0) return `${branch.name} has no way to take payment right now.`;
    return undefined;
}
