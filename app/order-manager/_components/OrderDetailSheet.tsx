'use client';

import {
  BicycleIcon,
  CheckIcon,
  ForkKnifeIcon,
  PackageIcon,
  PhoneIcon,
  ProhibitIcon,
  StorefrontIcon,
  XIcon,
} from '@phosphor-icons/react';
import type { Order, FulfillmentType } from '@/types/order';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';
import { SOURCE_CONFIG, PAYMENT_LABELS } from '@/lib/constants/order.constants';
import { STAGE, formatElapsed, type BoardStage } from './board.constants';
import { useBoardClock } from './useBoardClock';

const FULFILMENT: Record<FulfillmentType, { icon: React.ElementType; label: string }> = {
  dine_in: { icon: ForkKnifeIcon, label: 'Dine In' },
  takeaway: { icon: PackageIcon, label: 'Takeaway' },
  delivery: { icon: BicycleIcon, label: 'Delivery' },
  pickup: { icon: StorefrontIcon, label: 'Pickup' },
};

function clock(ts: number | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' });
}

function Age({ since }: { since: number }) {
  const now = useBoardClock();
  return <>{formatElapsed(now === 0 ? 0 : Math.max(0, (now - since) / 1000))}</>;
}

/**
 * The full ticket.
 *
 * The card shows what the kitchen needs at a glance; this shows everything else
 * — the whole item list rather than the first five, the phone number, how it
 * was paid for, and where it came in from. On a tablet it is a bottom sheet, on
 * a wall screen a right-hand rail.
 */
