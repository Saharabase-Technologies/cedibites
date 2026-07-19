/**
 * app/inventory/daily-closing/utils.ts
 *
 * Local presentation helpers for the daily-closing screens.
 */

export function formatBusinessDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
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

/** Today's date as YYYY-MM-DD (local). */
export function todayIso(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

/** Signed variance string, e.g. "+3" / "−2" / "0". */
export function formatVariance(v: number | null): string {
  if (v === null) return '—';
  if (v === 0) return '0';
  return v > 0 ? `+${v}` : `${v}`;
}
