'use client';

import type { ReactNode } from 'react';
import {
  CheckIcon,
  MapPinIcon,
  PhoneIcon,
  XIcon,
} from '@phosphor-icons/react';

import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';
import type { AdminOrder } from '@/lib/api/adapters/order.adapter';

/**
 * One order, in full.
 *
 * There were three of these — admin, manager, and the staff board — drifting
 * apart from a common ancestor, so a fix to the payment breakdown landed on one
 * screen and not the others. This is the body they all describe; what differs
 * between them is what the viewer is allowed to *do*, which arrives through
 * `actions` and `children` rather than being duplicated in a fork of the whole
 * panel.
 *
 * Sized for reading rather than for fitting. The old panel set almost
 * everything at 10 and 12 pixels, which is fine on a designer's monitor and
 * poor on a phone held at arm's length over a counter — and this is a screen
 * people open to check a fact, usually while someone is waiting on the answer.
 */

// ─── Who placed it ───────────────────────────────────────────────────────────

/**
 * Who placed this order.
 *
 * "Source" alone answers the wrong half of the question for a call-centre
 * order: `Phone` says the channel but not the person, and on those orders there
 * *is* a person — an agent typed it in and is answerable for what it says.
 *
 * The one distinction worth drawing is placed-by versus handled-by. An order
 * from the website was placed by the customer and may later be accepted by a
 * cashier, so naming that cashier here would be a lie about who chose the food.
 * Everything else names whoever is on the order.
 */
export function placedByLine(order: AdminOrder): string {
  if (order.source === 'Online') return 'Placed by the customer';
  if (order.assignedEmployee) return `Placed by ${order.assignedEmployee}`;
  if (order.source === 'POS') return 'Placed at the till';
  return 'Placed by the call centre';
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">
      {children}
    </p>
  );
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-neutral-light border border-[#f0e8d8] rounded-xl ${className}`}>
      {children}
    </div>
  );
}

