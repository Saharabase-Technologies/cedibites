'use client';

import { CaretRightIcon, CheckCircleIcon } from '@phosphor-icons/react';
import type { Order, OrderStatus, UserRole } from '@/types/order';
import { KANBAN_COLUMNS, SOURCE_ICON, STATUS_CONFIG } from '@/lib/constants/order.constants';
import { timeAgo, formatGHS, getNextStatuses, isDoneStatus, canAdvanceOrder } from '../utils';
import { useOrders } from '../context';

// ─── Order card ───────────────────────────────────────────────────────────────

interface OrderCardProps {
    order: Order;
    userRole: UserRole;
    onAdvance?: (id: string, status: OrderStatus) => void;
    onClick: (order: Order) => void;
    isDragging: boolean;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragEnd: () => void;
}

export default function OrderCard({
    order,
    userRole,
    onAdvance,
    onClick,
    isDragging,
    onDragStart,
    onDragEnd,
}: OrderCardProps) {
    const { getDoneAge } = useOrders();
    const col = KANBAN_COLUMNS.find(c => c.statuses.includes(order.status))!;
    const time = timeAgo(order.placedAt);
    const SourceIcon = SOURCE_ICON[order.source];
    const nexts = getNextStatuses(order);
    const simpleNext = col.nextStatus ? [{ status: col.nextStatus, label: col.nextLabel! }] : nexts;
    const done = isDoneStatus(order.status);
    const canDoAdvance = !done && simpleNext.length > 0 && canAdvanceOrder(userRole, order, simpleNext[0].status);

    // Done-order fade-out
    const doneAge = getDoneAge(order.id);
    const isDying = doneAge != null;
    const DONE_TTL = 10_000;
    const FADE_START = 8_000; // start fading at 8s
    const fadeOpacity = isDying && doneAge > FADE_START
        ? Math.max(0, 1 - (doneAge - FADE_START) / (DONE_TTL - FADE_START))
        : 1;

    return (
        <div
            draggable={canDoAdvance}
            onDragStart={e => canDoAdvance && onDragStart(e, order.id)}
            onDragEnd={onDragEnd}
            onClick={() => onClick(order)}
            style={isDying ? { opacity: fadeOpacity, transition: 'opacity 1s ease-out' } : undefined}
            className={`
         dark:bg-brand-dark w-full mb-2 border rounded-2xl p-3.5 cursor-pointer select-none
        transition-all duration-150 group
        ${isDying
                ? 'bg-secondary/10 border-secondary/30'
                : 'bg-neutral-card/50 border-brown/25 hover:border-brown-light/40'
            }
        ${isDragging ? 'opacity-40 scale-95' : ''}
      `}
        >
            {/* Done overlay */}
            {isDying && (
                <div className="flex items-center gap-1.5 mb-2 text-secondary">
                    <CheckCircleIcon size={14} weight="fill" />
                    <span className="text-[10px] font-bold font-body uppercase tracking-wide">Completed</span>
                </div>
            )}
            {/* Top row */}
            <div className="flex items-start  justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-1.5 min-w-0">
                    <SourceIcon size={13} weight="fill" className="text-neutral-gray shrink-0" />
                    <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_CONFIG[order.status]?.dot ?? 'bg-neutral-gray'} ${STATUS_CONFIG[order.status]?.pulse ? 'animate-pulse' : ''}`} />
                    <span className="text-text-dark dark:text-text-light text-xs font-bold font-body tracking-wide">
                        #{order.orderNumber}
                    </span>
                </div>
                <span className={`text-[10px] font-bold font-body shrink-0 ${time.urgent ? 'text-error' : 'text-neutral-gray'}`}>
                    {time.label}
                </span>
            </div>

            {/* Customer */}
            <p className="text-text-dark dark:text-text-light text-sm font-semibold font-body leading-none mb-0.5 truncate">
                {order.contact.name}
            </p>
            <div className="flex items-center justify-between gap-2 mb-2.5">
                <p className="text-neutral-gray text-xs leading-snug font-semibold font-body truncate">
                    {order.branch.name} · {order.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'}
                </p>
                {order.status === 'received' && (
                    order.kitchenConfirmed
                        ? (
                            <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-secondary/10 border border-secondary/25 text-secondary text-[9px] font-bold font-body uppercase tracking-wide">
                                <span className="h-1.5 w-1.5 rounded-full bg-secondary shrink-0" />
                                Confirmed
                            </span>
                        )
                        : (
                            <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-warning/10 border border-warning/25 text-warning text-[9px] font-bold font-body uppercase tracking-wide">
                                <span className="h-1.5 w-1.5 rounded-full bg-warning shrink-0 animate-pulse" />
                                Awaiting
                            </span>
                        )
                )}
            </div>

            {/* Items + total */}
            <div className="flex items-center justify-between">
                <span className="text-neutral-gray text-xs font-body">
                    {order.items.reduce((s, i) => s + i.quantity, 0)} item{order.items.reduce((s, i) => s + i.quantity, 0) > 1 ? 's' : ''}
                </span>
                <span className="text-text-light text-xs font-semibold font-body">{formatGHS(order.total)}</span>
            </div>

            {/* Advance button — only if not terminal and this role can perform the transition */}
            {canDoAdvance && onAdvance && (
                <button
                    type="button"
                    onClick={e => { e.stopPropagation(); onAdvance(order.id, simpleNext[0].status); }}
                    className="
            mt-3 w-full flex items-center justify-center gap-1.5
            bg-transparent cursor-pointer hover:bg-primary/10
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
