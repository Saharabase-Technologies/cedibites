import type { MenuItem as ApiMenuItem, MenuItemOption as ApiMenuItemOption } from '@/types/api';

/**
 * Display format for menu items.
 * Uses id (string) for display/React keys; numericId for API calls (promo resolve, cart, orders).
 */
export interface DisplayMenuItem {
  id: string;
  numericId: number;
  branchId?: number;
  name: string;
  description: string;
  category: string;
  price?: number;
  sizes?: { id: number; key: string; label: string; price: number; image?: string }[];
  hasVariants?: boolean;
  availableAddOns?: string[];
  variants?: { plain?: number; assorted?: number };
  image?: string;
  url: string;
  popular?: boolean;
  isNew?: boolean;
}

export interface DisplayMenuCategory {
  id: string;
  name: string;
}

function toNum(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const n = parseFloat(String(v ?? 0));
  return Number.isNaN(n) ? 0 : n;
}

function mapApiOptionToDisplay(option: ApiMenuItemOption): { id: number; key: string; label: string; price: number; image?: string } {
  return {
    id: option.id,
    key: option.option_key,
    label: option.option_label,
    price: toNum(option.price),
    image: option.image_url ?? undefined,
  };
}

/**
 * Map API MenuItem to display format for POS, new-order, staff store, etc.
 */
export function apiMenuItemToDisplayItem(api: ApiMenuItem): DisplayMenuItem {
  const categoryName = api.category?.name ?? 'Uncategorized';
  const slug = api.slug ?? String(api.id);
  const sizes = api.options?.length
    ? api.options.map(mapApiOptionToDisplay)
    : undefined;

  const hasSizes = sizes !== undefined && sizes.length > 0;
  const hasVariants = hasSizes;
  const variants = undefined;
  const defaultImage = sizes?.[0]?.image ?? api.image_url;
  const defaultPrice = sizes?.[0]?.price;

  return {
    id: String(api.id),
    numericId: api.id,
    branchId: api.branch_id,
    name: api.name,
    description: api.description ?? '',
    category: categoryName,
    price: hasSizes ? defaultPrice : undefined,
    sizes,
    hasVariants,
    variants,
    image: defaultImage,
    url: `/menu?item=${slug}`,
    popular: api.popular ?? false,
    isNew: api.is_new ?? false,
  };
}

/**
 * Derive unique categories from display items.
 */
export function deriveCategories(items: DisplayMenuItem[]): DisplayMenuCategory[] {
  const seen = new Set<string>();
  const categories: DisplayMenuCategory[] = [];
  for (const item of items) {
    if (!seen.has(item.category)) {
      seen.add(item.category);
      categories.push({ id: item.category.toLowerCase().replace(/\s+/g, '-'), name: item.category });
    }
  }
  return categories;
}
