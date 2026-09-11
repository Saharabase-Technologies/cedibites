import type { Branch } from '@/app/components/providers/BranchProvider';
import { isValidGhanaPhone } from '@/app/lib/phone';
import { nextOpening } from '@/lib/utils/branchHours';
import type { ContactDetails, OrderType, PaymentMethod, SheetName } from './types';

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

/** A payment method as the screen names it. Cash says where it changes hands. */
export function methodLabel(method: PaymentMethod, orderType: OrderType): string {
    if (method === 'mobile_money') return 'Mobile Money';
    return orderType === 'delivery' ? 'Cash at the door' : 'Cash at the counter';
}

/** What stands between the order and the pay button, and what fixes it. */
export interface Blocker {
    /** Said on the button in place of Pay. What to do, never what went wrong. */
    action: string;
    /**
     * Said above the button, and only when the action alone would leave
     * somebody asking why. "Choose another branch" needs "Ashaiman opens at
     * 10:00 am". "Add where it goes" needs nothing.
     */
    reason?: string;
    /** What pressing the button opens. */
    opens: SheetName | 'branch';
}

/**
 * The next thing to sort out, in the order a person would sort it.
 *
 * The branch first, because nothing else matters for an order that cannot be
 * cooked. Then where, who and how, which is the order the rows sit on screen,
 * so a guest with nothing saved is walked down the page one sheet at a time.
 * Returns undefined when the order can be paid for.
 */
export function checkoutBlocker({ branch, orderType, contact, orderTypes, methods, paymentMethod, momoNumber, momoRegistered }: {
    branch: Branch | null;
    orderType: OrderType;
    contact: ContactDetails;
    orderTypes: OrderType[];
    methods: PaymentMethod[];
    paymentMethod: PaymentMethod;
    /** The number the prompt will go to. */
    momoNumber: string;
    /** False only when Hubtel has said so. Null means it could not be asked. */
    momoRegistered: boolean | null;
}): Blocker | undefined {
    if (!branch) return { action: 'Choose a branch', opens: 'branch' };

    if (!branch.isActive) {
        return { action: 'Choose another branch', reason: `${branch.name} is not taking orders.`, opens: 'branch' };
    }

    if (!branch.isOpen) {
        const when = nextOpening(branch.hours);
        return {
            action: 'Choose another branch',
            reason: when ? `${branch.name} opens ${when}.` : `${branch.name} is closed.`,
            opens: 'branch',
        };
    }

    if (orderTypes.length === 0) {
        return { action: 'Choose another branch', reason: `${branch.name} is not taking orders right now.`, opens: 'branch' };
    }

    if (orderType === 'delivery' && !contact.address.trim()) return { action: 'Add where it goes', opens: 'where' };

    if (!contact.name.trim()) return { action: 'Add your name', opens: 'who' };
    if (!contact.phone.trim()) return { action: 'Add your phone number', opens: 'who' };
    if (!isValidGhanaPhone(contact.phone)) {
        return { action: 'Fix your phone number', reason: 'That phone number is not a Ghana number.', opens: 'who' };
    }

    if (methods.length === 0) {
        return { action: 'Choose another branch', reason: `${branch.name} has no way to take payment right now.`, opens: 'branch' };
    }

    if (paymentMethod === 'mobile_money') {
        if (!momoNumber.trim()) return { action: 'Add the number to charge', opens: 'pay' };
        if (!isValidGhanaPhone(momoNumber)) {
            return { action: 'Fix the number to charge', reason: 'That is not a Ghana mobile money number.', opens: 'pay' };
        }

        // Only when Hubtel has actually said no. Null means the check could not
        // be made, and not being able to check is no reason to stop somebody
        // ordering: the prompt still goes out and either lands or does not.
        // No reason line: the payment row already says it, in red.
        if (momoRegistered === false) return { action: 'Use another number', opens: 'pay' };
    }

    return undefined;
}
