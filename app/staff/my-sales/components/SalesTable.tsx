'use client';

import { useState } from 'react';
import { ReceiptIcon, CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import type { Order } from '@/types/order';
import { formatGHS} from '../utils';
import SalesRow from './SalesRow';

const HEADERS = ['#', 'Time', 'Order', 'Customer', 'Branch', 'Source', 'Items', 'Payment', 'Total', 'Status'];
const PAGE_SIZE = 10;

interface SalesTableProps {
    activeOrders: Order[];
    cancelledOrders: Order[];
    totalRevenue: number;
    selectedId: string | null;
    onSelect: (order: Order) => void;
}

export default function SalesTable({ activeOrders, cancelledOrders, totalRevenue, selectedId, onSelect }: SalesTableProps) {
    const [page, setPage] = useState(0);

    if (activeOrders.length === 0 && cancelledOrders.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 py-20">
                <ReceiptIcon size={36} weight="thin" className="text-neutral-gray/40" />
                <p className="text-neutral-gray text-sm font-body">No orders placed by you today.</p>
            </div>
        );
    }

    const allOrders = [...activeOrders, ...cancelledOrders];
    const totalPages = Math.ceil(allOrders.length / PAGE_SIZE);
    const pageOrders = allOrders.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return (
        <div className="border dark:border-brand-dark border-brand-dark/50 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full min-w-155">
                    <thead>
                        <tr className="border-b border-brown-light/20  bg-brown dark:bg-brand-dark">
                            {HEADERS.map((h, i) => (
                                <th
                                    key={h}
                                    className={`
                                        px-4 py-3 text-[10px] font-bold font-body text-text-light dark:text-text-light uppercase tracking-wider
                                        ${i === 0 ? 'text-center w-8' : 'text-left'}
                                        ${h === 'Branch' ? 'hidden lg:table-cell' : ''}
                                        ${h === 'Source' ? 'hidden md:table-cell' : ''}
                                        ${h === 'Items' ? 'hidden sm:table-cell text-center' : ''}
                                        ${h === 'Payment' ? 'hidden md:table-cell' : ''}
                                        ${h === 'Total' ? 'text-right' : ''}
                                    `}
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {pageOrders.map((order, i) => (
                            <SalesRow
                                key={order.id}
                                order={order}
                                index={page * PAGE_SIZE + i}
                                isSelected={selectedId === order.id}
                                onSelect={() => onSelect(order)}
                            />
                        ))}
                    </tbody>

                    <tfoot>
                        <tr className="border-t-2 border-brown-light/25 bg-transparent">
                            <td
                                colSpan={8}
                                className="px-4 py-4 text-text-dark dark:text-text-light text-sm font-bold font-body text-right hidden md:table-cell"
                            >
                                Total Revenue
                            </td>
                            <td
                                colSpan={8}
                                className="px-4 py-4 text-text-dark dark:text-text-light text-sm font-bold font-body text-right md:hidden"
                            >
                                Total
                            </td>
                            <td className="px-4 py-4 text-primary text-base font-bold font-body text-right whitespace-nowrap">
                                {formatGHS(totalRevenue)}
                            </td>
                            <td className="px-4 py-4" />
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-brand-dark/25 dark:border-brand-dark">
                    <p className="text-neutral-gray text-xs font-body">
                        {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, allOrders.length)} of {allOrders.length}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(p => p - 1)}
                            disabled={page === 0}
                            className="p-1.5 rounded-lg text-text-dark dark:text-text-light disabled:opacity-30 hover:bg-brown-light/10 transition-colors"
                        >
                            <CaretLeftIcon size={12} weight="bold" />
                        </button>
                        <span className="text-xs font-body text-text-dark dark:text-text-light px-2">
                            {page + 1} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={page === totalPages - 1}
                            className="p-1.5 rounded-lg text-text-dark dark:text-text-light disabled:opacity-30 hover:bg-brown-light/10 transition-colors"
                        >
                            <CaretRightIcon size={12} weight="bold" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
