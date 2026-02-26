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
  if (!apiCart.items || apiCart.items.length === 0) {
    return [];
  }

  // Group items by menu_item_id and size_key to consolidate duplicates
  const itemsMap = new Map<string, LocalCartItem & { apiCartItemIds: number[] }>();

  apiCart.items.forEach((apiItem: ApiCartItem) => {
    const menuItem = apiItem.menu_item;
    const sizeKey = apiItem.size_key || 'default';
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
  return {
    branch_id: branchId,
    menu_item_id: parseInt(cartItem.item.id),
    quantity: cartItem.quantity,
    size_key: cartItem.selectedSize !== 'default' ? cartItem.selectedSize : undefined,
    variant_key: undefined, // Not used in current implementation
    special_instructions: undefined,
  };
}

/**
 * Transform MenuItem to SearchableItem
 * Converts backend menu item to frontend searchable format
 */
export function transformMenuItemToSearchable(menuItem: MenuItem): SearchableItem {
  const sizes = menuItem.sizes?.map((size) => ({
    key: size.size_key,
    label: size.size_label,
    price: size.price,
  })) || [];

  return {
    id: menuItem.id.toString(),
    name: menuItem.name,
    description: menuItem.description,
    category: menuItem.category?.name || 'Other',
    price: menuItem.base_price,
    image: menuItem.image_url || '/placeholder-food.jpg',
    isPopular: menuItem.is_popular,
    isNew: menuItem.is_new,
    isAvailable: menuItem.is_available,
    sizes: sizes.length > 0 ? sizes : undefined,
  };
}

/**
 * Helper: Get size label from menu item
 */
function getSizeLabel(menuItem: MenuItem, sizeKey: string): string {
  if (!menuItem.sizes || menuItem.sizes.length === 0) {
    return sizeKey;
  }

  const size = menuItem.sizes.find((s) => s.size_key === sizeKey);
  return size?.size_label || sizeKey;
}

/**
 * Helper: Create cart item ID
 */
export function makeCartItemId(itemId: string | number, sizeKey: string): string {
  return `${itemId}__${sizeKey}`;
}
