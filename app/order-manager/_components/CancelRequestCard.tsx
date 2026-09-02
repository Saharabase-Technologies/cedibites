'use client';

import { memo } from 'react';
import { ProhibitIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react';
import type { Order } from '@/types/order';
import { formatElapsed } from './board.constants';
import { useBoardClock } from './useBoardClock';

/**
 * A cancel request, as a small card that sits beside its neighbours.
 *
 * Two things were wrong with the original. It rendered the full `OrderTicket` —
 * reason, every item line, the order note, a 56px action row — so one request
 * cost about 290px of height and pushed all four columns most of the way off a
 * laptop screen. Then the first fix made it a full-width bar, which cured the
 * height of one request and not of five: stacked, they simply became five rows
 * and the board was pushed down again.
 *
 * So the card is deliberately narrow and the band lays them out in a line. Five
 * requests cost the same vertical space as one — the band grows sideways and
 * scrolls, the way the columns below it already do.
 *
 * What survives the trim is what the decision actually needs: who, how long,
 * and why. Everything else lives where every other order keeps it, in the side
 * sheet a tap away.
 */

/** Isolated so the shared clock's tick repaints this span and nothing else. */
function RequestAge({ since }: { since: number }) {
  const now = useBoardClock();
  // Before hydration the shared clock reports 0; show the baseline rather than
  // an age computed against it.
  const elapsedS = now === 0 ? 0 : Math.max(0, (now - since) / 1000);
  return (
    <span className="shrink-0 font-body text-sm font-bold tabular-nums text-[#8a3333]">
      {formatElapsed(elapsedS)}
    </span>
  );
}

export interface CancelRequestCardProps {
  order: Order;
  /** When the request landed. Falls back to `placedAt`. */
  since: number;
  isSelected: boolean;
  /** A write is in flight — the card is busy and refuses further taps. */
  isBusy: boolean;
  /** The board is inside the post-action lock window. Actions are inert. */
  isLocked: boolean;
  /** Only a manager may settle a request. Everyone else sees who they are waiting on. */
  isAdmin: boolean;
  onSelect: (order: Order) => void;
  onApproveCancel: (order: Order) => void;
  onRejectCancel: (order: Order) => void;
}

function CancelRequestCardBase({
  order,
  since,
  isSelected,
  isBusy,
  isLocked,
  isAdmin,
  onSelect,
  onApproveCancel,
  onRejectCancel,
}: CancelRequestCardProps) {
  const actionsDisabled = isBusy || isLocked;

  return (
    <div
      onClick={() => onSelect(order)}
      className={`
        flex w-[19rem] shrink-0 cursor-pointer touch-manipulation select-none
        flex-col gap-1.5 rounded-xl border border-[#e6c9c9] bg-neutral-card px-3 py-2
        transition-[box-shadow,opacity] duration-150
        ${isSelected ? 'ring-2 ring-[#c05252]' : ''}
        ${isBusy ? 'opacity-60' : ''}
      `}
    >
      {/* Who, and how long they have been waiting on an answer. The number is
          what gets called across a kitchen, so it leads. */}
      <div className="flex items-baseline gap-2">
        <span className="font-brand text-base font-bold leading-none text-text-dark tabular-nums">
          {order.orderNumber}
        </span>
        <span className="min-w-0 flex-1 truncate font-body text-xs text-neutral-gray">
          {order.contact.name || 'Walk-in'}
        </span>
        <RequestAge since={since} />
      </div>

      {/* Why — the one detail that decides the answer, so it earns its line.
          Truncated rather than wrapped: a long reason must not be able to make
          one card taller than the rest of the line. The full text, the items
          and the note are one tap away in the side sheet, the same place the
          rest of the board keeps them. */}
      <span className="flex items-center gap-1.5 font-body text-xs text-[#8a3333]">
        <WarningCircleIcon weight="fill" className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{order.cancelRequestReason ?? 'Cancellation requested'}</span>
      </span>

      {isAdmin ? (
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={actionsDisabled}
            onClick={(e) => {
              e.stopPropagation();
              onRejectCancel(order);
            }}
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#e3ddd0] bg-neutral-light font-body text-sm font-semibold text-text-dark transition-transform touch-manipulation active:scale-[0.97] disabled:opacity-50"
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
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#c05252] font-body text-sm font-semibold text-white transition-transform touch-manipulation hover:bg-[#a94545] active:scale-[0.97] disabled:opacity-50"
          >
            <ProhibitIcon weight="bold" className="h-4 w-4" />
            Cancel it
          </button>
        </div>
      ) : (
        <span className="rounded-lg bg-[#f9ecec] py-1.5 text-center font-body text-xs font-semibold text-[#8a3333]">
          Waiting for a manager
        </span>
      )}
    </div>
  );
}

/**
 * Memoised on what the card draws, for the same reason the ticket is: the board
 * polls, and every response rebuilds the order objects even when nothing about
 * them has changed. The items are not compared at all — the card shows neither
 * the lines nor a count, so nothing about them can alter what is on screen.
 */
export const CancelRequestCard = memo(CancelRequestCardBase, (a, b) => {
  const x = a.order;
  const y = b.order;
  return (
    x.id === y.id &&
    x.orderNumber === y.orderNumber &&
    x.contact.name === y.contact.name &&
    x.cancelRequestReason === y.cancelRequestReason &&
    a.since === b.since &&
    a.isSelected === b.isSelected &&
    a.isBusy === b.isBusy &&
    a.isLocked === b.isLocked &&
    a.isAdmin === b.isAdmin
  );
});
