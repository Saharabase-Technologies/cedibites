import type { OrderItem } from '@/types/order';

/**
 * What one line of an order is called, on a receipt, a ticket or a screen.
 *
 * The option carries the receipt name when the menu has given it one. A
 * `display_name` like "Assorted Jollof Rice + 3 Drums" already says what the
 * dish is, so it stands alone and the item name would only repeat it.
 *
 * **Most options have no display_name.** They fall back to `option_label`,
 * which is a pill on the menu and not a sentence: "Assorted", "Juicy Fried -
 * 10 pieces", "Large". Returning that alone is how a customer ended up reading
 * "Assorted ₵160.00" on their own receipt with nothing to say it was rice. So
 * a label that does not already name the dish is joined to the name instead.
 *
 * Fried Rice + "Assorted"                → "Fried Rice, Assorted"
 * Drumsticks + "Juicy Fried - 10 pieces" → "Drumsticks, Juicy Fried - 10 pieces"
 * Jollof Rice + "Assorted Jollof Rice + 3 Drums" → the option, unchanged
 */
export function getOrderItemLineLabel(item: Pick<OrderItem, 'name' | 'sizeLabel'>): string {
  const name = item.name?.trim() ?? '';
  const option = item.sizeLabel?.trim() ?? '';

  // "Standard" is the placeholder for a dish that has no real choice to make.
  if (!option || option.toLowerCase() === 'standard') return name || option;
  if (!name) return option;

  // Already self-describing: it names the dish, so saying it twice helps nobody.
  if (option.toLowerCase().includes(name.toLowerCase())) return option;

  return `${name}, ${option}`;
}

export function formatOrderLineItemSummary(item: Pick<OrderItem, 'name' | 'sizeLabel' | 'quantity'>): string {
  const label = getOrderItemLineLabel(item);
  const display = label || 'Item';

  return `${display} ×${item.quantity}`;
}
