'use client';

import { useState } from 'react';
import { TrayIcon } from '@phosphor-icons/react';
import type { StaffOrder, OrderStatus } from '../types';
import { COLUMNS } from '../constants';
import OrderCard from './OrderCard';

// ─── Mobile tab view ──────────────────────────────────────────────────────────

interface MobileTabViewProps {
    orders: StaffOrder[];
    onAdvance: (id: string, status: OrderStatus) => void;
    onCardClick: (order: StaffOrder) => void;
}

export default function MobileTabView({ orders, onAdvance, onCardClick }: MobileTabViewProps) {
    const [activeCol, setActiveCol] = useState(0);
    const col = COLUMNS[activeCol];
    const colOrders = orders.filter(o => col.statuses.includes(o.status));

    return (
        <div className="flex flex-col gap-4">
            {/* Tab pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {COLUMNS.map((c, i) => {
                    const count = orders.filter(o => c.statuses.includes(o.status)).length;
                    return (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setActiveCol(i)}
                            className={`
                flex items-center gap-1.5 shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold font-body
                border transition-all duration-150 cursor-pointer
                ${activeCol === i
                                    ? 'bg-primary text-brand-darker border-primary'
                                    : 'border-brown-light/25 text-neutral-gray hover:text-text-light'
                                }
              `}
                        >
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${c.dot}`} />
                            {c.label}
                            {count > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeCol === i ? 'bg-brand-darker/30 text-brand-darker' : 'bg-brown-light/20 text-neutral-gray'}`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Cards */}
            {colOrders.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16">
                    <TrayIcon size={32} weight="thin" className="text-neutral-gray/40" />
                    <p className="text-neutral-gray/60 text-sm font-body">No {col.label.toLowerCase()} orders</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2.5">
                    {colOrders.map(order => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            onAdvance={onAdvance}
                            onClick={onCardClick}
                            isDragging={false}
                            onDragStart={() => { }}
                            onDragEnd={() => { }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
