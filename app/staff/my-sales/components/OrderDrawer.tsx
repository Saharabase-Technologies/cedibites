'use client';

import { useEffect } from 'react';
import {
    ClockIcon,
    PhoneIcon,
    XIcon,
    MapPinIcon,
    TagIcon,
    NoteIcon,
    TruckIcon,
    StorefrontIcon,
    WarningCircleIcon,
} from '@phosphor-icons/react';
import type { SalesOrder } from '../types';
import { SOURCE_ICON, SOURCE_LABEL, STATUS, PAY_LABEL_FULL } from '../constants';
import { formatGHS, formatTime, itemCount } from '../utils';

interface OrderDrawerProps {
    order: SalesOrder | null;
    onClose: () => void;
}

export default function OrderDrawer({ order, onClose }: OrderDrawerProps) {
    const isOpen = order !== null;

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    const status = order ? STATUS[order.status] : null;
    const SourceIcon = order ? SOURCE_ICON[order.source] : null;
    const isCancelled = order?.status === 'cancelled';

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Panel */}
            <div className={`
                fixed top-0 right-0 h-full w-full sm:w-105
                bg-brand-dark border-l border-brown-light/15
                z-50 flex flex-col
                will-change-transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}
            `}>
                {order && status && SourceIcon && (
                    <>
                        {/* ── Header */}
                        <div className="px-5 py-4 border-b border-brown-light/15 flex items-start justify-between gap-3 shrink-0">
                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-text-light text-base font-bold font-body">#{order.id}</span>
                                    <span className="inline-flex items-center gap-1.5 bg-brown border border-brown-light/15 rounded-full px-2 py-0.5 text-[10px] font-semibold font-body text-neutral-gray">
                                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${status.dot}`} />
                                        {status.label}
                                    </span>
                                </div>
                                <p className="text-neutral-gray text-xs font-body flex items-center gap-1.5 flex-wrap">
                                    <ClockIcon size={11} weight="fill" />
                                    {formatTime(order.placedAt)}
                                    <span className="text-brown-light/30">·</span>
                                    {order.branch}
                                    <span className="text-brown-light/30">·</span>
                                    <SourceIcon size={11} weight="fill" />
                                    {SOURCE_LABEL[order.source]}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-neutral-gray hover:text-text-light transition-colors mt-0.5 shrink-0 p-1"
                            >
                                <XIcon size={16} weight="bold" />
                            </button>
                        </div>

                        {/* ── Scrollable body */}
                        <div className="overflow-y-auto flex-1">

                            {/* Customer */}
                            <div className="px-5 py-4 border-b border-brown-light/10">
                                <p className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-widest mb-3">Customer</p>
                                <p className="text-text-light text-sm font-semibold font-body">{order.customer.name}</p>
                                <p className="text-neutral-gray text-xs font-body mt-1 flex items-center gap-1.5">
                                    <PhoneIcon size={11} weight="fill" />
                                    {order.customer.phone}
                                </p>
                            </div>

                            {/* Fulfillment */}
                            <div className="px-5 py-4 border-b border-brown-light/10">
                                <p className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-widest mb-3">Fulfillment</p>
                                <div className="flex items-center gap-2 mb-3">
                                    {order.fulfillment === 'delivery'
                                        ? <TruckIcon size={13} weight="fill" className="text-info" />
                                        : <StorefrontIcon size={13} weight="fill" className="text-secondary" />
                                    }
                                    <span className={`text-xs font-semibold font-body ${order.fulfillment === 'delivery' ? 'text-info' : 'text-secondary'}`}>
                                        {order.fulfillment === 'delivery' ? 'Delivery' : 'Pickup'}
                                    </span>
                                </div>
                                {order.deliveryAddress && (
                                    <div className="flex items-start gap-2 mb-1">
                                        <MapPinIcon size={12} weight="fill" className="text-neutral-gray mt-0.5 shrink-0" />
                                        <p className="text-text-light text-xs font-body">{order.deliveryAddress}</p>
                                    </div>
                                )}
                                {order.gpsCoords && (
                                    <p className="text-neutral-gray text-[10px] font-body ml-5">GPS: {order.gpsCoords}</p>
                                )}
                                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 ml-5">
                                    {order.estimatedMinutes != null && (
                                        <p className="text-neutral-gray text-xs font-body">
                                            ETA: <span className="text-text-light font-medium">~{order.estimatedMinutes} mins</span>
                                        </p>
                                    )}
                                    {order.deliveryFee > 0 && (
                                        <p className="text-neutral-gray text-xs font-body">
                                            Delivery fee: <span className="text-text-light font-medium">{formatGHS(order.deliveryFee)}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Items */}
                            <div className="px-5 py-4 border-b border-brown-light/10">
                                <p className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-widest mb-3">
                                    Items · {itemCount(order)} total
                                </p>
                                <div className="flex flex-col gap-2.5">
                                    {order.items.map((item, i) => (
                                        <div key={i} className="flex justify-between items-baseline gap-3">
                                            <div className="flex items-baseline gap-1.5 min-w-0">
                                                <span className="text-primary text-xs font-bold font-body shrink-0">{item.qty}×</span>
                                                <span className="text-text-light text-xs font-body truncate">{item.name}</span>
                                                <span className="text-neutral-gray/60 text-[10px] font-body shrink-0">@ {formatGHS(item.unitPrice)}</span>
                                            </div>
                                            <span className="text-text-light text-xs font-semibold font-body shrink-0">
                                                {formatGHS(item.qty * item.unitPrice)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pricing */}
                            <div className="px-5 py-4 border-b border-brown-light/10">
                                <p className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-widest mb-3">Pricing</p>
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex justify-between items-baseline gap-2">
                                        <span className="text-neutral-gray text-xs font-body">Subtotal</span>
                                        <span className="text-text-light text-xs font-body">{formatGHS(order.subtotal)}</span>
                                    </div>
                                    {order.discount > 0 && (
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="text-neutral-gray text-xs font-body flex items-center gap-1">
                                                <TagIcon size={10} weight="fill" className="shrink-0" />
                                                Discount{order.promoCode ? ` · ${order.promoCode}` : ''}
                                            </span>
                                            <span className="text-secondary text-xs font-semibold font-body">−{formatGHS(order.discount)}</span>
                                        </div>
                                    )}
                                    {order.deliveryFee > 0 && (
                                        <div className="flex justify-between items-baseline gap-2">
                                            <span className="text-neutral-gray text-xs font-body">Delivery fee</span>
                                            <span className="text-text-light text-xs font-body">{formatGHS(order.deliveryFee)}</span>
                                        </div>
                                    )}
                                    {order.tax > 0 && (
                                        <div className="flex justify-between items-baseline gap-2">
                                            <span className="text-neutral-gray text-xs font-body">Tax</span>
                                            <span className="text-text-light text-xs font-body">{formatGHS(order.tax)}</span>
                                        </div>
                                    )}
                                    <div className="border-t border-brown-light/20 pt-2 mt-0.5 flex justify-between items-baseline gap-2">
                                        <span className="text-text-light text-sm font-bold font-body">Total</span>
                                        <span className={`text-sm font-bold font-body ${isCancelled ? 'line-through text-neutral-gray' : 'text-primary'}`}>
                                            {formatGHS(order.total)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-baseline gap-2 mt-0.5">
                                        <span className="text-neutral-gray text-xs font-body">Payment method</span>
                                        <span className="text-text-light text-xs font-semibold font-body">{PAY_LABEL_FULL[order.payment]}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Notes & Flags */}
                            {(order.customerNotes || (order.allergyFlags && order.allergyFlags.length > 0) || order.staffNotes) && (
                                <div className="px-5 py-4">
                                    <p className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-widest mb-3">Notes & Flags</p>
                                    <div className="flex flex-col gap-3">
                                        {order.customerNotes && (
                                            <div className="flex gap-2 items-start">
                                                <NoteIcon size={13} weight="fill" className="text-neutral-gray shrink-0 mt-0.5" />
                                                <p className="text-text-light text-xs font-body italic">"{order.customerNotes}"</p>
                                            </div>
                                        )}
                                        {order.allergyFlags?.map(flag => (
                                            <div key={flag} className="flex items-center gap-2">
                                                <WarningCircleIcon size={13} weight="fill" className="text-warning shrink-0" />
                                                <span className="text-warning text-xs font-semibold font-body">{flag}</span>
                                            </div>
                                        ))}
                                        {order.staffNotes && (
                                            <div className="bg-brown border border-brown-light/15 rounded-xl px-3 py-2.5">
                                                <p className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider mb-1">Staff note</p>
                                                <p className="text-text-light text-xs font-body">{order.staffNotes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="h-8" />
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
