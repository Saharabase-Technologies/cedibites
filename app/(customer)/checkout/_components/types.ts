/**
 * What a checkout is made of.
 *
 * Three questions asked one at a time, then one page that puts every answer
 * together with the order and its money, where the customer checks it and pays.
 *
 * It spent a day as a single screen with sheets. The look of that version
 * stayed and the flow did not. On a phone a question with nothing else around
 * it is easier to answer, and the items and the total only matter at the moment
 * somebody agrees to them, so the review is the only place they appear.
 *
 * Beyond the review there are only the wait for Hubtel and the receipt. Those
 * are states rather than places, which is why neither has a back arrow.
 */

export type OrderType = 'delivery' | 'pickup';
export type PaymentMethod = 'mobile_money' | 'cash';
export type Phase = 'form' | 'paying' | 'placed';

/**
 * Where the customer is in the form.
 *
 * Delivery or pickup travels with "where", because choosing pickup changes what
 * "where" means, and asking them apart would let the second answer contradict
 * the first.
 */
export type Step = 'where' | 'who' | 'pay' | 'review';
export type Question = Exclude<Step, 'review'>;

export const STEPS: Step[] = ['where', 'who', 'pay', 'review'];
export const QUESTIONS: Question[] = ['where', 'who', 'pay'];

export function stepIndex(step: Step): number {
    return STEPS.indexOf(step);
}

export interface ContactDetails {
    name: string;
    phone: string;
    address: string;
    /** What changes the food: no pepper, an allergy. Asked on every order. */
    kitchenNote: string;
    /** What changes the drop: the gate, the landmark. Delivery only. */
    riderNote: string;
}

/**
 * The two notes as one, the way the ticket will carry them.
 *
 * An order has a single note field and it reaches the kitchen ticket, the
 * Order Manager and the printed slip. Asking two questions and sending one
 * line each, labelled, means whoever reads the slip knows which of them it is
 * for. The kitchen line goes first: an allergy is why this exists, and it is
 * the note that changes what is cooked rather than where it is dropped.
 */
export function composeNote(kitchen: string, rider: string): string | undefined {
    const lines: string[] = [];
    if (kitchen.trim()) lines.push(`Kitchen: ${kitchen.trim()}`);
    if (rider.trim()) lines.push(`Rider: ${rider.trim()}`);
    return lines.length > 0 ? lines.join('\n') : undefined;
}

export interface ServiceChargeConfig {
    enabled: boolean;
    percent: number;
    cap: number;
}

export interface CheckoutConfig {
    serviceCharge: ServiceChargeConfig;
    deliveryFeeEnabled: boolean;
}

/** Delivery fees are temporarily disabled. */
export const DELIVERY_FEE = 0;

/**
 * Off until the server says otherwise.
 *
 * This opened `enabled: true, percent: 1`, so a charge appeared on the payment
 * step before `/checkout-config` had answered, and stayed if the call failed. A
 * client should never invent money owed: if we cannot reach the server to ask,
 * the honest figure is nothing. Whether there is a charge at all is a setting,
 * and settings come from the server. See `calcServiceCharge` for the other
 * half of the rule, which is that cash never carries one.
 */
export const DEFAULT_SC_CONFIG: ServiceChargeConfig = { enabled: false, percent: 0, cap: 0 };
export const DEFAULT_CHECKOUT_CONFIG: CheckoutConfig = {
    serviceCharge: DEFAULT_SC_CONFIG,
    deliveryFeeEnabled: false,
};
