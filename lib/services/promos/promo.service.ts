// ─── Promo Service ────────────────────────────────────────────────────────────
// Swap MockPromoService → ApiPromoService when backend is ready.

import { MockPromoService } from './promo.service.mock';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Promo {
    id: string;
    name: string;
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
    startDate: string;            // ISO date string
    endDate: string;              // ISO date string
    isActive: boolean;
    accountingCode?: string;
}

export interface PromoService {
    getAll(): Promise<Promo[]>;
    getById(id: string): Promise<Promo | null>;
    create(promo: Omit<Promo, 'id'>): Promise<Promo>;
    update(id: string, patch: Partial<Promo>): Promise<Promo>;
    delete(id: string): Promise<void>;
    /** Returns the best applicable promo for a set of item IDs on a branch */
    resolvePromo(itemIds: string[], branchId: string, subtotal?: number): Promise<Promo | null>;
    /** Calculate discount amount given a promo and subtotal */
    calculateDiscount(promo: Promo, subtotal: number): number;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

let _instance: PromoService | null = null;

export function getPromoService(): PromoService {
    if (!_instance) {
        _instance = new MockPromoService();
    }
    return _instance;
}
