/**
 * app/inventory/purchase-orders/utils.ts
 *
 * Local presentation helpers for the Purchase Order screens.
 * Re-exports the shared `formatGHS` so consumers can pull both formatters
 * from one place.
 */

export { formatGHS } from '@/lib/utils/currency';

export function formatShortDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string): string {
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
