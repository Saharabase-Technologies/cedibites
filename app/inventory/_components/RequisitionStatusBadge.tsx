'use client';

import type { RequisitionStatus } from '@/types/inventory';

const STATUS_STYLES: Record<
  RequisitionStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  draft: {
    label: 'Draft',
    bg: 'bg-neutral-light',
    text: 'text-neutral-gray',
    dot: 'bg-neutral-gray/60',
  },
  submitted: {
    label: 'Awaiting approval',
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
  fulfilled: {
    label: 'Fulfilled',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
  },
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
