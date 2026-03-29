import type { OrderItem } from '@/types/order';

/**
 * Line label from API-backed fields only. When both menu `name` and option `sizeLabel` are set,
 * uses `name (sizeLabel)` so parent combo text (e.g. "+ 3 Drums") stays visible alongside the variant.
 */
export function getOrderItemLineLabel(item: Pick<OrderItem, 'name' | 'sizeLabel'>): string {
  const name = item.name?.trim() ?? '';
  const option = item.sizeLabel?.trim() ?? '';

  if (name && option) {
    if (name.localeCompare(option, undefined, { sensitivity: 'accent' }) === 0) {
      return name;
    }

    return `${name} (${option})`;
  }

  if (name) {
    return name;
  }

  return option;
}

export function formatOrderLineItemSummary(item: Pick<OrderItem, 'name' | 'sizeLabel' | 'quantity'>): string {
  const label = getOrderItemLineLabel(item);
  const display = label || 'Item';

  return `${display} ×${item.quantity}`;
}
