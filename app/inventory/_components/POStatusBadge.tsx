'use client';

import type { PurchaseOrderStatus } from '@/types/inventory';

const STATUS_STYLES: Record<
  PurchaseOrderStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  draft: {
    label: 'Draft',
    bg: 'bg-neutral-light',
    text: 'text-neutral-gray',
    dot: 'bg-neutral-gray/60',
  },
  pending_approval: {
    label: 'Pending approval',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  sent: {
    label: 'Sent',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  partially_received: {
    label: 'Partial',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    dot: 'bg-violet-500',
  },
  received: {
    label: 'Received',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  closed: {
    label: 'Closed',
    bg: 'bg-neutral-light',
    text: 'text-text-dark',
    dot: 'bg-text-dark/60',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
  },
};

export function POStatusBadge({
  status,
  className = '',
}: {
  status: PurchaseOrderStatus;
  className?: string;
}) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-body ${style.bg} ${style.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} aria-hidden />
      {style.label}
    </span>
  );
}
