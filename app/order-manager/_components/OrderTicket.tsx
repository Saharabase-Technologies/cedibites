'use client';

import { memo } from 'react';
import {
  BicycleIcon,
  CheckIcon,
  ForkKnifeIcon,
  NoteIcon,
  PackageIcon,
  PrinterIcon,
  StorefrontIcon,
} from '@phosphor-icons/react';
import type { Order, FulfillmentType } from '@/types/order';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';
import {
  STAGE,
  URGENCY_TEXT,
  formatElapsed,
  urgencyFor,
  type BoardStage,
} from './board.constants';
import { useBoardClock } from './useBoardClock';

const FULFILMENT: Record<FulfillmentType, { icon: React.ElementType; label: string }> = {
  dine_in: { icon: ForkKnifeIcon, label: 'Dine In' },
  takeaway: { icon: PackageIcon, label: 'Takeaway' },
  delivery: { icon: BicycleIcon, label: 'Delivery' },
  pickup: { icon: StorefrontIcon, label: 'Pickup' },
};

/** Lines shown on the ticket before it collapses into a "+N more". */
const ITEM_PREVIEW_LIMIT = 5;

// ─── Age ─────────────────────────────────────────────────────────────────────

/**
 * Two clocks, because they answer different questions.
 *
 * Isolated so the shared clock's once-a-second tick re-renders this span and
 * nothing else — the ticket around it is memoised and stays put.
 *
 * The large one is time in the current stage — how long this has been cooking —
 * and it is what the SLA and the alarm are judged on. The small one is the
 * order's total age, which is what the customer is experiencing.
 *
 * They used to be the same number, and that was wrong: a ticket accepted twelve
 * minutes ago and then moved to cooking still read "cooking for 12 minutes"
 * because nothing reset the clock on a stage change.
 *
 * The total is only shown once the order has actually moved. On a new ticket
 * the two are identical, and printing the same figure twice is noise.
 */
function TicketAge({
  since,
  placedAt,
  stage,
}: {
  since: number;
  placedAt: number;
  stage: BoardStage;
}) {
  const now = useBoardClock();
  // Before hydration the shared clock reports 0; render the ticket's own
  // baseline rather than a nonsense age.
  const elapsedS = now === 0 ? 0 : Math.max(0, (now - since) / 1000);
  const totalS = now === 0 ? 0 : Math.max(0, (now - placedAt) / 1000);
  const urgency = urgencyFor(stage, elapsedS);

  // A couple of seconds of slack: the stage clock and the placed time are
  // written by different statements and are never byte-identical.
  const hasMoved = totalS - elapsedS > 2;

  return (
    <span className="flex flex-col items-end leading-tight">
      <span className={`font-body tabular-nums text-sm ${URGENCY_TEXT[urgency]}`}>
        {formatElapsed(elapsedS)}
      </span>
      {hasMoved && (
        <span
          className="font-body tabular-nums text-[10px] text-neutral-gray"
          title="Total time since the order was placed"
        >
          {formatElapsed(totalS)} total
        </span>
      )}
    </span>
  );
}

/**
 * The overstay outline, as its own clock subscriber.
 *
 * It has to live in a child rather than on the ticket's own className: urgency
 * changes with the clock, and putting a time-derived class on the memoised
 * ticket would re-render every card every second — the exact cost the memo is
 * there to avoid. An inset overlay draws the same outline for free.
 */
