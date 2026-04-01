import type { OrderItem } from '@/types/order';

/**
 * Derives the display label for an order/cart item from its name and selected option.
 *
 * - "Standard" option (single-price items): suppressed → just the item name.
 * - Option found verbatim inside combo name: slices from that position.
 *   e.g. name="Assorted / Jollof / Noodles + 3 Drums", sizeLabel="Noodles" → "Noodles + 3 Drums"
 * - Option not found in name (simple item): prepends option to name.
 *   e.g. name="Fried Rice", sizeLabel="Seafood" → "Seafood Fried Rice"
 */
export function getOrderItemLineLabel(item: Pick<OrderItem, 'name' | 'sizeLabel'>): string {
  const name = item.name?.trim() ?? '';
  const option = item.sizeLabel?.trim() ?? '';

  // No meaningful option → just name
  if (!option || option.toLowerCase() === 'standard') {
    return name || option;
  }

  if (!name) return option;

  // Option appears verbatim inside full combo name → slice from that point
  const idx = name.indexOf(option);
  if (idx !== -1) return name.slice(idx);

  // Option not found in name (simple item) → prepend option
  return `${option} ${name}`;
}

export function formatOrderLineItemSummary(item: Pick<OrderItem, 'name' | 'sizeLabel' | 'quantity'>): string {
  const label = getOrderItemLineLabel(item);
  const display = label || 'Item';

  return `${display} ×${item.quantity}`;
}
