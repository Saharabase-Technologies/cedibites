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

export const DEFAULT_SC_CONFIG: ServiceChargeConfig = { enabled: true, percent: 1, cap: 5 };
export const DEFAULT_CHECKOUT_CONFIG: CheckoutConfig = {
    serviceCharge: DEFAULT_SC_CONFIG,
    deliveryFeeEnabled: false,
};
