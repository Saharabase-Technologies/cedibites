/**
 * What a checkout is made of.
 *
 * Lifted out of a 1,022-line page.tsx along with everything else in this
 * folder. Eleven components, the pricing rules and these types all shared one
 * file, which is why nobody could change the payment step without reading the
 * address autocomplete.
 */

export type OrderType = 'delivery' | 'pickup';
export type PaymentMethod = 'mobile_money' | 'cash';
export type Step = 1 | 2 | 3 | 4;

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
