'use client';

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
 * Each waiting order gets its own card, stacked. They were collapsed into one
 * card with "3 more waiting" underneath, which hid the very thing the cashier
 * needs to act on: three separate orders, three separate customers, three
 * separate things to start. A count is not a queue.
 *
 * Cards stay until somebody deals with them. A toast that fades after five
 * seconds is no use on a screen that spends minutes at a time with nobody in
 * front of it, and the failure this guards against — an order sitting
 * unclaimed — takes longer than five seconds to become visible any other way.
 *
 * Top right, and not a modal. A modal would take the screen away from whoever
 * is mid-sale at the till, which is the one thing an incoming order must never
 * do: the customer at the counter comes first. Offset down by the height of the
 * till header, because pinned to the corner proper it covers the Orders,
 * pending-payments and sign-out buttons — the controls a cashier reaches for on
 * seeing it.
 */

/**
 * How many cards are shown before the rest collapse into a count.
 *
 * Three is about what fits above the fold on a till without the stack becoming
 * the screen. Past that, the specific orders matter less than the fact that
 * there is a backlog, and the honest move is to send someone to the list.
 */
const MAX_VISIBLE = 3;

export function OnlineOrderBanner() {
  const router = useRouter();
  const { session } = usePOS();

  const { arrivals, dismiss, dismissAll, isBlocked, test } = useOnlineOrderArrivals(
    session?.branchId ?? null,
  );

  if (arrivals.length === 0) return null;

  const visible = arrivals.slice(0, MAX_VISIBLE);
  const hidden = arrivals.length - visible.length;

  const openOrders = () => {
    dismissAll();
    router.push('/pos/orders?channel=remote');
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-18 left-4 right-4 sm:left-auto sm:w-92 z-60 flex flex-col gap-2"
    >
      {visible.map((order) => (
        <ArrivalCard
          key={order.id}
          order={order}
          onOpen={openOrders}
          onDismiss={() => dismiss(order.id)}
        />
      ))}

      {(hidden > 0 || arrivals.length > 1 || isBlocked) && (
        <div className="rounded-2xl bg-white border border-neutral-gray/20 shadow-lg shadow-black/5 px-3.5 py-2.5 flex items-center justify-between gap-3 pos-arrival-in">
          {hidden > 0 ? (
            <button
              type="button"
              onClick={openOrders}
              className="flex items-center gap-1 text-sm font-semibold text-text-dark hover:text-primary transition-colors"
            >
              {hidden} more waiting
              <CaretRightIcon size={12} weight="bold" />
            </button>
          ) : (
            <span className="text-xs text-neutral-gray">
              {arrivals.length} waiting
            </span>
          )}

          <div className="flex items-center gap-3">
            {isBlocked && (
              <button
                type="button"
                onClick={test}
                title="Sound is off — tap to turn it on"
                className="flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:text-amber-800"
              >
                <SpeakerSlashIcon size={14} />
                Sound off
              </button>
            )}
            <button
              type="button"
              onClick={dismissAll}
              className="text-xs font-medium text-neutral-gray hover:text-text-dark transition-colors"
            >
              Dismiss all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ArrivalCard({
  order,
  onOpen,
  onDismiss,
}: {
  order: Order;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const contactName = order.contact.name && order.contact.name !== 'Walk-in'
    ? order.contact.name
    : null;

  return (
    <div className="rounded-2xl bg-white border border-neutral-gray/20 shadow-xl shadow-black/10 pos-arrival-in overflow-hidden">
      <div className="flex items-start gap-2 p-3.5">
        {/* The whole body opens the list — a stack of cards each carrying its
            own pair of buttons is a wall of buttons, not a queue. */}
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 min-w-0 text-left cursor-pointer group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <BellRingingIcon weight="fill" size={16} className="text-primary shrink-0" />
            <p className="text-sm font-semibold text-text-dark truncate group-hover:text-primary transition-colors">
              New {SOURCE_LABEL[order.source] ?? 'online'} order
            </p>
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
        </button>

        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Dismiss order ${order.orderNumber}`}
          className="shrink-0 w-8 h-8 -mt-0.5 -mr-1 rounded-lg flex items-center justify-center text-neutral-gray hover:text-text-dark hover:bg-neutral-gray/10 transition-colors"
        >
          <XIcon size={16} />
        </button>
      </div>
    </div>
  );
}
