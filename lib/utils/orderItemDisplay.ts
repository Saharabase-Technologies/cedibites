import type { OrderItem } from '@/types/order';
import { receiptName } from './receiptName.mjs';

/**
 * What one line of an order is called, on a receipt, a ticket or a screen.
 *
 * READ lib/utils/receiptName.mjs BEFORE CHANGING THIS. The rule lives there,
 * decided by the owner: the option bought, on its own, and the menu item's
 * name only for a dish with no real option. Never the two joined. The deploy
 * gate checks it and fails if it breaks.
 *
 * `sizeLabel` is the option's receipt name: `display_name`, falling back to
 * `option_label`. Every screen passes it through here rather than naming a
 * line itself.
 */
export function getOrderItemLineLabel(item: Pick<OrderItem, 'name' | 'sizeLabel'>): string {
  return receiptName(item.name, item.sizeLabel);
}

export function formatOrderLineItemSummary(item: Pick<OrderItem, 'name' | 'sizeLabel' | 'quantity'>): string {
  const label = getOrderItemLineLabel(item);
  const display = label || 'Item';

  return `${display} ×${item.quantity}`;
}
