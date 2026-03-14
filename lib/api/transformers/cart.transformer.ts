import type { Cart, CartItem as ApiCartItem, MenuItem } from '@/types/api';
import type { CartItem as LocalCartItem } from '@/app/components/providers/CartProvider';
import type { SearchableItem } from '@/app/components/providers/MenuDiscoveryProvider';
import type { AddCartItemRequest } from '../services/cart.service';

/**
 * Transform API Cart to Local CartItem array
 * Converts backend cart structure to frontend cart structure
 * Consolidates duplicate items (same menu_item + size) into single entries
 */
export function transformApiCartToLocal(apiCart: Cart): LocalCartItem[] {
  if (!apiCart?.items || apiCart.items.length === 0) {
    return [];
  }

  // Group items by menu_item_id and size_key to consolidate duplicates
  const itemsMap = new Map<string, LocalCartItem & { apiCartItemIds: number[] }>();

  apiCart.items.forEach((apiItem: ApiCartItem) => {
    const menuItem = apiItem.menu_item;
    if (!menuItem) return; // Skip items with missing menu_item (e.g. deleted)
    const sizeKey = deriveSizeKey(apiItem);
    const cartItemId = `${menuItem.id}__${sizeKey}`;

    if (itemsMap.has(cartItemId)) {
      // Item already exists, add to quantity and track the cart_item_id
      const existing = itemsMap.get(cartItemId)!;
      existing.quantity += apiItem.quantity;
      existing.apiCartItemIds.push(apiItem.id);
    } else {
      // New item, add to map
      const sizeLabel = getSizeLabel(menuItem, sizeKey);
      itemsMap.set(cartItemId, {
        cartItemId,
        apiCartItemId: apiItem.id, // Store the first cart_item_id
        apiCartItemIds: [apiItem.id], // Track all cart_item_ids for this consolidated item
        item: transformMenuItemToSearchable(menuItem),
        selectedSize: sizeKey,
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
  const sizeKey = cartItem.selectedSize;
  const sizeId = sizeKey !== 'default' && cartItem.item.sizes
    ? (cartItem.item.sizes.find((s) => s.key === sizeKey) as { id?: number } | undefined)?.id
    : undefined;

  return {
    branch_id: branchId,
    menu_item_id: parseInt(cartItem.item.id),
    menu_item_size_id: sizeId,
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
  const sizes = (menuItem.sizes?.map((size: { size_key?: string; size_label?: string; name?: string; price?: number; id?: number }) => ({
    key: size.size_key ?? size.name?.toLowerCase().replace(/\s+/g, '_') ?? 'default',
    label: size.size_label ?? size.name ?? 'Default',
    price: size.price ?? 0,
    id: size.id,
  })) || []) as SearchableItem['sizes'];

  const catName = menuItem.category?.name || 'Basic Meals';
  const category = VALID_CATEGORIES.includes(catName as any) ? (catName as SearchableItem['category']) : 'Basic Meals';

  return {
    id: menuItem.id.toString(),
    name: menuItem.name,
    description: menuItem.description,
    category,
    price: menuItem.base_price,
    image: menuItem.image_url || '/menu_placeholder.png',
    url: `/menu?item=${menuItem.id}`,
    popular: menuItem.is_popular,
    isNew: menuItem.is_new,
    sizes: sizes && sizes.length > 0 ? sizes : undefined,
  };
}

/**
 * Derive size_key from API cart item (backend may use menu_item_size.name or size_key)
 */
function deriveSizeKey(apiItem: ApiCartItem & { menu_item_size?: { size_key?: string; name?: string } }): string {
  if (apiItem.size_key) return apiItem.size_key;
  const size = apiItem.menu_item_size;
  if (size?.size_key) return size.size_key;
  if (size?.name) return size.name.toLowerCase().replace(/\s+/g, '_');
  return 'default';
}

/**
 * Helper: Get size label from menu item
 */
function getSizeLabel(menuItem: MenuItem, sizeKey: string): string {
  if (!menuItem?.sizes || menuItem.sizes.length === 0) {
    return sizeKey;
  }

  const size = menuItem.sizes.find(
    (s: { size_key?: string; size_label?: string; name?: string }) =>
      (s.size_key ?? s.name?.toLowerCase().replace(/\s+/g, '_')) === sizeKey
  );
  return size?.size_label ?? (size as { name?: string })?.name ?? sizeKey;
}

/**
 * Helper: Create cart item ID
 */
export function makeCartItemId(itemId: string | number, sizeKey: string): string {
  return `${itemId}__${sizeKey}`;
}
