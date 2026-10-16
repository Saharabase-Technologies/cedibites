'use client';

import { useState } from 'react';
import { XCircleIcon } from '@phosphor-icons/react';
import type { FulfillmentType, Order, OrderItem, PaymentPart } from '@/types/order';
import { formatGHS } from '@/lib/utils/currency';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';
import { useRequestCancel } from '@/lib/api/hooks/useOrders';
import { toast } from '@/lib/utils/toast';
import CancelOrderModal from '@/app/components/ui/CancelOrderModal';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import {
    canAskToCancel, firstName, goodsOf, isCancelAsked, isNoCharge, methodLabel, owedOn, timeOf,
} from './orderFormat';
import { OPEN_DIVIDER, OPEN_HEAD_LINE, OPEN_ROW_LINE, OPEN_SHADE, OWES } from './salesTones';

// An order opened in place, under its line (staff portal D17). The order's
// history on the left, by round; its payments on the right; Ask to cancel
// tucked at the bottom left. No Take payment and no Add items: those are on
// the POS. Shared by My Sales, Orders and the Dashboard.

/** The classes DataTable gives an opened line and the cell this sits in. */
export const OPENED_ROW = `${OPEN_SHADE} font-bold`;
export const OPENED_PANEL = `${OPEN_SHADE} px-4 pt-0.5 pb-3`;

const HOW: Record<FulfillmentType, string> = {
    dine_in: 'Dine in',
    takeaway: 'Takeaway',
    pickup: 'Pickup',
    delivery: 'Delivery',
};

type Round = {
    key: number;
    heading: string;
    how?: string;
    items: OrderItem[];
    cancelled: boolean;
};

function roundsOf(order: Order): Round[] {
    const byRound = new Map<number, OrderItem[]>();
    for (const item of order.items) {
        const n = item.round ?? 1;
        byRound.set(n, [...(byRound.get(n) ?? []), item]);
    }

    const by = firstName(order.staffName);
    const first: Round = {
        key: 1,
        heading: `Ordered at ${timeOf(order.placedAt)}${by ? ` by ${by}` : ''}`,
        how: HOW[order.fulfillmentType],
        items: byRound.get(1) ?? [],
        cancelled: false,
    };

    const added = (order.rounds ?? []).map((round): Round => {
        const who = firstName(round.addedBy);
        return {
            key: round.number,
            heading: `Added at ${timeOf(round.addedAt)}${who ? ` by ${who}` : ''}`,
            items: byRound.get(round.number) ?? [],
            cancelled: Boolean(round.cancelledAt),
        };
    });

    return [first, ...added];
}

function Line({ left, right, last, muted, struck }: {
    left: React.ReactNode; right: React.ReactNode; last?: boolean; muted?: boolean; struck?: boolean;
}) {
    return (
        <div className={`flex justify-between gap-4 py-2 ${last ? '' : `border-b ${OPEN_ROW_LINE}`} ${muted ? 'text-neutral-gray' : ''} ${struck ? 'line-through text-neutral-gray' : ''}`}>
            <span className="min-w-0">{left}</span>
            <span className="shrink-0">{right}</span>
        </div>
    );
}

