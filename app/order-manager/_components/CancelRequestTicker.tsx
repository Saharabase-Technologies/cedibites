'use client';

import { memo } from 'react';
import { CaretRightIcon, ProhibitIcon, XIcon } from '@phosphor-icons/react';
import type { Order } from '@/types/order';

/**
 * Cancel requests as one line of order numbers.
 *
 * The band of cards below this file solved the wrong half of the problem. A
 * request is settled by an admin, and admins are rarely on this screen, so the
 * cards sit for hours: the two on the board when this was written had been
 * waiting 21 and 19 hours. All that time the band costs about 150px of height,
 * and it is paid by the kitchen and the cashier, who cannot settle a request
 * anyway.
 *
 * So the resting state is a ticker. Order numbers, nothing else, on one line.
 * The kitchen still sees that AH528 is in effect cancelled, which is the thing
 * they must not miss, and the reason and the two buttons move a tap away.
 *
 * Ages are deliberately absent. The alert bar directly above already names the
 * oldest request and how long it has waited, and repeating that on every chip
 * would double the width of the line to say what is already on screen.
 */

export interface CancelRequestTickerProps {
  orders: Order[];
  selectedId: string | null;
  /** Opens the full cards, the same panel the header icon opens. */
  onExpand: () => void;
  onSelect: (order: Order) => void;
  onDismiss: () => void;
}

function CancelRequestTickerBase({
  orders,
  selectedId,
  onExpand,
  onSelect,
  onDismiss,
}: CancelRequestTickerProps) {
  return (
    <section className="flex shrink-0 items-center gap-2 border-b border-[#f0e8d8] bg-[#f9ecec]/60 py-1.5 pl-3 pr-1.5">
      {/* The label is what makes a row of bare order numbers legible. It does
          not repeat on the chips, and it does not scroll away with them. */}
      <button
        type="button"
        onClick={onExpand}
        title="Open the cancel requests"
        className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg pr-1 font-brand text-xs font-bold uppercase tracking-wide text-[#8a3333] transition-opacity touch-manipulation hover:opacity-70"
      >
        <ProhibitIcon weight="fill" className="h-4 w-4" />
        <span className="hidden sm:inline">Cancel requests</span>
        <span className="tabular-nums">({orders.length})</span>
        <CaretRightIcon weight="bold" className="h-3 w-3" />
      </button>

      {/* Only this part scrolls. The label and the close button stay put, so a
          busy night cannot push the way out of the strip off the screen. */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
        {orders.map((order) => (
          <button
            key={order.id}
            type="button"
            onClick={() => onSelect(order)}
            title={order.cancelRequestReason ?? 'Cancellation requested'}
            className={`
              flex min-h-11 shrink-0 items-center rounded-full border border-[#e6c9c9] bg-neutral-card px-3.5
              font-body text-sm font-bold tabular-nums text-[#8a3333]
              transition-colors touch-manipulation hover:border-[#c05252]
              ${selectedId === order.id ? 'border-[#c05252] bg-[#f4dede]' : ''}
            `}
          >
            {order.orderNumber}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        title="Hide these. The icon in the header brings them back."
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#8a3333] transition-colors touch-manipulation hover:bg-[#f4dede]"
      >
        <XIcon weight="bold" className="h-4 w-4" />
      </button>
    </section>
  );
}

/**
 * Memoised on the numbers it draws. The board polls every few seconds and
 * rebuilds every order object, so without this the strip repaints on every
 * response to render the identical line.
 */
export const CancelRequestTicker = memo(CancelRequestTickerBase, (a, b) => {
  if (a.selectedId !== b.selectedId) return false;
  if (a.orders.length !== b.orders.length) return false;
  return a.orders.every((order, i) => order.id === b.orders[i].id);
});
