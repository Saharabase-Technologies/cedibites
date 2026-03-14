'use client';

import { CaretRightIcon } from '@phosphor-icons/react';
import type { Order } from '@/types/order';
import { SOURCE_ICON, SOURCE_LABEL, STATUS_CONFIG, PAYMENT_LABELS } from '@/lib/constants/order.constants';
import { formatGHS, formatTime, itemCount } from '../utils';

interface SalesRowProps {
    order: Order;
    index: number;
    isSelected: boolean;
    onSelect: () => void;
}

export default function SalesRow({ order, index, isSelected, onSelect }: SalesRowProps) {
    const SourceIcon = SOURCE_ICON[order.source];
    const status = STATUS_CONFIG[order.status];
    const isCancelled = order.status === 'cancelled';
    const qty = itemCount(order);

    return (
        <tr
            onClick={onSelect}
            className={`
                border-b border-brand-dark/25 dark:border-brand-dark transition-colors cursor-pointer
                ${isCancelled ? 'opacity-50' : ''}
                ${isSelected ? 'bg-primary/25' : 'hover:bg-brown-light/5'}
            `}
        >
            {/* # */}
            <td className="px-4 py-3.5 text-text-dark dark:text-text-light text-xs font-body w-8 text-center">
                {index + 1}
            </td>

            {/* Time */}
            <td className="px-4 py-3.5 text-text-dark dark:text-text-light text-xs font-body whitespace-nowrap">
                {formatTime(order.placedAt)}
            </td>

            {/* Order ID */}
            <td className="px-4 py-3.5">
                <span className="text-text-dark dark:text-text-light text-xs font-bold font-body tracking-wide">#{order.orderNumber}</span>
            </td>

            {/* Customer */}
            <td className="px-4 py-3.5 min-w-[150px]">
                <p className="text-text-dark dark:text-text-light text-sm font-semibold font-body leading-none">{order.contact.name}</p>
                <p className="text-text-dark dark:text-text-light text-[10px] font-body mt-0.5">{order.contact.phone}</p>
            </td>

            {/* Branch */}
            <td className="px-4 py-3.5 text-text-dark dark:text-text-light text-xs font-body whitespace-nowrap hidden lg:table-cell">
                {order.branch.name}
            </td>

            {/* Source */}
            <td className="px-4 py-3.5 hidden md:table-cell">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium font-body text-text-dark dark:text-text-light">
                    <SourceIcon size={11} weight="fill" />
                    {SOURCE_LABEL[order.source]}
                </span>
            </td>

            {/* Items */}
            <td className="px-4 py-3.5 text-text-dark dark:text-text-light text-xs font-body text-center hidden sm:table-cell">
                {qty}
            </td>

            {/* Payment */}
            <td className="px-4 py-3.5 text-text-dark dark:text-text-light text-xs font-body hidden md:table-cell">
                {PAYMENT_LABELS[order.paymentMethod].short}
            </td>

            {/* Total */}
            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                <span className={`text-sm font-bold font-body ${isCancelled ? 'line-through text-text-dark dark:text-text-light' : 'text-text-dark dark:text-text-light'}`}>
                    {formatGHS(order.total)}
                </span>
            </td>

            {/* Status + caret */}
            <td className="px-4 py-3.5">
                <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold font-body text-text-dark dark:text-text-light whitespace-nowrap">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${status.dot}`} />
                        {status.label}
                    </span>
                    <CaretRightIcon
                        size={10}
                        weight="bold"
                        className={`shrink-0 transition-colors ${isSelected ? 'text-primary' : 'text-text-dark dark:text-text-light'}`}
                    />
                </div>
            </td>
        </tr>
    );
}
