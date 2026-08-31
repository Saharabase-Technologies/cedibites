'use client';

import { useRouter } from 'next/navigation';
import {
  BellRingingIcon,
  SpeakerSlashIcon,
  XIcon,
} from '@phosphor-icons/react';

import { usePOS } from '../context';
import { useOnlineOrderArrivals } from '../hooks/useOnlineOrderArrivals';
import { formatGHS } from '@/lib/utils/currency';
import { FULFILLMENT_LABELS, SOURCE_LABEL } from '@/lib/constants/order.constants';

/**
 * The counter's announcement for orders it did not take.
 *
 * Lives in the POS shell rather than on the orders page, because the cashier is
 * almost never looking at the orders page — they are mid-sale on the terminal,
 * which is exactly when an online order is most likely to be missed.
 *
 * It stays until somebody deals with it. A toast that fades after five seconds
 * is no use on a screen that spends minutes at a time with nobody in front of
 * it, and the failure it is guarding against — an order sitting unclaimed —
 * takes longer than five seconds to become visible any other way.
 *
 * Top right, and not a modal. A modal would take the screen away from whoever
 * is mid-sale at the till, which is the one thing an incoming order must never
 * do: the customer at the counter comes first.
 *
 * Offset down by the height of the till header rather than pinned to the very
 * corner. At `top-4` the card sits squarely over the Orders, pending-payments
 * and sign-out buttons — so the one control a cashier reaches for on seeing it
 * is the one it covers.
 */
export function OnlineOrderBanner() {
  const router = useRouter();
  const { session } = usePOS();

  const { arrivals, dismiss, dismissAll, isBlocked, test } = useOnlineOrderArrivals(
    session?.branchId ?? null,
  );

  if (arrivals.length === 0) return null;

  const [newest, ...rest] = arrivals;
  const contactName = newest.contact.name && newest.contact.name !== 'Walk-in'
    ? newest.contact.name
    : null;

  const openOrders = () => {
    dismissAll();
    router.push('/pos/orders?channel=remote');
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-[4.5rem] left-4 right-4 sm:left-auto sm:w-[23rem] z-[60] pos-arrival-in"
    >
      <div className="rounded-2xl bg-white border border-neutral-gray/20 shadow-xl shadow-black/10 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <BellRingingIcon weight="fill" className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm font-semibold text-text-dark truncate">
              New {SOURCE_LABEL[newest.source] ?? 'online'} order
            </p>
          </div>
          <button
            type="button"
            onClick={() => dismiss(newest.id)}
            aria-label="Dismiss"
            className="shrink-0 w-7 h-7 -mt-0.5 -mr-1 rounded-lg flex items-center justify-center text-neutral-gray hover:text-text-dark hover:bg-neutral-gray/10 transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-1.5 text-sm text-text-dark">
          <span className="font-mono font-bold">#{newest.orderNumber}</span>
          <span className="text-neutral-gray"> · </span>
          <span className="font-semibold text-primary">{formatGHS(newest.total)}</span>
          <span className="text-neutral-gray"> · {FULFILLMENT_LABELS[newest.fulfillmentType]}</span>
        </p>

        {contactName && (
          <p className="text-xs text-neutral-gray mt-0.5 truncate">
            {contactName}
            {newest.contact.phone && <span className="opacity-70"> · {newest.contact.phone}</span>}
          </p>
        )}

        {rest.length > 0 && (
          <p className="text-xs text-neutral-gray mt-1.5">
            {rest.length} more waiting
          </p>
        )}

        {isBlocked && (
          <button
            type="button"
            onClick={test}
            className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-amber-700 hover:text-amber-800"
          >
            <SpeakerSlashIcon className="w-3.5 h-3.5" />
            Sound is off — tap to turn it on
          </button>
        )}

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={openOrders}
            className="flex-1 h-10 rounded-xl bg-primary text-brown text-sm font-semibold hover:brightness-95 active:scale-[0.98] transition"
          >
            View
          </button>
          <button
            type="button"
            onClick={dismissAll}
            className="h-10 px-4 rounded-xl border border-neutral-gray/25 text-sm font-medium text-neutral-gray hover:text-text-dark hover:border-neutral-gray/50 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
