import apiClient from '../client';

/**
 * The menu's Bolt page: Bolt's price and promo on each dish, and what Bolt
 * keeps of an order.
 *
 * Until Bolt's own feed is connected, the till charges a Bolt order these
 * prices. A change saves at once: it does not wait for the New prices button,
 * which is for our own counter prices. Every write answers with the whole
 * board.
 */

export type BoltCommissionBase = 'paid' | 'listed';

export interface BoltSettings {
    commission_percent: number;
    /** What Bolt takes its cut from: the price the customer paid, or the listed price. */
    commission_base: BoltCommissionBase;
}

export interface BoltOption {
    id: number;
    option_key: string;
    option_label: string;
    display_name: string | null;
    /** Our counter price. */
    price: number;
    /** Null means the dish is not on Bolt. */
    bolt_price: number | null;
    bolt_promo_percent: number | null;
}

export interface BoltDish {
    id: number;
    name: string;
    category: string | null;
    is_available: boolean;
    options: BoltOption[];
}

export interface BoltBoard {
    settings: BoltSettings;
    dishes: BoltDish[];
    on_bolt_count: number;
}

function unwrap(response: unknown): BoltBoard {
    // The response interceptor already returns the body. One unwrap, not two.
    return (response as { data: BoltBoard }).data;
}

/** To the pesewa, the way the server rounds. */
export function roundMoney(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * One dish sold on Bolt: the promo we pay for, what the customer pays Bolt,
 * Bolt's cut and what we keep. The server works an order the same way, with
 * Bolt's cut taken once on the whole order.
 */
export function boltSums(boltPrice: number, promoPercent: number | null, settings: BoltSettings) {
    const promo = roundMoney(boltPrice * (promoPercent ?? 0) / 100);
    const paid = roundMoney(boltPrice - promo);
    const base = settings.commission_base === 'listed' ? boltPrice : paid;
    const cut = roundMoney(base * settings.commission_percent / 100);
    return { promo, paid, cut, keep: roundMoney(paid - cut) };
}

export const boltService = {
    board: async (): Promise<BoltBoard> => unwrap(await apiClient.get('/admin/bolt')),

    saveSettings: async (settings: BoltSettings): Promise<BoltBoard> =>
        unwrap(await apiClient.put('/admin/bolt/settings', settings)),

    /** A null price takes the dish off Bolt, and its promo with it. */
    saveOption: async (optionId: number, boltPrice: number | null, promoPercent: number | null): Promise<BoltBoard> =>
        unwrap(await apiClient.put(`/admin/bolt/options/${optionId}`, {
            bolt_price: boltPrice,
            bolt_promo_percent: promoPercent,
        })),
};
