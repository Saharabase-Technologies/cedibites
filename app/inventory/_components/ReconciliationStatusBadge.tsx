'use client';

import type { ReconciliationStatus } from '@/types/inventory';

const STATUS_STYLES: Record<
  ReconciliationStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  open: {
    label: 'Counting',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  closed: {
    label: 'Balanced',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
};

export function ReconciliationStatusBadge({
  status,
  className = '',
}: {
  status: ReconciliationStatus;
  className?: string;
}) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.open;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-body ${style.bg} ${style.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} aria-hidden />
      {style.label}
    </span>
  );
}
