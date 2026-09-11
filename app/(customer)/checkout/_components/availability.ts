import type { Branch } from '@/app/components/providers/BranchProvider';
import { isValidGhanaPhone } from '@/app/lib/phone';
import { nextOpening } from '@/lib/utils/branchHours';
import { QUESTIONS } from './types';
import type { ContactDetails, OrderType, PaymentMethod, Question, Step } from './types';

/**
 * What this branch will actually accept, and whether the order is ready to go.
 *
 * The old page worked all of this out twice. `StepDetails` decided which order
 * types to show and whether Continue was pressable; `StepPayment` decided which
 * payment methods to show and whether Place Order was pressable. Neither knew
 * what the other had settled, and the page that owned the button knew neither.
 *
 * One button at the foot of every screen means it has to be derived in one
 * place.
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

/** Everything the button needs to know about the order so far. */
export interface CheckoutState {
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
}

/** What stands between the customer and moving on, and what the button does about it. */
export interface Blocker {
    /** Said on the button. */
    action: string;
    /**
     * Said above the button, and only when the label alone would leave
     * somebody asking why. "Choose another branch" needs "Ashaiman opens at
     * 10:00 am". "Add where it goes" needs nothing.
     */
    reason?: string;
    /**
     * Where pressing the button goes. Absent means the button waits, because
     * the answer it is waiting for is already on the screen.
     */
    opens?: Step | 'branch';
}

/**
 * A branch that cannot take the order stops every screen.
 *
 * There is no point letting somebody answer three questions for an order that
 * cannot be cooked, so this is asked on the first question as well as at the
 * review.
 */
function branchBlocker({ branch, orderTypes, methods }: CheckoutState): Blocker | undefined {
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

    if (methods.length === 0) {
        return { action: 'Choose another branch', reason: `${branch.name} has no way to take payment right now.`, opens: 'branch' };
    }

    return undefined;
}

/** What is still missing from one question, in the words the review's button would use. */
function gapIn(question: Question, s: CheckoutState): Blocker | undefined {
    if (question === 'where') {
        return s.orderType === 'delivery' && !s.contact.address.trim()
            ? { action: 'Add where it goes', opens: 'where' }
            : undefined;
    }

    if (question === 'who') {
        if (!s.contact.name.trim()) return { action: 'Add your name', opens: 'who' };
        if (!s.contact.phone.trim()) return { action: 'Add your phone number', opens: 'who' };
        if (!isValidGhanaPhone(s.contact.phone)) return { action: 'Fix your phone number', opens: 'who' };
        return undefined;
    }

    if (s.paymentMethod !== 'mobile_money') return undefined;
    if (!s.momoNumber.trim()) return { action: 'Add the number to charge', opens: 'pay' };
    if (!isValidGhanaPhone(s.momoNumber)) return { action: 'Fix the number to charge', opens: 'pay' };

    // Only when Hubtel has actually said no. Null means the check could not
    // be made, and not being able to check is no reason to stop somebody
    // ordering: the prompt still goes out and either lands or does not.
    if (s.momoRegistered === false) return { action: 'Use another number', opens: 'pay' };

    return undefined;
}

/**
 * Whether one question is answered well enough to move on.
 *
 * The button waits rather than explaining. The field it is waiting for is the
 * only thing on the screen, and that field's own error line says what is wrong.
 */
export function questionBlocker(question: Question, state: CheckoutState): Blocker | undefined {
    return branchBlocker(state) ?? (gapIn(question, state) ? { action: 'Continue' } : undefined);
}

/**
 * The first thing to sort out before paying, in the order the questions were asked.
 *
 * Normally nothing, because every question had to be answered to get here. It
 * still matters for the number Hubtel says has no wallet, which can only be
 * known after they have moved past the payment question.
 */
export function reviewBlocker(state: CheckoutState): Blocker | undefined {
    return branchBlocker(state) ?? QUESTIONS.map(q => gapIn(q, state)).find(Boolean);
}
