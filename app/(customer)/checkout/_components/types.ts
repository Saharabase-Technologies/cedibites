/**
 * What a checkout is made of.
 *
 * There are no steps any more. Choosing delivery, saying where it goes, saying
 * who it is for and picking how to pay all happen on one screen, so the only
 * thing left to name is which of the three screens you are on: the form, the
 * wait for Hubtel, or the receipt. The wait and the receipt are states, not
 * steps, which is why neither of them has a back arrow.
 */

export type OrderType = 'delivery' | 'pickup';
export type PaymentMethod = 'mobile_money' | 'cash';
export type Phase = 'form' | 'paying' | 'placed';

/**
 * The form asks one thing at a time.
 *
 * Where it goes carries the delivery or pickup choice with it, because picking
 * pickup changes what "where" even means. The two cannot be asked separately
 * without the second question contradicting the first.
 */
export type Stage = 'where' | 'who' | 'pay';

export const STAGES: Stage[] = ['where', 'who', 'pay'];

export function nextStage(stage: Stage): Stage | null {
    const i = STAGES.indexOf(stage);
    return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null;
}

/** Whether `a` comes before `b`, used to decide what is already answered. */
export function stageIsBefore(a: Stage, b: Stage): boolean {
    return STAGES.indexOf(a) < STAGES.indexOf(b);
}

export interface ContactDetails {
    name: string;
    phone: string;
    address: string;
    note: string;
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
 * This opened `enabled: true`, so a charge appeared on the payment step before
 * `/checkout-config` had answered, and stayed if the call failed. A client
 * should never invent money owed: if we cannot reach the server to ask, the
 * honest figure is nothing. Turning it on is a setting, and settings come from
 * the server.
 */
export const DEFAULT_SC_CONFIG: ServiceChargeConfig = { enabled: false, percent: 0, cap: 0 };
export const DEFAULT_CHECKOUT_CONFIG: CheckoutConfig = {
    serviceCharge: DEFAULT_SC_CONFIG,
    deliveryFeeEnabled: false,
};
