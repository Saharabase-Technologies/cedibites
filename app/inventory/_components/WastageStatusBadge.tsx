'use client';

import type { WastageStatus } from '@/types/inventory';
import { TONE, type StatusTone } from './status-tokens';

const STATUS_STYLES: Record<WastageStatus, { label: string } & StatusTone> = {
  /** The goods are physically travelling back to the warehouse to be looked at. */
  pending_return: { label: 'Awaiting return', ...TONE.moving },
  pending_approval: { label: 'Awaiting approval', ...TONE.waiting },
  /** Deliberately not "Approved" — what matters is that the stock is gone. */
  approved: { label: 'Written off', ...TONE.done },
  rejected: { label: 'Refused', ...TONE.problem },
  cancelled: { label: 'Withdrawn', ...TONE.neutral },
};

export function WastageStatusBadge({
  status,
  className = '',
}: {
  status: WastageStatus;
  className?: string;
}) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.pending_approval;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-body ${style.bg} ${style.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} aria-hidden />
      {style.label}
    </span>
  );
}
