/**
 * app/inventory/transfers/utils.ts
 *
 * Local presentation helpers for the stock-transfer screens.
 * Re-exports the shared `formatGHS` so consumers can pull all formatters
 * from one place.
 */

import type { InventoryTransfer } from '@/types/inventory';

export { formatGHS } from '@/lib/utils/currency';

export function formatShortDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Estimated value of a transfer. Line cost only exists once stock is sent
 * (unit_cost_at_time is captured at send, FEFO-weighted), so a draft reads ₵0
 * — callers should treat 0 as "not yet costed".
 */
export function transferValue(transfer: InventoryTransfer): number {
  return transfer.lines.reduce((sum, line) => {
    const qty = line.sent_qty ?? 0;
    return sum + qty * (line.unit_cost_at_time ?? 0);
  }, 0);
}
