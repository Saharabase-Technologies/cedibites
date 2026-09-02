'use client';

import { memo } from 'react';
import { ProhibitIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react';
import type { Order } from '@/types/order';
import { formatElapsed } from './board.constants';
import { useBoardClock } from './useBoardClock';

/**
 * A cancel request, as a bar rather than a ticket.
 *
 * It used to render the full `OrderTicket` — reason, every item line, the order
 * note, a 56px action row — in a band above the board. One request cost about
 * 290px of height, which on a laptop pushed all four columns most of the way
 * off the screen: the board reported "1 live" and showed nothing but empty
 * columns, because the only thing to look at had been shoved below the fold.
 *
 * So this carries only what the decision actually needs — who, how long, and
 * why — and the detail lives where every other order's detail lives, in the
 * side sheet a tap away. Rare and urgent still, but no longer the largest thing
 * on the screen.
 */

/** Isolated so the shared clock's tick repaints this span and nothing else. */
function RequestAge({ since }: { since: number }) {
  const now = useBoardClock();
  // Before hydration the shared clock reports 0; show the baseline rather than
  // an age computed against it.
  const elapsedS = now === 0 ? 0 : Math.max(0, (now - since) / 1000);
  return (
    <span className="font-body text-sm font-bold tabular-nums text-[#8a3333]">
      {formatElapsed(elapsedS)}
    </span>
  );
}

export interface CancelRequestRowProps {
  order: Order;
  /** When the request landed. Falls back to `placedAt`. */
  since: number;
  isSelected: boolean;
  /** A write is in flight — the row is busy and refuses further taps. */
  isBusy: boolean;
  /** The board is inside the post-action lock window. Actions are inert. */
  isLocked: boolean;
  /** Only a manager may settle a request. Everyone else sees who they are waiting on. */
  isAdmin: boolean;
  onSelect: (order: Order) => void;
  onApproveCancel: (order: Order) => void;
  onRejectCancel: (order: Order) => void;
}

function CancelRequestRowBase({
  order,
  since,
  isSelected,
  isBusy,
  isLocked,
  isAdmin,
  onSelect,
  onApproveCancel,
  onRejectCancel,
}: CancelRequestRowProps) {
  const actionsDisabled = isBusy || isLocked;
  const itemCount = order.items.reduce((n, item) => n + item.quantity, 0);

  return (
    <div
      onClick={() => onSelect(order)}
      className={`
        flex w-full cursor-pointer touch-manipulation select-none items-center gap-3
        rounded-xl border border-[#e6c9c9] bg-neutral-card px-3 py-2
        transition-[box-shadow,opacity] duration-150
        ${isSelected ? 'ring-2 ring-[#c05252]' : ''}
        ${isBusy ? 'opacity-60' : ''}
      `}
    >
      {/* Who. The number is what gets called across a kitchen, so it leads. */}
      <div className="flex min-w-0 shrink-0 items-baseline gap-2">
        <span className="font-brand text-lg font-bold leading-none text-text-dark tabular-nums">
          {order.orderNumber}
        </span>
        <span className="truncate font-body text-sm text-neutral-gray">
          {order.contact.name || 'Walk-in'}
        </span>
      </div>

      {/* Why. The one detail that decides the answer, so it stays on the bar. */}
      <span className="flex min-w-0 flex-1 items-center gap-1.5 font-body text-xs text-[#8a3333]">
        <WarningCircleIcon weight="fill" className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{order.cancelRequestReason ?? 'Cancellation requested'}</span>
      </span>

      {/* Everything else — the items, the note, the timeline — is one tap away
          in the side sheet, the same place the rest of the board keeps it. */}
      <span className="hidden shrink-0 font-body text-xs text-neutral-gray tabular-nums sm:inline">
        {itemCount} {itemCount === 1 ? 'item' : 'items'}
      </span>

      <RequestAge since={since} />

      {isAdmin ? (
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={actionsDisabled}
            onClick={(e) => {
              e.stopPropagation();
              onRejectCancel(order);
            }}
            className="flex min-h-11 items-center gap-1.5 rounded-lg border border-[#e3ddd0] bg-neutral-light px-3 font-body text-sm font-semibold text-text-dark transition-transform touch-manipulation active:scale-[0.97] disabled:opacity-50"
          >
            <XIcon weight="bold" className="h-4 w-4" />
            Keep
          </button>
          <button
            type="button"
            disabled={actionsDisabled}
            onClick={(e) => {
              e.stopPropagation();
              onApproveCancel(order);
            }}
            className="flex min-h-11 items-center gap-1.5 rounded-lg bg-[#c05252] px-3 font-body text-sm font-semibold text-white transition-transform touch-manipulation hover:bg-[#a94545] active:scale-[0.97] disabled:opacity-50"
          >
            <ProhibitIcon weight="bold" className="h-4 w-4" />
            Cancel it
          </button>
        </div>
      ) : (
        <span className="shrink-0 rounded-lg bg-[#f9ecec] px-2.5 py-1.5 font-body text-xs font-semibold text-[#8a3333]">
          Waiting for a manager
        </span>
      )}
    </div>
  );
}

/**
 * Memoised on what the bar draws, for the same reason the ticket is: the board
 * polls, and every response rebuilds the order objects even when nothing about
 * them has changed. The item list is compared by count alone — the bar shows
 * the total and nothing else, so a line's name changing cannot alter it.
 */
export const CancelRequestRow = memo(CancelRequestRowBase, (a, b) => {
  const x = a.order;
  const y = b.order;
  return (
    x.id === y.id &&
    x.orderNumber === y.orderNumber &&
    x.contact.name === y.contact.name &&
    x.cancelRequestReason === y.cancelRequestReason &&
    x.items.length === y.items.length &&
    x.items.every((item, i) => item.quantity === y.items[i]?.quantity) &&
    a.since === b.since &&
    a.isSelected === b.isSelected &&
    a.isBusy === b.isBusy &&
    a.isLocked === b.isLocked &&
    a.isAdmin === b.isAdmin
  );
});
