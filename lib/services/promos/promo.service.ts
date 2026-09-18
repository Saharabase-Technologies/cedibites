// ─── Promo Service ────────────────────────────────────────────────────────────

import { ApiPromoService } from './promo.service.api';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * How a promo reaches an order.
 *
 * - `automatic`: by itself, on every order that qualifies.
 * - `shared_code`: one code, `code`, that anybody who has it can type.
 * - `single_use`: a batch of one-off codes, each good for one order.
 */
export type PromoRedemption = 'automatic' | 'shared_code' | 'single_use';

export interface Promo {
    id: string;
    name: string;
    redemption: PromoRedemption;
    /** The shared code, on a `shared_code` promo only. */
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
    /** One-off codes made for it, and how many are spent. Admin list only. */
    codesCount?: number;
    codesUsed?: number;
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
    /** The code that won, as it is written: JOLLOF-K7Q2MX however it was typed. */
    appliedCode: string | null;
}

/** One voucher out of a one-off batch, and the order that used it. */
export interface PromoCodeRow {
    id: string;
    code: string;
    batch: string | null;
    createdAt: string | null;
    used: boolean;
    orderNumber: string | null;
    usedAt: string | null;
    usedBy: string | null;
}

export interface GenerateCodesInput {
    count: number;
    /** Letters or numbers put in front: JOLLOF gives JOLLOF-K7Q2MX. */
    prefix?: string;
    /** A name for the batch, to tell it apart in the list. */
    batch?: string;
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
    /** Every one-off code on a promo, with the order that used each. */
    listCodes(promoId: string): Promise<PromoCodeRow[]>;
    /** Make a batch of one-off codes. Returns the new ones. */
    generateCodes(promoId: string, input: GenerateCodesInput): Promise<PromoCodeRow[]>;
    /** Take back a code nobody has used. */
    deleteCode(promoId: string, codeId: string): Promise<void>;
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
