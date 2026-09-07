import type { ServiceChargeConfig } from './types';

/**
 * The service charge, as a percentage of the subtotal with a ceiling.
 *
 * Rounded to the cedi before the cap is applied, so the cap is compared against
 * what a customer will actually be charged rather than against a fraction of a
 * pesewa they will never see.
 */
export function calcServiceCharge(subtotal: number, cfg: ServiceChargeConfig): number {
    if (!cfg.enabled || cfg.percent <= 0) return 0;

    const raw = Math.round(subtotal * (cfg.percent / 100) * 100) / 100;
    return cfg.cap > 0 && raw > cfg.cap ? cfg.cap : raw;
}

export const formatPrice = (p: number) => `₵${p.toFixed(2)}`;
