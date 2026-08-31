'use client';

import { TONE, type StatusTone } from '@/app/inventory/_components/status-tokens';
import type { OrderStatus } from '@/types/order';

/**
 * An order's status, in the inventory portal's badge language.
 *
 * The POS had its own palette for these — saturated blues and oranges tuned
 * for a white page, which read cold beside the gold on our cream surface. The
 * tones here are the same set every other status in the system uses, so a
 * cashier reading "waiting on someone" learns it once.
 */
const STATUS_STYLES: Record<OrderStatus, { label: string } & StatusTone> = {
  received:         { label: 'New',          ...TONE.waiting },
  accepted:         { label: 'Accepted',     ...TONE.decided },
  preparing:        { label: 'Preparing',    ...TONE.moving },
  ready:            { label: 'Ready',        ...TONE.partial },
  ready_for_pickup: { label: 'Ready',        ...TONE.partial },
  out_for_delivery: { label: 'On the way',   ...TONE.moving },
  delivered:        { label: 'Delivered',    ...TONE.done },
  completed:        { label: 'Completed',    ...TONE.done },
  cancel_requested: { label: 'Cancel asked', ...TONE.waiting },
  cancelled:        { label: 'Cancelled',    ...TONE.problem },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.received;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-body whitespace-nowrap ${style.bg} ${style.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} aria-hidden />
      {style.label}
    </span>
  );
}