function UrgencyOutline({ since, stage }: { since: number; stage: BoardStage }) {
  const now = useBoardClock();
  const elapsedS = now === 0 ? 0 : Math.max(0, (now - since) / 1000);
  const urgency = urgencyFor(stage, elapsedS);
  if (urgency === 'calm') return null;

  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-0 rounded-xl border-2 ${
        urgency === 'late' ? 'border-[#c05252]' : 'border-[#e0a33c]'
      }`}
    />
  );
}

// ─── Ticket ──────────────────────────────────────────────────────────────────

export interface OrderTicketProps {
  order: Order;
  stage: BoardStage;
  /** When this order entered its current stage. Falls back to `placedAt`. */
  stageSince: number;
  isSelected: boolean;
  /** A write is in flight — the ticket is busy and refuses further taps. */
  isBusy: boolean;
  /** The board is inside the post-action lock window. Actions are inert. */
  isLocked: boolean;
  /**
   * Whether this order's receipt already exists on paper.
   *
   * Not read off `order.receiptPrintCount` directly, because the board is
   * polled: between the tap and the next poll landing the count is still zero,
   * and the button would sit there inviting a second original. The page ORs the
   * server's count with what this session has printed.
   */
  isPrinted: boolean;
  onSelect: (order: Order) => void;
  onAdvance: (order: Order) => void;
  onPrint: (order: Order) => void;
}

function OrderTicketBase({
  order,
  stage,
  stageSince,
  isSelected,
  isBusy,
  isLocked,
  isPrinted,
  onSelect,
  onAdvance,
  onPrint,
}: OrderTicketProps) {
  const tone = STAGE[stage];
  const fulfilment = FULFILMENT[order.fulfillmentType] ?? FULFILMENT.takeaway;
  const FulfilmentIcon = fulfilment.icon;
  const visibleItems = order.items.slice(0, ITEM_PREVIEW_LIMIT);
  const hiddenCount = order.items.length - visibleItems.length;
  const itemCount = order.items.reduce((n, item) => n + item.quantity, 0);

  // Actions are dead while a write is in flight on this ticket, and while the
  // board is in its post-action lock. `isLocked` is what stops the second tap
  // of an impatient double-tap from landing on whatever slid into this slot.
  const actionsDisabled = isBusy || isLocked;

  return (
    <article
      onClick={() => onSelect(order)}
      className={`
        group relative flex flex-col overflow-hidden rounded-xl bg-neutral-card
        border border-[#f0e8d8] select-none cursor-pointer
        touch-manipulation
        transition-[box-shadow,opacity] duration-150
        ${isSelected ? 'ring-2 ring-primary' : ''}
        ${isBusy ? 'opacity-60' : 'shadow-[0_1px_2px_rgba(29,26,22,0.05)]'}
      `}
    >
      {!isSelected && <UrgencyOutline since={stageSince} stage={stage} />}

      <div className="flex flex-col gap-2.5 p-3">

        {/* Number, type, age */}
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-brand text-xl font-bold leading-none text-text-dark tabular-nums">
              {order.orderNumber}
            </p>
            {order.contact.name ? (
              <p className="mt-1 truncate font-body text-sm text-text-dark">{order.contact.name}</p>
            ) : (
              <p className="mt-1 font-body text-sm italic text-neutral-gray">Walk-in</p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            <TicketAge since={stageSince} placedAt={order.placedAt} stage={stage} />
            <span className="flex items-center gap-1 font-body text-[11px] text-neutral-gray">
              <FulfilmentIcon className="h-3.5 w-3.5" />
              {fulfilment.label}
            </span>
          </div>
        </header>

        {/* Items — the reason the screen exists */}
        <ul className="flex flex-col gap-1">
          {visibleItems.map((item) => {
            // A drink on an otherwise hot ticket. The line stays — it is part of
            // the order and has to be handed over — but it is dimmed so the
            // kitchen's eye goes to what actually needs a pan.
            const noPrep = item.requiresPreparation === false;
            return (
              <li key={item.id} className="flex gap-2 font-body text-sm leading-snug">
                <span
                  className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded font-bold text-[11px] tabular-nums ${
                    noPrep ? 'bg-neutral-light/60 text-neutral-gray' : 'bg-neutral-light text-text-dark'
                  }`}
                >
                  {item.quantity}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={noPrep ? 'text-neutral-gray' : 'text-text-dark'}>
                    {getOrderItemLineLabel(item)}
                  </span>
                  {noPrep && (
                    <span className="ml-1.5 rounded bg-neutral-light px-1 py-0.5 align-[1px] text-[10px] font-semibold text-neutral-gray">
                      no prep
                    </span>
                  )}
                  {item.notes && (
                    <span className="mt-0.5 block text-[11px] font-medium text-[#8a4b2c]">
                      {item.notes}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
          {hiddenCount > 0 && (
            <li className="pl-7 font-body text-xs text-neutral-gray">+{hiddenCount} more</li>
          )}
        </ul>

        {/* Order note */}
        {order.contact.notes && (
          <p className="flex gap-1.5 rounded-lg bg-[#fdf3e2] px-2 py-1.5 font-body text-[11px] leading-snug text-[#8a5a12]">
            <NoteIcon weight="fill" className="mt-px h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0">{order.contact.notes}</span>
          </p>
        )}

        {/* Action */}
        {tone.actionLabel ? (
          <div className="flex gap-2">
            {/* The receipt is printed here and nowhere else. This is the first
                and only original — the POS confirmation no longer offers a
                print, and /pos/orders will only ever reissue a copy of what
                this button produced.

                Never in New. A receipt is a promise that the branch has the
                order and the customer can be told a time, and in New neither is
                true yet: nobody has looked at the ticket. Handing over a slip
                for an order that is then rejected, or that sits unseen through
                a rush, is worse than handing over nothing. Accept is the one
                thing that ticket is for, and the printer appears the moment it
                is pressed.

                It disappears again the moment the slip exists rather than going
                quiet, so the button's presence is the answer to "does this
                order still owe a receipt": a column with no printers in it is
                a column with nothing left to print. A second copy is a reprint
                by definition, and reprints live at /pos/orders. */}
            {!isPrinted && stage !== 'received' && (
              <button
                type="button"
                disabled={actionsDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onPrint(order);
                }}
                aria-label="Print receipt"
                title="Print the receipt"
                className="
                  flex h-14 w-14 shrink-0 items-center justify-center rounded-lg
                  border border-primary/40 bg-primary/10 text-[#8a5a12]
                  touch-manipulation transition-transform duration-100
                  active:scale-[0.97] disabled:opacity-50
                "
              >
                <PrinterIcon weight="fill" className="h-6 w-6" />
              </button>
            )}

            <button
              type="button"
              disabled={actionsDisabled}
              onClick={(e) => {
                e.stopPropagation();
                onAdvance(order);
              }}
              className={`
                flex h-14 flex-1 items-center justify-center gap-2 rounded-lg
                font-body text-base font-bold touch-manipulation
                transition-transform duration-100 active:scale-[0.97]
                disabled:opacity-50
                ${tone.action}
              `}
            >
              {isBusy ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <CheckIcon weight="bold" className="h-5 w-5" />
              )}
              {tone.actionLabel}
            </button>
          </div>
        ) : null}

        {/* Item count, quiet footer */}
        <p className="font-body text-[11px] text-neutral-gray">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </p>
      </div>
    </article>
  );
}

