'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BellRingingIcon,
  CaretRightIcon,
  SpeakerSlashIcon,
  XIcon,
} from '@phosphor-icons/react';

import { usePOS } from '../context';
import { useOnlineOrderArrivals } from '../hooks/useOnlineOrderArrivals';
import { formatGHS } from '@/lib/utils/currency';
import { FULFILLMENT_LABELS, SOURCE_LABEL } from '@/lib/constants/order.constants';
import type { Order } from '@/types/order';

/**
 * The counter's announcement for orders it did not take.
 *
 * Lives in the POS shell rather than on the orders page, because the cashier is
 * almost never looking at the orders page — they are mid-sale on the terminal,
 * which is exactly when an online order is most likely to be missed.
 *
 * Each waiting order gets its own card, stacked, each with its own View and
 * Dismiss. They were collapsed into one card with "3 more waiting" underneath,
 * which hid the very thing the cashier needs to act on: three separate orders,
 * three separate customers, three separate things to start. A count is not a
 * queue.
 *
 * The rest of the screen dims behind them. This is the one interruption at the
 * till that is allowed to take the room — somebody is waiting on food nobody
 * has started — and a card in the corner of a busy screen is easy to walk past.
 * It is not a trap: clicking the dimmed area or pressing Escape clears the lot,
 * and the orders are still in the Online tab afterwards. Dismissing hides a
 * notice, it never loses an order.
 *
 * Cards stay until somebody deals with them. A toast that fades after five
 * seconds is no use on a screen that spends minutes at a time with nobody in
 * front of it, and the failure this guards against — an order sitting
 * unclaimed — takes longer than five seconds to become visible any other way.
 */

/**
 * How many cards are shown before the rest collapse into a count.
 *
 * Three is about what fits on a till without the stack becoming the screen.
 * Past that, the specific orders matter less than the fact that there is a
 * backlog, and the honest move is to send someone to the list.
 */
const MAX_VISIBLE = 3;

export function OnlineOrderBanner() {
  const router = useRouter();
  const { session } = usePOS();

  const { arrivals, dismiss, dismissAll, isBlocked, test } = useOnlineOrderArrivals(
    session?.branchId ?? null,
  );

  const hasArrivals = arrivals.length > 0;

  // Escape clears the stack. Declared above the early return, because a hook
  // cannot hide behind one.
  useEffect(() => {
    if (!hasArrivals) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissAll();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasArrivals, dismissAll]);

  if (!hasArrivals) return null;

  const visible = arrivals.slice(0, MAX_VISIBLE);
  const hidden = arrivals.length - visible.length;

  const openOrders = () => {
    dismissAll();
    router.push('/pos/orders?channel=remote');
  };

  return (
    <>
      {/* Dim, not block. Clicking here clears the notices. */}
      <div
        onClick={dismissAll}
        aria-hidden
        className="fixed inset-0 z-50 bg-black/50 pos-scrim-in"
      />

      <div
        role="status"
        aria-live="polite"
        className="fixed top-18 left-4 right-4 sm:left-auto sm:w-96 z-60 flex flex-col gap-2"
      >
        {visible.map((order) => (
          <ArrivalCard
            key={order.id}
            order={order}
            onView={openOrders}
            onDismiss={() => dismiss(order.id)}
          />
        ))}

        {(hidden > 0 || isBlocked) && (
          <div className="rounded-2xl bg-white border border-neutral-gray/20 shadow-lg shadow-black/5 px-3.5 py-2.5 flex items-center justify-between gap-3 pos-arrival-in">
            {hidden > 0 ? (
              <button
                type="button"
                onClick={openOrders}
                className="flex items-center gap-1 text-sm font-semibold text-text-dark hover:text-primary transition-colors cursor-pointer"
              >
                {hidden} more waiting
                <CaretRightIcon size={12} weight="bold" />
              </button>
            ) : (
              <span />
            )}

            {isBlocked && (
              <button
                type="button"
                onClick={test}
                title="Sound is off — tap to turn it on"
                className="flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:text-amber-800 cursor-pointer"
              >
                <SpeakerSlashIcon size={14} />
                Sound off
              </button>
            )}
          </div>
        )}

        {arrivals.length > 1 && (
          <button
            type="button"
            onClick={dismissAll}
            className="self-end text-xs font-semibold text-white/90 hover:text-white transition-colors cursor-pointer px-1 py-1"
          >
            Dismiss all
          </button>
        )}
      </div>
    </>
  );
}

function ArrivalCard({
  order,
  onView,
  onDismiss,
}: {
  order: Order;
  onView: () => void;
  onDismiss: () => void;
}) {
  const contactName = order.contact.name && order.contact.name !== 'Walk-in'
    ? order.contact.name
    : null;

  return (
    <div className="rounded-2xl bg-white border border-neutral-gray/20 shadow-xl shadow-black/20 p-3.5 pos-arrival-in">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BellRingingIcon weight="fill" size={16} className="text-primary shrink-0" />
          <p className="text-sm font-semibold text-text-dark truncate">
            New {SOURCE_LABEL[order.source] ?? 'online'} order
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Dismiss order ${order.orderNumber}`}
          className="shrink-0 w-7 h-7 -mt-0.5 -mr-1 rounded-lg flex items-center justify-center text-neutral-gray hover:text-text-dark hover:bg-neutral-gray/10 transition-colors cursor-pointer"
        >
          <XIcon size={16} />
        </button>
      </div>

      <p className="mt-1.5 text-sm text-text-dark">
        <span className="font-mono font-bold">#{order.orderNumber}</span>
        <span className="text-neutral-gray"> · </span>
        <span className="font-semibold text-primary">{formatGHS(order.total)}</span>
        <span className="text-neutral-gray"> · {FULFILLMENT_LABELS[order.fulfillmentType]}</span>
      </p>

      {contactName && (
        <p className="text-xs text-neutral-gray mt-0.5 truncate">
          {contactName}
          {order.contact.phone && <span className="opacity-70"> · {order.contact.phone}</span>}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onView}
          className="flex-1 h-10 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition cursor-pointer"
        >
          View
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="h-10 px-4 rounded-xl border border-neutral-gray/25 text-sm font-medium text-neutral-gray hover:text-text-dark hover:border-neutral-gray/50 transition-colors cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
