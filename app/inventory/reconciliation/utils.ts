/**
 * app/inventory/reconciliation/utils.ts
 *
 * Local presentation helpers for the reconciliation screens.
 */

export { formatGHS } from '@/lib/utils/currency';

export function formatDateTime(value: string | null): string {
  if (!value) return '-';
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

/** Signed variance string, e.g. "+3" / "−2" / "0". */
export function formatVariance(v: number | null): string {
  if (v === null) return '-';
  if (v === 0) return '0';
  return v > 0 ? `+${v}` : `${v}`;
}
