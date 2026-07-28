import apiClient from '../client';

/**
 * No stock, no sale — the advisory half.
 *
 * The rule itself is enforced server-side when the checkout session is created.
 * This is so the till can grey a dish out while the cart is being built, rather
 * than refusing after the customer has decided and the cashier has said a price
 * out loud. Advisory on purpose: this map is a moment stale the instant it
 * arrives, and two tills can sell the last portion at the same time.
 */

export interface StockShortfall {
    item_id: number;
    item_name: string;
    unit: string | null;
    required: number;
    available: number;
}

export interface StockCheckResult {
    can_sell: boolean;
    /** False when nothing could be judged — no location, or no recipe. Never a refusal. */
    judged: boolean;
    reason: string | null;
    shortfalls: StockShortfall[];
    message: string;
    can_override: boolean;
}

export const stockGateService = {
    /**
     * option id → can this branch make at least one right now.
     *
     * Options with no recipe are absent from the map entirely: nothing to
     * judge, so treat a missing key as sellable.
     */
    sellableMap: async (branchId: number): Promise<Record<number, boolean>> => {
        // The response interceptor already returns the body, so the shape here
        // is { data: { branch_id, sellable } } — one unwrap, not two. Getting
        // that wrong returns {} and silently greys out nothing, which is exactly
        // how this shipped the first time.
        const body = await apiClient.get('/pos/stock-gate', { params: { branch_id: branchId } });
        const outer = body as { data?: { sellable?: Record<number, boolean> } };
        return outer?.data?.sellable ?? {};
    },

    check: async (
        branchId: number,
        items: { menu_item_option_id: number; quantity: number }[],
    ): Promise<StockCheckResult | null> => {
        const body = await apiClient.post('/pos/stock-gate/check', { branch_id: branchId, items });
        const outer = body as { data?: StockCheckResult };
        return outer?.data ?? null;
    },
};
