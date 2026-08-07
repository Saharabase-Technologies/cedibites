'use client';

import type { TransferStatus } from '@/types/inventory';
import { TONE, type StatusTone } from './status-tokens';

const STATUS_STYLES: Record<TransferStatus, { label: string } & StatusTone> = {
  draft: { label: 'Draft', ...TONE.neutral },
  submitted: { label: 'Submitted', ...TONE.waiting },
  approved: { label: 'Approved', ...TONE.decided },
  sent: { label: 'In transit', ...TONE.moving },
  received: { label: 'Received', ...TONE.done },
  disputed: { label: 'Disputed', ...TONE.problem },
  /** Refused at the door - never entered the destination's books. */
  rejected: { label: 'Refused', ...TONE.problemSettled },
  closed: { label: 'Closed', ...TONE.settled },
  closed_disputed: { label: 'Closed (disputed)', ...TONE.problemSettled },
  cancelled: { label: 'Cancelled', ...TONE.problem },
};

export function TransferStatusBadge({
  status,
  className = '',
}: {
  status: TransferStatus;
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
