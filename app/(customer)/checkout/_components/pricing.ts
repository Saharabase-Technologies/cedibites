import type { OrderType, PaymentMethod, ServiceChargeConfig } from './types';
import { DELIVERY_FEE } from './types';

/**
 * The service charge, as a percentage of the subtotal with a ceiling.
 *
 * **Paying electronically is what carries it.** It covers what the gateway takes
 * off a mobile money collection, so cash owes nothing: there is no gateway in a
 * cash order, and charging one would be a fee for a service nobody performed.
 * Somebody who switches from momo to cash on the payment step watches it come
 * off the total, which is the honest thing for it to do.
 *
 * Rounded to the pesewa before the cap is applied, so the cap is compared
 * against what a customer will actually be charged rather than against a
 * fraction they will never see.
 */
export function calcServiceCharge(
    subtotal: number,
    cfg: ServiceChargeConfig,
    paymentMethod: PaymentMethod,
): number {
    if (paymentMethod === 'cash') return 0;
    if (!cfg.enabled || cfg.percent <= 0) return 0;

    const raw = Math.round(subtotal * (cfg.percent / 100) * 100) / 100;
    return cfg.cap > 0 && raw > cfg.cap ? cfg.cap : raw;
}

export const formatPrice = (p: number) => `₵${p.toFixed(2)}`;

export interface Totals {
    subtotal: number;
    discount: number;
    promoName?: string;
    serviceCharge: number;
    /** Zero unless the branch charges one and this is a delivery. */
    delivery: number;
    /** Everything, including a delivery fee the rider collects separately. */
    total: number;
    /** What leaves the customer's wallet at this moment. */
    dueNow: number;
}

/**
 * Every figure on the screen, worked out once.
 *
 * The old page had three of these. `OrderSummary` subtracted the promo, and
 * `StepPayment` did not, so the panel and the button beside it could show two
 * different totals for the same order. The pay bar and the panel both read this
 * now, which is the only way they can agree.
 *
 * A delivery fee is counted in `total` but not in `dueNow`, because the rider
 * takes it at the door and Hubtel never sees it.
 */
export function computeTotals({ subtotal, orderType, scConfig, deliveryFeeEnabled, branchDeliveryFee, discount, promoName, paymentMethod }: {
    subtotal: number;
    orderType: OrderType;
    scConfig: ServiceChargeConfig;
    deliveryFeeEnabled: boolean;
    branchDeliveryFee?: number;
    discount?: number;
    promoName?: string;
    paymentMethod: PaymentMethod;
}): Totals {
    const delivery = deliveryFeeEnabled && orderType === 'delivery'
        ? (branchDeliveryFee ?? DELIVERY_FEE)
        : 0;

    const cappedDiscount = Math.min(Math.max(discount ?? 0, 0), subtotal);
    const serviceCharge = calcServiceCharge(subtotal, scConfig, paymentMethod);
    const total = subtotal - cappedDiscount + serviceCharge + delivery;

    return {
        subtotal,
        discount: cappedDiscount,
        promoName,
        serviceCharge,
        delivery,
        total,
        dueNow: paymentMethod === 'mobile_money' ? total - delivery : total,
    };
}
