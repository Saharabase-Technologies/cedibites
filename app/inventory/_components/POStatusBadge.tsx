'use client';

import type { PurchaseOrderStatus } from '@/types/inventory';
import { TONE, type StatusTone } from './status-tokens';

const STATUS_STYLES: Record<PurchaseOrderStatus, { label: string } & StatusTone> = {
  draft: { label: 'Draft', ...TONE.neutral },
  pending_approval: { label: 'Pending approval', ...TONE.waiting },
  sent: { label: 'Sent', ...TONE.decided },
  partially_received: { label: 'Partial', ...TONE.partial },
  received: { label: 'Received', ...TONE.done },
  closed: { label: 'Closed', ...TONE.settled },
  cancelled: { label: 'Cancelled', ...TONE.problem },
};

export function POStatusBadge({
  status,
  className = '',
}: {
  status: PurchaseOrderStatus;
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