/**
 * Memoised on the fields the ticket actually draws.
 *
 * The old card was re-rendered on every one of the ~68 refetches a minute the
 * board used to make, because each response produced brand-new order objects
 * and the card had no memo at all. Comparing the drawn fields means a poll that
 * changes nothing costs nothing.
 *
 * The item list has to be compared by value, not by reference: every response
 * runs through `apiOrderToUnifiedOrder`, so `items` is a fresh array each time
 * even when not one thing about the order has changed. A reference check here
 * would quietly defeat the entire memo.
 */
function sameItems(a: Order['items'], b: Order['items']): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.quantity !== y.quantity ||
      x.name !== y.name ||
      x.sizeLabel !== y.sizeLabel ||
      x.notes !== y.notes ||
      x.requiresPreparation !== y.requiresPreparation
    ) {
      return false;
    }
  }
  return true;
}

export const OrderTicket = memo(OrderTicketBase, (a, b) => {
  const x = a.order;
  const y = b.order;
  return (
    x.id === y.id &&
    x.status === y.status &&
    x.orderNumber === y.orderNumber &&
    x.contact.name === y.contact.name &&
    x.contact.notes === y.contact.notes &&
    x.cancelRequestReason === y.cancelRequestReason &&
    x.fulfillmentType === y.fulfillmentType &&
    a.stage === b.stage &&
    a.stageSince === b.stageSince &&
    a.isSelected === b.isSelected &&
    a.isBusy === b.isBusy &&
    a.isLocked === b.isLocked &&
    a.isPrinted === b.isPrinted &&
    sameItems(x.items, y.items)
  );
});