function Heading({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
    return (
        <div className={`flex items-center justify-between gap-3 border-b ${OPEN_HEAD_LINE}`}>
            <h3 className="m-0 pt-2.5 pb-2 text-[13px] font-extrabold text-text-dark">{children}</h3>
            {action}
        </div>
    );
}

function paymentLine(part: PaymentPart): { when: string; what: string; amount: string } {
    const who = firstName(part.takenBy);
    const given = part.amount < 0;
    const what = given ? 'Given back' : methodLabel(part);
    return {
        when: part.status === 'pending' ? 'Waiting' : part.paidAt ? timeOf(part.paidAt) : '',
        what: who ? `${what} · ${who}` : what,
        amount: given ? `−${formatGHS(-part.amount)}` : formatGHS(part.amount),
    };
}

export function OpenedOrder({ order, onCancelAsked }: { order: Order; onCancelAsked?: () => void }) {
    const [asking, setAsking] = useState(false);
    const { requestCancel } = useRequestCancel();
    const { can } = useStaffAuth();

    const rounds = roundsOf(order);
    const parts = (order.paymentParts ?? []).filter(p => p.method !== 'no_charge' && (p.status === 'completed' || p.status === 'pending'));
    const paid = parts.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
    const due = owedOn(order);
    const giveBack = order.toGiveBack ?? 0;
    const noCharge = isNoCharge(order);

    const handleAsk = async (reason: string) => {
        await requestCancel({ id: Number(order.id), reason });
        toast.success('Cancel asked. The admin decides.');
        onCancelAsked?.();
    };

    return (
        <div className="font-medium text-sm tabular-nums" onClick={e => e.stopPropagation()}>
            <div className={`grid grid-cols-1 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-px ${OPEN_DIVIDER}`}>

                {/* ── What was ordered, by round ───────────────────────── */}
                <section aria-label={`What was ordered on #${order.orderNumber}`} className={`${OPEN_SHADE} md:pr-6 pb-3 md:pb-0 flex flex-col gap-4`}>
                    {rounds.map(round => (
                        <div key={round.key} className="flex flex-col">
                            <Heading>
                                {round.heading}
                                {round.how && <span className="font-semibold text-neutral-gray"> · {round.how}</span>}
                                {round.cancelled && <span className="font-semibold text-neutral-gray"> · Cancelled</span>}
                            </Heading>
                            {round.items.map((item, i) => (
                                <Line
                                    key={item.id}
                                    left={`${item.quantity} × ${getOrderItemLineLabel(item)}`}
                                    right={formatGHS(item.unitPrice * item.quantity)}
                                    last={i === round.items.length - 1}
                                    struck={round.cancelled}
                                />
                            ))}
                        </div>
                    ))}

                    <div className="mt-auto flex flex-col">
                        {order.discount > 0 && <Line left="Discount" right={`−${formatGHS(order.discount)}`} muted last />}
                        <div className={`flex justify-between gap-4 pt-2.5 pb-0.5 border-t ${OPEN_HEAD_LINE} text-base font-extrabold`}>
                            <span>Total</span>
                            <span>{formatGHS(goodsOf(order))}</span>
                        </div>
                        {order.deliveryFee > 0 && (
                            <p className="text-xs text-neutral-gray pt-1">Delivery {formatGHS(order.deliveryFee)} is paid to the rider.</p>
                        )}
                    </div>
                </section>

                {/* ── Payments ─────────────────────────────────────────── */}
                <section aria-label={`Payments on #${order.orderNumber}`} className={`${OPEN_SHADE} md:pl-6 pt-3 md:pt-0 flex flex-col gap-4`}>
                    <div className="flex flex-col">
                        <Heading>Payments</Heading>
                        {parts.length === 0 && (
                            <p className="py-2 text-neutral-gray">{noCharge ? 'Given free. No Charge.' : 'Nothing paid yet.'}</p>
                        )}
                        {parts.map((part, i) => {
                            const line = paymentLine(part);
                            return (
                                <div key={part.id} className={`flex gap-3 py-2 ${i === parts.length - 1 ? '' : `border-b ${OPEN_ROW_LINE}`} ${part.status === 'pending' ? 'text-neutral-gray' : ''}`}>
                                    <span className="w-14 shrink-0 text-neutral-gray">{line.when}</span>
                                    <span className="flex-1 min-w-0">{line.what}</span>
                                    <span className="shrink-0">{line.amount}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-auto flex flex-col">
                        {parts.length > 0 && (
                            <div className="flex justify-between gap-4 pb-2 font-semibold text-neutral-gray">
                                <span>Paid</span>
                                <span>{formatGHS(paid)}</span>
                            </div>
                        )}
                        <div className={`flex justify-between gap-4 pt-2.5 pb-0.5 border-t ${OPEN_HEAD_LINE} text-base font-extrabold ${due > 0 || giveBack > 0 ? OWES : ''}`}>
                            {due > 0 ? (
                                <><span>Still to pay</span><span>{formatGHS(due)}</span></>
                            ) : giveBack > 0 ? (
                                <><span>To give back</span><span>{formatGHS(giveBack)}</span></>
                            ) : noCharge ? (
                                <><span>No Charge</span><span>{formatGHS(0)}</span></>
                            ) : order.status === 'cancelled' ? (
                                <span className="text-neutral-gray">Cancelled</span>
                            ) : (
                                <><span className="text-success-ink">Paid in full</span><span /></>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            {canAskToCancel(order) && can('order.cancel.request') && (
                <div className="flex mt-1">
                    <button
                        type="button"
                        onClick={() => setAsking(true)}
                        className="min-h-11 inline-flex items-center gap-1.5 pr-2 text-[13px] font-bold text-primary cursor-pointer hover:underline"
                    >
                        <XCircleIcon size={16} weight="bold" />
                        Ask to cancel
                    </button>
                </div>
            )}
            {isCancelAsked(order) && (
                <p className={`mt-2 text-[13px] font-bold ${OWES}`}>Cancel asked. The admin decides.</p>
            )}

            {asking && (
                <CancelOrderModal
                    orderNumber={order.orderNumber}
                    theme="light"
                    context="staff"
                    onCancel={() => setAsking(false)}
                    onConfirm={handleAsk}
                />
            )}
        </div>
    );
}
