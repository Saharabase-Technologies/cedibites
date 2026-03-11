'use client';

import { useState } from 'react';
import {
    XIcon,
    PhoneIcon,
    MapPinIcon,
    NoteIcon,
    DeviceMobileIcon,
    CheckCircleIcon,
    WarningCircleIcon,
    ArrowCounterClockwiseIcon,
    SpinnerIcon,
} from '@phosphor-icons/react';
import { useOrders } from '../context';
import { KANBAN_COLUMNS, PAYMENT_LABELS, SOURCE_LABEL } from '@/lib/constants/order.constants';
import { formatGHS, timeAgo, getNextStatuses, isDoneStatus, haversineKm } from '../utils';
import type { OrderStatus } from '@/types/order';
import LiveMap from '@/app/components/order/LiveMap';

// ─── Refund modal ─────────────────────────────────────────────────────────────

function RefundModal({
    total,
    customerName,
    customerPhone,
    orderId,
    payment,
    onConfirm,
    onCancel,
    isProcessing,
}: {
    total: number;
    customerName: string;
    customerPhone: string;
    orderId: string;
    payment: string;
    onConfirm: () => void;
    onCancel: () => void;
    isProcessing: boolean;
}) {
    const isMomo = payment === 'momo';

    return (
        <>
            {/* Backdrop — higher z than panel */}
            <div className="fixed inset-0 z-[60] bg-brand-darker/80 backdrop-blur-sm" onClick={onCancel} />

            <div className="fixed z-[70] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm bg-brown border border-brown-light/20 rounded-3xl p-6 shadow-2xl">
                <div className="flex flex-col items-center text-center gap-5">

                    {/* Icon */}
                    <div className="w-12 h-12 rounded-full bg-error/15 flex items-center justify-center">
                        <ArrowCounterClockwiseIcon size={24} weight="fill" className="text-error" />
                    </div>

                    {/* Copy */}
                    <div>
                        <h3 className="text-text-light text-base font-bold font-body">Confirm Refund</h3>
                        <p className="text-neutral-gray text-sm font-body mt-1.5 leading-relaxed">
                            Refund <span className="text-text-light font-semibold">{formatGHS(total)}</span> to{' '}
                            <span className="text-text-light font-semibold">{customerName}</span> for order{' '}
                            <span className="text-text-light font-semibold">#{orderId}</span>?
                        </p>
                    </div>

                    {/* Method info */}
                    {isMomo ? (
                        <div className="w-full bg-brand-dark rounded-xl px-4 py-3 text-left">
                            <p className="text-neutral-gray text-[10px] font-body uppercase tracking-wider mb-1">Refund via</p>
                            <p className="text-text-light text-sm font-semibold font-body">Mobile Money – Hubtel reversal</p>
                            <p className="text-neutral-gray text-xs font-body mt-0.5">Returned to {customerPhone}</p>
                        </div>
                    ) : (
                        <div className="w-full bg-warning/10 border border-warning/25 rounded-xl px-4 py-3 text-left">
                            <p className="text-warning text-xs font-semibold font-body">Cash payment – manual refund required</p>
                            <p className="text-neutral-gray text-xs font-body mt-1">
                                This order was paid in cash. A refund record will be created and your branch manager will be notified to process it manually.
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 w-full">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isProcessing}
                            className="flex-1 py-3 rounded-full border border-brown-light/25 text-neutral-gray text-sm font-body hover:text-text-light transition-colors cursor-pointer disabled:opacity-40"
                        >
                            Go Back
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isProcessing}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-error hover:bg-error/80 text-white text-sm font-semibold font-body transition-colors cursor-pointer disabled:opacity-60"
                        >
                            {isProcessing
                                ? <><SpinnerIcon size={15} weight="bold" className="animate-spin" /> Processing...</>
                                : 'Confirm Refund'
                            }
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

export default function OrderDetailPanel() {
    const { selectedOrder, setSelectedOrder, handleAdvance } = useOrders();

    const [showRefund, setShowRefund] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [refundDone, setRefundDone] = useState(false);

    if (!selectedOrder) return null;

    const order = selectedOrder;
    const col = KANBAN_COLUMNS.find(c => c.statuses.includes(order.status))!;
    const time = timeAgo(order.placedAt);
    const nexts = getNextStatuses(order);

    const simpleNext = col.nextStatus
        ? [{ status: col.nextStatus as OrderStatus, label: col.nextLabel! }, ...nexts]
        : nexts;

    const isDone = isDoneStatus(order.status);
    const isRefundable = (order.status === 'delivered' || order.status === 'completed') && !refundDone;

    const onClose = () => {
        setSelectedOrder(null);
        setRefundDone(false);
        setShowRefund(false);
    };

    const handleRefundConfirm = async () => {
        setIsRefunding(true);
        try {
            // TODO: POST /api/v1/staff/orders/:id/refund
            // MoMo → Hubtel reversal API
            // Cash → creates refund record, notifies branch manager via WebSocket
            await new Promise(r => setTimeout(r, 2000)); // remove when API is live
            setRefundDone(true);
            setShowRefund(false);
        } catch {
            // TODO: show error toast
        } finally {
            setIsRefunding(false);
        }
    };

    return (
        <>
            {/* Panel backdrop */}
            <div className="fixed inset-0 z-40 bg-brand-darker/70 backdrop-blur-sm" onClick={onClose} />

            {/* Panel — bottom sheet on mobile, right sidebar on desktop */}
            <div className="
        fixed z-50
        bottom-0 left-0 right-0 max-h-[90vh]
        md:bottom-auto md:top-0 md:right-0 md:left-auto md:h-full md:w-96 md:max-h-full
        bg-brown border-t md:border-t-0 md:border-l border-brown-light/20
        rounded-t-3xl md:rounded-none
        overflow-y-auto flex flex-col
      ">

                {/* Header — sticky */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-brown-light/15 sticky top-0 bg-brown z-10">
                    <div>
                        <p className="text-text-light text-base font-bold font-body">#{order.orderNumber}</p>
                        <p className="text-neutral-gray text-xs font-body mt-0.5">
                            {time.label} · via {SOURCE_LABEL[order.source]}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-brown-light/25 text-neutral-gray hover:text-text-light transition-colors cursor-pointer"
                    >
                        <XIcon size={16} weight="bold" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col gap-5 px-5 py-5">

                    {/* Refund success banner */}
                    {refundDone && (
                        <div className="flex items-center gap-2 bg-secondary/10 border border-secondary/25 rounded-xl px-4 py-3">
                            <CheckCircleIcon size={16} weight="fill" className="text-secondary shrink-0" />
                            <p className="text-secondary text-xs font-semibold font-body">Refund initiated successfully.</p>
                        </div>
                    )}

                    {/* Status pill */}
                    <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${col.dot}`} />
                        <span className="text-text-light text-sm font-semibold font-body">{col.label}</span>
                        <span className="text-neutral-gray text-xs font-body">·</span>
                        <span className="text-neutral-gray text-xs font-body capitalize">{order.fulfillmentType}</span>
                    </div>

                    {/* Customer */}
                    <div className="bg-brand-dark rounded-2xl px-4 py-4 flex flex-col gap-3">
                        <p className="text-neutral-gray text-[10px] font-body uppercase tracking-wider">Customer</p>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-text-light text-sm font-semibold font-body">{order.contact.name}</p>
                                <p className="text-neutral-gray text-xs font-body mt-0.5">{order.contact.phone}</p>
                            </div>
                            <a
                                href={`tel:${order.contact.phone}`}
                                onClick={e => e.stopPropagation()}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary/15 hover:bg-secondary/25 border border-secondary/25 text-secondary transition-colors"
                                aria-label={`Call ${order.contact.name}`}
                            >
                                <PhoneIcon size={16} weight="fill" />
                            </a>
                        </div>

                        {order.fulfillmentType === 'delivery' && order.contact.address && (
                            <div className="flex items-start gap-2 pt-2 border-t border-brown-light/15">
                                <MapPinIcon size={14} weight="fill" className="text-neutral-gray shrink-0 mt-0.5" />
                                <p className="text-text-light text-xs font-body leading-relaxed">{order.contact.address}</p>
                            </div>
                        )}
                        {order.fulfillmentType === 'pickup' && (
                            <div className="flex items-center gap-2 pt-2 border-t border-brown-light/15">
                                <MapPinIcon size={14} weight="fill" className="text-neutral-gray shrink-0" />
                                <p className="text-text-light text-xs font-body">Pickup at {order.branch.name}</p>
                            </div>
                        )}
                    </div>

                    {/* Items */}
                    <div className="bg-brand-dark rounded-2xl px-4 py-4">
                        <p className="text-neutral-gray text-[10px] font-body uppercase tracking-wider mb-3">Items</p>
                        <div className="flex flex-col gap-2">
                            {order.items.map((item, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <span className="text-text-light text-sm font-body">{item.quantity}× {item.name}</span>
                                    <span className="text-neutral-gray text-sm font-body">{formatGHS(item.unitPrice * item.quantity)}</span>
                                </div>
                            ))}
                            <div className="flex items-center justify-between pt-2 border-t border-brown-light/15 mt-1">
                                <span className="text-text-light text-sm font-semibold font-body">Total</span>
                                <span className={`text-sm font-bold font-body ${refundDone ? 'line-through text-neutral-gray' : 'text-primary'}`}>
                                    {formatGHS(order.total)}
                                </span>
                            </div>
                            {refundDone && (
                                <p className="text-secondary text-xs font-body text-right -mt-1">Refunded</p>
                            )}
                        </div>
                    </div>

                    {/* Payment + notes */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <DeviceMobileIcon size={14} className="text-neutral-gray shrink-0" />
                            <span className="text-neutral-gray text-xs font-body">{PAYMENT_LABELS[order.paymentMethod].short}</span>
                        </div>
                        {order.contact.notes && (
                            <div className="flex items-start gap-2">
                                <NoteIcon size={14} className="text-neutral-gray shrink-0 mt-0.5" />
                                <span className="text-neutral-gray text-xs font-body italic">{order.contact.notes}</span>
                            </div>
                        )}
                    </div>

                    {/* Live Tracking */}
                    {order.status === 'out_for_delivery' && order.fulfillmentType === 'delivery' && order.coords && (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <p className="text-neutral-gray text-[10px] font-body uppercase tracking-wider">Live Tracking</p>
                                {order.coords.rider && order.coords.customer && (
                                    <span className="text-xs font-semibold font-body text-teal-400">
                                        {haversineKm(order.coords.rider, order.coords.customer).toFixed(1)} km away
                                    </span>
                                )}
                            </div>
                            <LiveMap
                                branchLocation={order.coords.branch}
                                customerLocation={order.coords.customer ?? null}
                                riderLocation={order.coords.rider ?? null}
                                branchName={order.branch.name}
                            />
                        </div>
                    )}

                    {/* ── Active order actions ── */}
                    {!isDone && (
                        <div className="flex flex-col gap-2 mt-auto pt-2">
                            <p className="text-neutral-gray text-xs font-body">Move order to:</p>
                            {simpleNext.map(next => (
                                <button
                                    key={next.status}
                                    type="button"
                                    onClick={() => { handleAdvance(order.id, next.status); onClose(); }}
                                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-brand-darker font-semibold font-body py-3.5 rounded-full text-sm transition-colors cursor-pointer"
                                >
                                    <CheckCircleIcon size={16} weight="fill" />
                                    {next.label}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => { handleAdvance(order.id, 'cancelled'); onClose(); }}
                                className="w-full flex items-center justify-center gap-2 border border-error/30 hover:bg-error/10 text-error font-semibold font-body py-3 rounded-full text-sm transition-colors cursor-pointer"
                            >
                                <WarningCircleIcon size={16} weight="fill" />
                                Cancel Order
                            </button>
                        </div>
                    )}

                    {/* ── Refund action (completed / delivered) ── */}
                    {isRefundable && (
                        <div className="mt-auto pt-4 border-t border-brown-light/15">
                            <p className="text-neutral-gray text-xs font-body mb-3">
                                Order is complete. If the customer needs a refund:
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowRefund(true)}
                                className="w-full flex items-center justify-center gap-2 border border-error/30 hover:bg-error/10 text-error font-semibold font-body py-3.5 rounded-full text-sm transition-colors cursor-pointer"
                            >
                                <ArrowCounterClockwiseIcon size={16} weight="bold" />
                                Process Refund — {formatGHS(order.total)}
                            </button>
                        </div>
                    )}

                    {/* Cancelled note */}
                    {order.status === 'cancelled' && (
                        <p className="text-neutral-gray/50 text-xs font-body text-center mt-auto pt-2">
                            This order was cancelled.
                        </p>
                    )}

                </div>
            </div>

            {/* Refund modal — mounts over panel */}
            {showRefund && (
                <RefundModal
                    total={order.total}
                    customerName={order.contact.name}
                    customerPhone={order.contact.phone}
                    orderId={order.orderNumber}
                    payment={order.paymentMethod}
                    onConfirm={handleRefundConfirm}
                    onCancel={() => setShowRefund(false)}
                    isProcessing={isRefunding}
                />
            )}
        </>
    );
}
