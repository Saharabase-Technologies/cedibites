'use client';

import { CaretRightIcon } from '@phosphor-icons/react';
import type { StaffOrder, OrderStatus } from '../types';
import { COLUMNS, SOURCE_ICON } from '../constants';
import { timeAgo, formatGHS, getNextStatuses, isDone } from '../utils';

// ─── Order card ───────────────────────────────────────────────────────────────

interface OrderCardProps {
    order: StaffOrder;
    onAdvance?: (id: string, status: OrderStatus) => void;
    onClick: (order: StaffOrder) => void;
    isDragging: boolean;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragEnd: () => void;
}

export default function OrderCard({
    order,
    onAdvance,
    onClick,
    isDragging,
    onDragStart,
    onDragEnd,
}: OrderCardProps) {
    const col = COLUMNS.find(c => c.statuses.includes(order.status))!;
    const time = timeAgo(order.placedAt);
    const SourceIcon = SOURCE_ICON[order.source];
    const nexts = getNextStatuses(order);
    const simpleNext = col.nextStatus ? [{ status: col.nextStatus, label: col.nextLabel! }] : nexts;
    const done = isDone(order.status);

    return (
        <div
            draggable
            onDragStart={e => onDragStart(e, order.id)}
            onDragEnd={onDragEnd}
            onClick={() => onClick(order)}
            className={`
        bg-brown border rounded-2xl p-3.5 cursor-pointer select-none
        transition-all duration-150 group
        ${isDragging ? 'opacity-40 scale-95' : 'hover:border-brown-light/40'}
        ${col.color}
      `}
        >
            {/* Top row */}
            <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-1.5 min-w-0">
                    <SourceIcon size={13} weight="fill" className="text-neutral-gray shrink-0" />
                    <span className="text-text-light text-xs font-bold font-body tracking-wide">
                        #{order.id}
                    </span>
                </div>
                <span className={`text-[10px] font-bold font-body shrink-0 ${time.urgent ? 'text-error' : 'text-neutral-gray'}`}>
                    {time.label}
                </span>
            </div>

            {/* Customer */}
            <p className="text-text-light text-sm font-semibold font-body leading-none mb-0.5 truncate">
                {order.customer.name}
            </p>
            <p className="text-neutral-gray text-xs font-body mb-2.5 truncate">
                {order.branch} · {order.type === 'delivery' ? 'Delivery' : 'Pickup'}
            </p>

            {/* Items + total */}
            <div className="flex items-center justify-between">
                <span className="text-neutral-gray text-xs font-body">
                    {order.items.reduce((s, i) => s + i.quantity, 0)} item{order.items.reduce((s, i) => s + i.quantity, 0) > 1 ? 's' : ''}
                </span>
                <span className="text-text-light text-xs font-semibold font-body">{formatGHS(order.total)}</span>
            </div>

            {/* Advance button — only if not terminal */}
            {!done && simpleNext.length > 0 && onAdvance && (
                <button
                    type="button"
                    onClick={e => { e.stopPropagation(); onAdvance(order.id, simpleNext[0].status); }}
                    className="
            mt-3 w-full flex items-center justify-center gap-1.5
            bg-brand-darker hover:bg-brown-light/10
            border border-brown-light/20 hover:border-primary/40
            text-neutral-gray hover:text-primary
            text-[11px] font-semibold font-body
            py-2 rounded-xl transition-all duration-150
          "
                >
                    {simpleNext[0].label}
                    <CaretRightIcon size={11} weight="bold" />
                </button>
            )}
        </div>
    );
}