export function OrderDetailSheet({
  order,
  stage,
  stageSince,
  isAdmin,
  isBusy,
  onAdvance,
  onApproveCancel,
  onRejectCancel,
  onClose,
}: {
  order: Order;
  stage: BoardStage;
  stageSince: number;
  isAdmin: boolean;
  isBusy: boolean;
  onAdvance: (order: Order) => void;
  onApproveCancel: (order: Order) => void;
  onRejectCancel: (order: Order) => void;
  onClose: () => void;
}) {
  const tone = STAGE[stage];
  const fulfilment = FULFILMENT[order.fulfillmentType] ?? FULFILMENT.takeaway;
  const FulfilmentIcon = fulfilment.icon;
  const source = SOURCE_CONFIG[order.source];
  const SourceIcon = source?.icon ?? StorefrontIcon;
  const isCancelReq = stage === 'cancel_requested';

  return (
    <div className="flex h-full min-h-0 flex-col bg-neutral-card">

      {/* Header */}
      <header className="shrink-0 border-b border-[#f0e8d8] px-4 py-3.5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-brand text-2xl font-bold leading-none text-text-dark tabular-nums">
              {order.orderNumber}
            </p>
            <p className="mt-1.5 font-body text-sm text-text-dark">
              {order.contact.name || 'Walk-in'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-light text-neutral-gray transition-transform touch-manipulation active:scale-95"
          >
            <XIcon size={18} weight="bold" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-lg px-2.5 py-1 font-body text-xs font-bold ${tone.bg} ${tone.text}`}>
            {tone.label}
          </span>
          <span className="flex items-center gap-1.5 rounded-lg bg-neutral-light px-2.5 py-1 font-body text-xs text-text-dark">
            <FulfilmentIcon className="h-3.5 w-3.5" />
            {fulfilment.label}
          </span>
          <span className="flex items-center gap-1.5 rounded-lg bg-neutral-light px-2.5 py-1 font-body text-xs text-text-dark">
            <SourceIcon className="h-3.5 w-3.5" />
            {source?.label ?? 'Online'}
          </span>
          <span className="font-body text-xs tabular-nums text-neutral-gray">
            <Age since={stageSince} /> in {tone.label.toLowerCase()}
          </span>
          <span className="font-body text-xs tabular-nums text-neutral-gray">
            · <Age since={order.placedAt} /> since placed
          </span>
        </div>
      </header>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">

        {isCancelReq && (
          <div className={`mb-4 rounded-xl p-3 ${tone.bg}`}>
            <p className={`font-body text-[11px] font-bold uppercase tracking-wide ${tone.text}`}>
              Cancellation reason
            </p>
            <p className={`mt-1 font-body text-sm ${tone.text}`}>
              {order.cancelRequestReason ?? 'No reason given'}
            </p>
            {order.cancelRequestedBy && (
              <p className={`mt-1.5 font-body text-xs opacity-80 ${tone.text}`}>
                Asked by {order.cancelRequestedBy}
              </p>
            )}
          </div>
        )}

        <h3 className="mb-2 font-body text-[11px] font-bold uppercase tracking-wide text-neutral-gray">
          Items
        </h3>
        <ul className="flex flex-col gap-1.5">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-3 rounded-xl bg-neutral-light p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 font-body text-sm font-bold tabular-nums text-[#8a5a12]">
                {item.quantity}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-body text-sm font-medium text-text-dark">
                  {getOrderItemLineLabel(item)}
                </p>
                {item.notes && (
                  <p className="mt-0.5 font-body text-xs font-medium text-[#8a4b2c]">{item.notes}</p>
                )}
              </div>
            </li>
          ))}
        </ul>

        {order.contact.notes && (
          <>
            <h3 className="mb-2 mt-4 font-body text-[11px] font-bold uppercase tracking-wide text-neutral-gray">
              Note
            </h3>
            <p className="rounded-xl bg-[#fdf3e2] p-3 font-body text-sm text-[#8a5a12]">
              {order.contact.notes}
            </p>
          </>
        )}

        {order.contact.address && (
          <>
            <h3 className="mb-2 mt-4 font-body text-[11px] font-bold uppercase tracking-wide text-neutral-gray">
              Deliver to
            </h3>
            <p className="rounded-xl bg-neutral-light p-3 font-body text-sm text-text-dark">
              {order.contact.address}
            </p>
          </>
        )}

        <h3 className="mb-2 mt-4 font-body text-[11px] font-bold uppercase tracking-wide text-neutral-gray">
          Details
        </h3>
        <dl className="flex flex-col gap-2 border-t border-[#f0e8d8] pt-3 font-body text-sm">
          {order.contact.phone && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-neutral-gray">Phone</dt>
              <dd>
                <a
                  href={`tel:${order.contact.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 font-medium text-text-dark underline decoration-[#e3ddd0] underline-offset-2"
                >
                  <PhoneIcon className="h-3.5 w-3.5" />
                  {order.contact.phone}
                </a>
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <dt className="text-neutral-gray">Payment</dt>
            <dd className="font-medium text-text-dark">
              {PAYMENT_LABELS[order.paymentMethod]?.short ?? order.paymentMethod}
              <span className={order.isPaid ? 'text-[#2f6b45]' : 'text-[#8a3333]'}>
                {order.isPaid ? ' · Paid' : ' · Unpaid'}
              </span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-neutral-gray">Total</dt>
            <dd className="font-bold tabular-nums text-text-dark">
              GHS {order.total.toFixed(2)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-neutral-gray">Placed</dt>
            <dd className="font-medium tabular-nums text-text-dark">{clock(order.placedAt)}</dd>
          </div>
          {isCancelReq && order.cancelRequestedAt && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-neutral-gray">Cancel asked</dt>
              <dd className="font-medium tabular-nums text-text-dark">
                {clock(order.cancelRequestedAt)}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Action */}
      <footer className="shrink-0 border-t border-[#f0e8d8] p-3">
        {isCancelReq ? (
          isAdmin ? (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onRejectCancel(order)}
                className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border border-[#e3ddd0] bg-neutral-light font-body text-base font-bold text-text-dark transition-transform touch-manipulation active:scale-[0.97] disabled:opacity-50"
              >
                <XIcon weight="bold" className="h-5 w-5" />
                Keep order
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onApproveCancel(order)}
                className={`flex h-14 flex-1 items-center justify-center gap-2 rounded-xl font-body text-base font-bold transition-transform touch-manipulation active:scale-[0.97] disabled:opacity-50 ${tone.action}`}
              >
                <ProhibitIcon weight="bold" className="h-5 w-5" />
                Cancel it
              </button>
            </div>
          ) : (
            <p className={`rounded-xl py-4 text-center font-body text-sm font-semibold ${tone.bg} ${tone.text}`}>
              Waiting for a manager to decide
            </p>
          )
        ) : tone.actionLabel ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onAdvance(order)}
            className={`flex h-14 w-full items-center justify-center gap-2 rounded-xl font-body text-base font-bold transition-transform touch-manipulation active:scale-[0.97] disabled:opacity-50 ${tone.action}`}
          >
            {isBusy ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <CheckIcon weight="bold" className="h-5 w-5" />
            )}
            {tone.actionLabel}
          </button>
        ) : null}
      </footer>
    </div>
  );
}
