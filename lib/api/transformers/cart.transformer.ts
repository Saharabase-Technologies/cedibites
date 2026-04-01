import type { Cart, CartItem as ApiCartItem, MenuItem } from '@/types/api';
import type { CartItem as LocalCartItem } from '@/app/components/providers/CartProvider';
import type { SearchableItem } from '@/app/components/providers/MenuDiscoveryProvider';
import type { AddCartItemRequest } from '../services/cart.service';

/**
 * Transform API Cart to Local CartItem array
 * Converts backend cart structure to frontend cart structure
 * Consolidates duplicate items (same menu_item + option) into single entries
 */
export function transformApiCartToLocal(apiCart: Cart): LocalCartItem[] {
  if (!apiCart?.items || apiCart.items.length === 0) {
    return [];
  }

  // Group items by menu_item_id and option_key to consolidate duplicates
  const itemsMap = new Map<string, LocalCartItem & { apiCartItemIds: number[] }>();

  apiCart.items.forEach((apiItem: ApiCartItem) => {
    const menuItem = apiItem.menu_item;
    if (!menuItem) return; // Skip items with missing menu_item (e.g. deleted)
    const optionKey = deriveOptionKey(apiItem);
    const cartItemId = `${menuItem.id}__${optionKey}`;

    if (itemsMap.has(cartItemId)) {
      // Item already exists, add to quantity and track the cart_item_id
      const existing = itemsMap.get(cartItemId)!;
      existing.quantity += apiItem.quantity;
      existing.apiCartItemIds.push(apiItem.id);
    } else {
      // New item, add to map
      const sizeLabel = getOptionLabel(menuItem, optionKey);
      itemsMap.set(cartItemId, {
        cartItemId,
        apiCartItemId: apiItem.id, // Store the first cart_item_id
        apiCartItemIds: [apiItem.id], // Track all cart_item_ids for this consolidated item
        item: transformMenuItemToSearchable(menuItem),
        selectedSize: optionKey,
        sizeLabel,
        price: apiItem.unit_price,
        quantity: apiItem.quantity,
      });
    }
  });

  // Convert to array and remove the temporary apiCartItemIds field
  return Array.from(itemsMap.values()).map(({ apiCartItemIds, ...item }) => item);
}

/**
 * Transform Local CartItem to API AddCartItemRequest
 * Converts frontend cart item to backend request format
 */
export function transformLocalToApiRequest(
  cartItem: LocalCartItem,
  branchId: number
): AddCartItemRequest {
  const optionKey = cartItem.selectedSize;
  const optionId = optionKey !== 'default' && cartItem.item.sizes
    ? (cartItem.item.sizes.find((s) => s.key === optionKey) as { id?: number } | undefined)?.id
    : undefined;

  return {
    branch_id: branchId,
    menu_item_id: parseInt(cartItem.item.id),
    menu_item_option_id: optionId,
    quantity: cartItem.quantity,
    unit_price: cartItem.price,
    special_instructions: undefined,
  };
}

/**
 * Transform MenuItem to SearchableItem
 * Converts backend menu item to frontend searchable format
 */
const VALID_CATEGORIES = ['Basic Meals', 'Budget Bowls', 'Combos', 'Top Ups', 'Drinks'] as const;

export function transformMenuItemToSearchable(menuItem: MenuItem): SearchableItem {
  const sizes = (menuItem.options?.map((option: { option_key?: string; option_label?: string; display_name?: string | null; price?: number; id?: number; image_url?: string | null }) => ({
    key: option.option_key ?? 'default',
    label: option.option_label ?? 'Default',
    displayName: option.display_name ?? undefined,
    price: option.price ?? 0,
    id: option.id,
    image: option.image_url ?? undefined,
  })) || []) as SearchableItem['sizes'];

  const catName = menuItem.category?.name || 'Basic Meals';
  const category = VALID_CATEGORIES.includes(catName as any) ? (catName as SearchableItem['category']) : 'Basic Meals';

  return {
    id: menuItem.id.toString(),
    name: menuItem.name,
    description: menuItem.description,
    category,
    price: sizes?.[0]?.price,
    image: sizes?.[0]?.image || menuItem.image_url || undefined,
    url: `/menu?item=${menuItem.id}`,
    tags: menuItem.tags?.map(t => ({ slug: t.slug, name: t.name })) ?? [],
    sizes: sizes && sizes.length > 0 ? sizes : undefined,
  };
}

/**
 * Derive option key from API cart item
 */
function deriveOptionKey(apiItem: ApiCartItem & { menu_item_option?: { option_key?: string; option_label?: string } | null }): string {
  if (apiItem.option_key) return apiItem.option_key;
  const option = apiItem.menu_item_option;
  if (option?.option_key) return option.option_key;
  if (apiItem.menu_item_option_snapshot?.option_key) return apiItem.menu_item_option_snapshot.option_key;
  return 'default';
}

/**
 * Helper: Get option label from menu item
 */
function getOptionLabel(menuItem: MenuItem, optionKey: string): string {
  if (!menuItem?.options || menuItem.options.length === 0) {
    return optionKey;
  }

  const option = menuItem.options.find(
    (s: { option_key?: string; option_label?: string; display_name?: string | null }) =>
      s.option_key === optionKey
  );
  return option?.display_name || option?.option_label || optionKey;
}

/**
 * Helper: Create cart item ID
 */
export function makeCartItemId(itemId: string | number, sizeKey: string): string {
  return `${itemId}__${sizeKey}`;
}