function KeyValue({
  label,
  value,
  accent,
}: {
  label: string;
  value: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className="text-neutral-gray text-sm font-body shrink-0">{label}</span>
      <span
        className={`text-sm font-semibold font-body text-right tabular-nums ${
          accent ? 'text-primary' : 'text-text-dark'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function formatGHS(v: number) {
  return `₵${v.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PAYMENT_STATUS_TONE: Record<string, string> = {
  paid: 'text-emerald-700',
  pending: 'text-amber-700',
  failed: 'text-rose-700',
  refunded: 'text-[#2f5570]',
  no_charge: 'text-neutral-gray',
};

// ─── Panel ───────────────────────────────────────────────────────────────────

export interface OrderDetailPanelProps {
  order: AdminOrder;
  onClose: () => void;
  /** Status badge for this screen's own vocabulary. */
  statusSlot?: ReactNode;
  /** What this viewer may do — an admin refunds, a manager can only ask. */
  actions?: ReactNode;
  /** Anything else appended below the timeline: note composers, refund forms. */
  children?: ReactNode;
}

export default function OrderDetailPanel({
  order,
  onClose,
  statusSlot,
  actions,
  children,
}: OrderDetailPanelProps) {
  const goodsTotal = order.amount - order.deliveryFee;
  const placedBy = placedByLine(order);
  const hasAddress = order.address && order.address !== '—';

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px]"
      />

      <aside className="fixed right-0 top-0 h-full z-40 w-full max-w-lg bg-neutral-card border-l border-[#f0e8d8] flex flex-col shadow-2xl overflow-hidden">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-start justify-between gap-4 px-6 py-5 border-b border-[#f0e8d8]">
          <div className="min-w-0">
            <p className="text-text-dark text-xl font-bold font-body tabular-nums leading-tight">
              #{order.id}
            </p>
            <p className="text-neutral-gray text-sm font-body mt-0.5">{order.placedAtFull}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {statusSlot}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-neutral-light transition-colors cursor-pointer"
            >
              <XIcon size={18} className="text-neutral-gray" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          {/* ── Where it came from ───────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <p className="text-[11px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">
                Branch
              </p>
              <p className="text-text-dark text-base font-semibold font-body">{order.branch}</p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">
                Source
              </p>
              <p className="text-text-dark text-base font-semibold font-body">{order.source}</p>
              {/* The channel says how; this says who. On a call-centre order
                  there is a person answerable for what was typed in. */}
              <p className="text-neutral-gray text-sm font-body mt-1 leading-snug">{placedBy}</p>
            </Card>
          </div>

          {/* ── Customer ────────────────────────────────────────────────── */}
          <div>
            <SectionLabel>Customer</SectionLabel>
            <Card className="p-4 flex flex-col gap-2">
              <p className="text-text-dark text-base font-semibold font-body">{order.customer}</p>
              {order.phone && order.phone !== '—' && (
                <a
                  href={`tel:${order.phone}`}
                  className="text-primary text-sm font-body font-medium flex items-center gap-2 hover:underline w-fit"
                >
                  <PhoneIcon size={14} weight="fill" />
                  {order.phone}
                </a>
              )}
              {order.email && <p className="text-neutral-gray text-sm font-body">{order.email}</p>}
              {hasAddress && (
                <div className="flex items-start gap-2 pt-1 border-t border-[#f0e8d8] mt-1">
                  <MapPinIcon size={14} weight="fill" className="text-neutral-gray mt-1 shrink-0" />
                  <p className="text-text-dark text-sm font-body leading-relaxed">{order.address}</p>
                </div>
              )}
            </Card>
          </div>

          {/* ── Ownership ───────────────────────────────────────────────── */}
          {order.assignedEmployee && (
            <div>
              <SectionLabel>Handled by</SectionLabel>
              <Card className="p-4">
                <p className="text-text-dark text-base font-semibold font-body">
                  {order.assignedEmployee}
                </p>
              </Card>
            </div>
          )}

          {/* ── Items ───────────────────────────────────────────────────── */}
          <div>
            <SectionLabel>Items</SectionLabel>
            <Card className="overflow-hidden">
              <div className="divide-y divide-[#f0e8d8]">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    {/* The count reads as its own thing rather than as part of
                        the dish name — the difference between "2" and "×2" on a
                        line somebody is checking against a bag of food. */}
                    <span className="shrink-0 min-w-7 h-7 px-1.5 rounded-lg bg-neutral-card border border-[#f0e8d8] flex items-center justify-center text-sm font-bold font-body text-text-dark tabular-nums">
                      {item.qty}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-dark text-sm font-medium font-body leading-snug">
                        {getOrderItemLineLabel({ name: item.name, sizeLabel: item.sizeLabel })}
                      </p>
                      {item.qty > 1 && (
                        <p className="text-neutral-gray text-xs font-body mt-0.5 tabular-nums">
                          {formatGHS(item.price)} each
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-text-dark text-sm font-bold font-body tabular-nums">
                      {formatGHS(item.qty * item.price)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="px-4 py-3 bg-neutral-card border-t border-[#f0e8d8]">
                {order.deliveryFee > 0 && (
                  <>
                    <KeyValue label="Goods" value={formatGHS(goodsTotal)} />
                    {/* Third-party delivery is collected by the rider and is
                        not restaurant revenue. Kept on its own line so it is
                        never read as part of the takings. */}
                    <KeyValue label="Delivery (third-party)" value={formatGHS(order.deliveryFee)} />
                  </>
                )}
                <div className="flex items-baseline justify-between gap-4 pt-2 mt-1 border-t border-[#f0e8d8]">
                  <span className="text-text-dark text-base font-bold font-body">Total</span>
                  <span className="text-primary text-lg font-bold font-body tabular-nums">
                    {formatGHS(order.amount)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* ── Payment ─────────────────────────────────────────────────── */}
          <div>
            <SectionLabel>Payment</SectionLabel>
            <Card className="p-4">
              <KeyValue label="Method" value={order.payment} />
              <div className="flex items-baseline justify-between gap-4 py-1">
                <span className="text-neutral-gray text-sm font-body">Status</span>
                <span
                  className={`text-sm font-semibold font-body capitalize ${
                    PAYMENT_STATUS_TONE[order.paymentStatus] ?? 'text-neutral-gray'
                  }`}
                >
                  {order.paymentStatus === 'no_charge' ? 'No charge' : order.paymentStatus}
                </span>
              </div>
              <KeyValue label="Amount paid" value={formatGHS(order.amountPaid)} accent />
              {order.hubtelRef && (
                <div className="flex items-baseline justify-between gap-4 py-1">
                  <span className="text-neutral-gray text-sm font-body shrink-0">Gateway ref</span>
                  <span className="text-text-dark text-xs font-body break-all text-right">
                    {order.hubtelRef}
                  </span>
                </div>
              )}
            </Card>
          </div>

          {/* ── Timeline ────────────────────────────────────────────────── */}
          {order.timeline.length > 0 && (
            <div>
              <SectionLabel>Timeline</SectionLabel>
              <div className="flex flex-col">
                {order.timeline.map((ev, i) => {
                  const isLast = i === order.timeline.length - 1;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex flex-col items-center self-stretch">
                        {/* Every row here is a stage the order has already been
                            through, so every one is ticked. The last is filled
                            rather than outlined: that is where it stands now. */}
                        <div
                          className={`w-5 h-5 rounded-full mt-0.5 shrink-0 flex items-center justify-center ${
                            isLast ? 'bg-primary text-white' : 'bg-primary/15 text-primary'
                          }`}
                        >
                          <CheckIcon size={11} weight="bold" />
                        </div>
                        {!isLast && <div className="w-0.5 flex-1 min-h-5 bg-primary/20" />}
                      </div>
                      <div className="pb-4 min-w-0">
                        <p className="text-text-dark text-sm font-semibold font-body capitalize">
                          {ev.status}
                        </p>
                        <p className="text-neutral-gray text-xs font-body mt-0.5">
                          {ev.at} · {ev.by}
                          {ev.byName ? ` (${ev.byName})` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Internal notes ──────────────────────────────────────────── */}
          {order.internalNotes && order.internalNotes.length > 0 && (
            <div>
              <SectionLabel>Internal notes</SectionLabel>
              <div className="flex flex-col gap-2">
                {order.internalNotes.map((n) => (
                  <Card key={n.id} className="px-4 py-3">
                    <p className="text-text-dark text-sm font-body whitespace-pre-wrap leading-relaxed">
                      {n.note}
                    </p>
                    <p className="text-neutral-gray text-xs font-body mt-1.5">
                      {n.byName ?? 'Staff'} ·{' '}
                      {new Date(n.at).toLocaleString('en-GH', { timeZone: 'Africa/Accra' })}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {children}
        </div>

        {/* ── Actions ────────────────────────────────────────────────────── */}
        {actions && (
          <div className="shrink-0 border-t border-[#f0e8d8] bg-neutral-card px-6 py-4">
            {actions}
          </div>
        )}
      </aside>
    </>
  );
}
