import type { OrderItem } from '@/types/order';

/**
 * Line label from API-backed option text only.
 */
export function getOrderItemLineLabel(item: Pick<OrderItem, 'name' | 'sizeLabel'>): string {
  return item.sizeLabel?.trim() ?? '';
}

export function formatOrderLineItemSummary(item: Pick<OrderItem, 'name' | 'sizeLabel' | 'quantity'>): string {
  const label = getOrderItemLineLabel(item);
  const display = label || 'Item';

  return `${display} ×${item.quantity}`;
}
