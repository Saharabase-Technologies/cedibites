import type { DisplayMenuItem } from '@/lib/api/adapters/menu.adapter';

/**
 * A dish as the admin catalogue sees it: one row, company-wide, carrying the
 * branches that serve it. `branchId` is deliberately absent — it was the legacy
 * owning branch, and showing it made every dish read "Mother Kitchen" while the
 * pivot said otherwise.
 */
export interface AdminMenuItem extends Omit<DisplayMenuItem, 'tags'> {
    tags: string[];
}

export type PricingType = 'simple' | 'options';

export interface OptionRow {
    label: string;
    displayName: string;
    price: string;
    image?: string;
    imageFile?: File;
    /**
     * Clearing `image` alone cannot say "delete the stored photo" — an option
     * that never had one looks identical. This is the intent, and it survives
     * until the save that acts on it.
     */
    imageRemoved?: boolean;
}

export interface ItemFormState {
    name: string;
    description: string;
    category: string;
    pricingType: PricingType;
    simplePrice: string;
    image?: string;
    imageFile?: File;
    /** Same intent as OptionRow.imageRemoved, for the single-price photo. */
    imageRemoved?: boolean;
    options: OptionRow[];
    tags: string[];
    isAvailable: boolean;
}

/**
 * A lone `standard` option is how the backend stores single-price items, so it
 * is not "having options" in the sense the editor means.
 */
export function hasPricingOptions(item: Pick<DisplayMenuItem, 'sizes'>): boolean {
    if (!item.sizes?.length) return false;
    if (item.sizes.length === 1 && item.sizes[0].key === 'standard') return false;
    return true;
}

export function optionRowsOf(item: Pick<DisplayMenuItem, 'sizes'>): OptionRow[] {
    return (item.sizes ?? []).map(s => ({
        label: s.label,
        displayName: s.displayName ?? '',
        price: String(s.price),
        image: s.image,
    }));
}

/**
 * The option key the backend stores. Must stay the single definition — the
 * editor used to derive it a second way (without the punctuation strip), so an
 * option called "Large (2pc)" was written under one key and read under another,
 * and the price silently vanished.
 */
export function toOptionKey(label: string): string {
    return label.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
}

export function toSlug(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function itemToForm(item: AdminMenuItem): ItemFormState {
    const isMulti = hasPricingOptions(item);
    return {
        name: item.name,
        description: item.description,
        category: item.category,
        pricingType: isMulti ? 'options' : 'simple',
        simplePrice: !isMulti && item.price != null ? String(item.price) : '',
        image: item.image,
        options: isMulti
            ? optionRowsOf(item)
            : [{ label: '', displayName: '', price: '' }, { label: '', displayName: '', price: '' }],
        tags: item.tags,
        isAvailable: item.isAvailable,
    };
}

export function blankForm(categoryOptions: string[]): ItemFormState {
    return {
        name: '',
        description: '',
        category: categoryOptions.find(c => c !== 'All') ?? '',
        pricingType: 'simple',
        simplePrice: '',
        options: [{ label: '', displayName: '', price: '' }, { label: '', displayName: '', price: '' }],
        tags: [],
        isAvailable: true,
    };
}
