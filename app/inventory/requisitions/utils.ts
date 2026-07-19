/**
 * app/inventory/requisitions/utils.ts
 *
 * Local presentation helpers for the requisition screens.
 */

import type { RequisitionPurpose } from '@/types/inventory';

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

export const PURPOSE_LABEL: Record<RequisitionPurpose, string> = {
  opening: 'Opening stock',
  supplementary: 'Supplementary',
};
