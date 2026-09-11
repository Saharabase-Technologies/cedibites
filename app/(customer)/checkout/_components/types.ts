/**
 * What a checkout is made of.
 *
 * One screen that shows the whole order: where it goes, who it is for, how it
 * is paid for, and what it costs. Each of the first three is a row you tap to
 * change in a sheet. Beyond that there are only the wait for Hubtel and the
 * receipt, and those are states rather than places, which is why neither of
 * them has a back arrow.
 */

export type OrderType = 'delivery' | 'pickup';
export type PaymentMethod = 'mobile_money' | 'cash';
export type Phase = 'form' | 'paying' | 'placed';

/**
 * The three things a customer opens to change.
 *
 * These used to be three steps walked in order, with each answer folding into a
 * line above the next question. By the payment step the answers had pushed the
 * question 40% down the screen and the number box sat under the pay bar. A
 * returning customer already has all three answered, so the screen shows them
 * and a sheet opens only for the one being changed.
 */
export type SheetName = 'where' | 'who' | 'pay';

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
