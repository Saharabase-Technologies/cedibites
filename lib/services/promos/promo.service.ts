// ─── Promo Service ────────────────────────────────────────────────────────────
// Swap MockPromoService → ApiPromoService when backend is ready.

import { ApiPromoService } from './promo.service.api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Promo {
    id: string;
    name: string;
    /**
     * Typed by the customer or the cashier. Without one the promo applies by
     * itself to every order that qualifies; with one it waits to be asked for.
     */
    code?: string;
    type: 'percentage' | 'fixed_amount';
    value: number;                // e.g. 20 = 20% off OR ₵20 off
    scope: 'global' | 'branch';
    branchIds?: string[];         // if scope = 'branch'
    /** What the discount targets */
    appliesTo: 'order' | 'items'; // order = whole cart total, items = specific menu items
    itemIds: string[];            // populated when appliesTo = 'items'
    /** Optional order-value gates (both can coexist for a range) */
    minOrderValue?: number;       // promo only fires when subtotal >= this
    maxOrderValue?: number;       // promo only fires when subtotal <= this
    /** Cap the GHS value of a percentage discount */
    maxDiscount?: number;         // e.g. max ₵30 off even if % yields more
    /** Orders it can go on in total. A cancelled order gives its use back. */
    maxUses?: number;
    /** Orders it can go on per phone number. */
    maxUsesPerCustomer?: number;
    /** Only for a phone number that has never ordered. */
    firstOrderOnly?: boolean;
    /** Orders it is on, cancelled ones aside. Only the admin list carries it. */
    timesUsed?: number;
    startDate: string;            // ISO date string
    endDate: string;              // ISO date string
    isActive: boolean;
    accountingCode?: string;
}

/** One line of the basket: which dish, and what that line costs. */
export interface PromoLine {
    menuItemId: string | number;
    amount: number;
}

export interface PromoOfferInput {
    branchId: string;
    lines: PromoLine[];
    subtotal: number;
    /** What somebody typed. Left out, only a promo without a code can apply. */
    code?: string;
    /** Who is ordering, for a code held to a number of uses or a first order. */
    phone?: string;
}

/**
 * The one discount an order carries.
 *
 * `codeBeaten` means the code was valid but the order already had a bigger
 * offer, which it keeps. Typing a code never costs anybody money.
 */
export interface PromoOffer {
    promo: Promo | null;
    discount: number;
    codeBeaten: boolean;
}

export interface PromoService {
    getAll(): Promise<Promo[]>;
    getById(id: string): Promise<Promo | null>;
    create(promo: Omit<Promo, 'id'>): Promise<Promo>;
    update(id: string, patch: Partial<Promo>): Promise<Promo>;
    delete(id: string): Promise<void>;
    /**
     * What comes off this basket, worked out by the server. The checkout and
     * the till both ask here, and the server asks the same question again when
     * the order is placed, so the figure shown is the figure charged.
     *
     * A code the order cannot have rejects with an ApiError whose `code` is
     * `promo_code_refused`; `promoRefusal` reads the sentence out of it.
     */
    offer(input: PromoOfferInput): Promise<PromoOffer>;
}

/**
 * The sentence to show when a code was refused, or null for any other failure.
 * It is written for the person at the screen and shown as it stands.
 */
export function promoRefusal(err: unknown): string | null {
    const e = err as { code?: string; message?: string } | null;
    return e?.code === 'promo_code_refused' && e.message ? e.message : null;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

let _instance: PromoService | null = null;

export function getPromoService(): PromoService {
    if (!_instance) {
        _instance = new ApiPromoService();
    }
    return _instance;
}
