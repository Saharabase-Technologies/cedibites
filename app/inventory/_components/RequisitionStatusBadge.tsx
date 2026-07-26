'use client';

import type { RequisitionStatus } from '@/types/inventory';
import { TONE, type StatusTone } from './status-tokens';

const STATUS_STYLES: Record<RequisitionStatus, { label: string } & StatusTone> = {
  draft: { label: 'Draft', ...TONE.neutral },
  submitted: { label: 'Awaiting approval', ...TONE.waiting },
  approved: { label: 'Approved', ...TONE.decided },
  fulfilled: { label: 'Fulfilled', ...TONE.done },
  // Terminal, but not the green of a clean delivery: something went back on
  // the lorry, and the row should not read as fully served at a glance.
  fulfilled_short: { label: 'Fulfilled short', ...TONE.partial },
  rejected: { label: 'Rejected', ...TONE.problem },
};

export function RequisitionStatusBadge({
  status,
  className = '',
}: {
  status: RequisitionStatus;
  className?: string;
}) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-body ${style.bg} ${style.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} aria-hidden />
      {style.label}
    </span>
  );
}
