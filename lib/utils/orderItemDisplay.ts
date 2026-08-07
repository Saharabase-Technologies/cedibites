import type { OrderItem } from '@/types/order';

/**
 * Derives the display label for an order/cart item from its name and selected option.
 *
 * sizeLabel is expected to be the fully self-describing display_name from the DB
 * (e.g. "Assorted Jollof Rice + 3 Drums", "Seafood Fried Rice").
 * Falls back to the item name for single-price items (no option) or when the
 * option label is the "Standard" placeholder.
 */
export function getOrderItemLineLabel(item: Pick<OrderItem, 'name' | 'sizeLabel'>): string {
  const name = item.name?.trim() ?? '';
  const option = item.sizeLabel?.trim() ?? '';

  if (!option || option.toLowerCase() === 'standard') return name || option;

  return option;
}

export function formatOrderLineItemSummary(item: Pick<OrderItem, 'name' | 'sizeLabel' | 'quantity'>): string {
  const label = getOrderItemLineLabel(item);
  const display = label || 'Item';

  return `${display} ×${item.quantity}`;
}
