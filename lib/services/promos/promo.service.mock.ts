// ─── Mock Promo Service ───────────────────────────────────────────────────────

import type { PromoService, Promo } from './promo.service';

const STORAGE_KEY = 'cedibites-promos';
const SEEDED_KEY  = 'cedibites-promos-seeded';

// Seed shown once per browser so the promos page isn't empty on first open.
// All dates are relative to March 2026 (project demo window).
const SEED_PROMOS: Promo[] = [
    {
        id: 'promo-seed-1',
        name: 'Jollof Friday Promo',
        type: 'percentage',
        value: 20,
        scope: 'global',
        branchIds: [],
        appliesTo: 'order',
        itemIds: [],
        maxDiscount: 30,
        startDate: '2026-03-06',
        endDate: '2026-03-14',
        isActive: true,
        accountingCode: 'PROMO-JF20',
    },
    {
        id: 'promo-seed-2',
        name: 'East Legon VIP 15% Off',
        type: 'percentage',
        value: 15,
        scope: 'branch',
        branchIds: ['branch-1'],
        appliesTo: 'order',
        itemIds: [],
        minOrderValue: 100,
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        isActive: true,
        accountingCode: 'PROMO-EL15',
    },
    {
        id: 'promo-seed-3',
        name: 'New Customer Deal',
        type: 'fixed_amount',
        value: 10,
        scope: 'global',
        branchIds: [],
        appliesTo: 'order',
        itemIds: [],
        minOrderValue: 50,
        startDate: '2026-03-15',
        endDate: '2026-03-22',
        isActive: true,
        accountingCode: 'PROMO-NC10',
    },
    {
        id: 'promo-seed-4',
        name: "Valentine's Weekend",
        type: 'percentage',
        value: 25,
        scope: 'global',
        branchIds: [],
        appliesTo: 'order',
        itemIds: [],
        startDate: '2026-02-12',
        endDate: '2026-02-14',
        isActive: false,
        accountingCode: 'PROMO-VAL25',
    },
    {
        id: 'promo-seed-5',
        name: 'Jollof Rice Special',
        type: 'percentage',
        value: 10,
        scope: 'global',
        branchIds: [],
        appliesTo: 'items',
        itemIds: ['jollof', 'jollof-bowl'],
        startDate: '2026-03-10',
        endDate: '2026-03-31',
        isActive: true,
        accountingCode: 'PROMO-JR10',
    },
];

function loadPromos(): Promo[] {
    if (typeof window === 'undefined') return [];
    try {
        // Seed once if not yet done
        if (!localStorage.getItem(SEEDED_KEY)) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PROMOS));
            localStorage.setItem(SEEDED_KEY, '1');
            return SEED_PROMOS;
        }
        return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Promo[];
    } catch {
        return [];
    }
}

function savePromos(promos: Promo[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(promos));
}

function nanoid(): string {
    return Math.random().toString(36).slice(2, 11);
}

export class MockPromoService implements PromoService {
    async getAll(): Promise<Promo[]> {
        return loadPromos();
    }

    async getById(id: string): Promise<Promo | null> {
        return loadPromos().find(p => p.id === id) ?? null;
    }

    async create(promo: Omit<Promo, 'id'>): Promise<Promo> {
        const promos = loadPromos();
        const created: Promo = { ...promo, id: nanoid() };
        promos.push(created);
        savePromos(promos);
        return created;
    }

    async update(id: string, patch: Partial<Promo>): Promise<Promo> {
        const promos = loadPromos();
        const idx = promos.findIndex(p => p.id === id);
        if (idx === -1) throw new Error(`Promo ${id} not found`);
        promos[idx] = { ...promos[idx], ...patch };
        savePromos(promos);
        return promos[idx];
    }

    async delete(id: string): Promise<void> {
        savePromos(loadPromos().filter(p => p.id !== id));
    }

    async resolvePromo(itemIds: string[], branchId: string, subtotal?: number): Promise<Promo | null> {
        const now = new Date().toISOString().slice(0, 10);
        const promos = loadPromos();

        const eligible = promos.filter(p => {
            if (!p.isActive) return false;
            if (p.startDate > now || p.endDate < now) return false;
            if (p.scope === 'branch' && (!p.branchIds?.includes(branchId))) return false;
            // Item-scoped: at least one cart item must match
            if ((p.appliesTo ?? 'order') === 'items' && !itemIds.some(id => p.itemIds.includes(id))) return false;
            // Order value gates
            if (subtotal !== undefined) {
                if (p.minOrderValue != null && subtotal < p.minOrderValue) return false;
                if (p.maxOrderValue != null && subtotal > p.maxOrderValue) return false;
            }
            return true;
        });

        if (eligible.length === 0) return null;

        // Prefer the promo that yields the highest actual discount at the given subtotal
        return eligible.reduce((best, p) => {
            const calc = (promo: Promo) => {
                if (subtotal == null) return promo.value;
                return this.calculateDiscount(promo, subtotal);
            };
            return calc(p) > calc(best) ? p : best;
        });
    }

    calculateDiscount(promo: Promo, subtotal: number): number {
        let discount: number;
        if (promo.type === 'percentage') {
            discount = Math.round((subtotal * promo.value) / 100 * 100) / 100;
            if (promo.maxDiscount != null) discount = Math.min(discount, promo.maxDiscount);
        } else {
            discount = Math.min(promo.value, subtotal);
        }
        return discount;
    }
}
