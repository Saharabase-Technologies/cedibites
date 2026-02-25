'use client';

import { useState } from 'react';
import type { KanbanColumn as KanbanColumnType, StaffOrder, OrderStatus, UserRole } from '../types';
import { STATUS_CONFIG } from '../constants';
import OrderCard from './OrderCard';

// ─── Kanban column ────────────────────────────────────────────────────────────

interface KanbanColumnProps {
    column: KanbanColumnType;
    orders: StaffOrder[];
    userRole: UserRole;
    draggingId: string | null;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragEnd: () => void;
    onDrop: (e: React.DragEvent, targetStatus: OrderStatus) => void;
    onCardClick: (order: StaffOrder) => void;
    onAdvance: (id: string, status: OrderStatus) => void;
}

export default function KanbanColumn({
    column,
    orders,
    userRole,
    draggingId,
    onDragStart,
    onDragEnd,
    onDrop,
    onCardClick,
    onAdvance,
}: KanbanColumnProps) {
    const [isOver, setIsOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsOver(true);
    };

    return (
        <div
            className="flex flex-col min-w-[220px] md:min-w-[240px] flex-1 max-w-[280px]"
            onDragOver={handleDragOver}
            onDragLeave={() => setIsOver(false)}
            onDrop={e => { setIsOver(false); onDrop(e, column.statuses[0]); }}
        >
            {/* Column header */}
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3 bg-brown dark:bg-brand-dark border-2 ${STATUS_CONFIG[column.statuses[0]]?.color ?? column.color}`}>
                <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_CONFIG[column.statuses[0]]?.dot ?? column.dot} ${STATUS_CONFIG[column.statuses[0]]?.pulse ? 'animate-pulse' : ''}`} />
                <span className="text-text-light text-sm font-semibold font-body flex-1">{column.label}</span>
                <span className="text-text-light text-xs font-body bg-neutral-gray/25 px-2 py-0.5 rounded-full">
                    {orders.length}
                </span>
            </div>

            {/* Drop zone */}
            <div className={`
        flex-1 flex flex-col gap-2.5 rounded-2xl p-2 min-h-[120px]
        transition-all duration-150
        ${isOver && draggingId
                    ? 'bg-primary/5 border-2 border-primary/30 border-dashed'
                    : 'border-2 border-transparent'
                }
      `}>
                {orders.length === 0 && !isOver && (
                    <div className="flex items-center justify-center h-20">
                        <p className="text-neutral-gray/40 text-xs font-body">Empty</p>
                    </div>
                )}
                <div className='overflow-y-auto custom-scrollbar'>
                    {orders.map(order => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            userRole={userRole}
                            onAdvance={onAdvance}
                            onClick={onCardClick}
                            isDragging={draggingId === order.id}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                        />
                    ))}
                </div>
                {isOver && draggingId && (
                    <div className="h-16 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 flex items-center justify-center">
                        <p className="text-primary/60 text-xs font-body">Drop here</p>
                    </div>
                )}
            </div>
        </div>
    );
}
