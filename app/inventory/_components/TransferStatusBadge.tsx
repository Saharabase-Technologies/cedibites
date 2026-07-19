'use client';

import type { TransferStatus } from '@/types/inventory';

const STATUS_STYLES: Record<
  TransferStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  draft: {
    label: 'Draft',
    bg: 'bg-neutral-light',
    text: 'text-neutral-gray',
    dot: 'bg-neutral-gray/60',
  },
  submitted: {
    label: 'Submitted',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  approved: {
    label: 'Approved',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  sent: {
    label: 'In transit',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    dot: 'bg-indigo-500',
  },
  received: {
    label: 'Received',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  disputed: {
    label: 'Disputed',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
  },
  closed: {
    label: 'Closed',
    bg: 'bg-neutral-light',
    text: 'text-text-dark',
    dot: 'bg-text-dark/60',
  },
  closed_disputed: {
    label: 'Closed (disputed)',
    bg: 'bg-neutral-light',
    text: 'text-rose-700',
    dot: 'bg-rose-400',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
  },
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
