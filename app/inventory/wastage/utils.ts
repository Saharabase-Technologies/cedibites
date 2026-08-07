/**
 * app/inventory/wastage/utils.ts
 *
 * Local presentation helpers for the wastage screens.
 */

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

export function formatGhs(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return `₵${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Trim trailing zeros so 2.5000 reads "2.5" and 3.0000 reads "3". */
export function formatQty(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return String(Number(value.toFixed(4)));
}
