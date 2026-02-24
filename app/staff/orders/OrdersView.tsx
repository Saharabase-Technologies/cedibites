'use client';

import { MagnifyingGlassIcon, FunnelIcon } from '@phosphor-icons/react';
import { useOrders } from './context';
import DateFilter from './components/DateFilter';
import KanbanColumn from './components/KanbanColumn';
import MobileTabView from './components/MobileTabView';
import OrderDetailPanel from './components/OrderDetailPanel';
import { COLUMNS } from './constants';

// ─── OrdersView ───────────────────────────────────────────────────────────────

export default function OrdersView() {
    const {
        filteredOrders,
        search, setSearch,
        branchFilter, setBranchFilter,
        dateRange, setDateRange,
        showCancelled, setShowCancelled,
        branches,
        receivedCount, preparingCount,
        draggingId, setDraggingId,
        handleDrop, handleAdvance,
        selectedOrder, setSelectedOrder,
    } = useOrders();

    return (
        <div className="flex flex-col h-full">

            {/* ── Top bar ─────────────────────────────────────────────────────── */}
            <div className="shrink-0 px-4 md:px-8 pt-6 pb-4 border-b border-brown-light/15">

                {/* Title row */}
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <h1 className="text-text-dark dark:text-text-light text-xl font-bold font-body">Orders</h1>
                        {receivedCount > 0 && (
                            <p className="text-warning text-xs font-body mt-0.5">
                                {receivedCount} new · {preparingCount} preparing
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowCancelled(s => !s)}
                        className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full border
              text-xs font-body transition-colors cursor-pointer shrink-0
              ${showCancelled
                                ? 'border-error/40 text-error bg-error/5'
                                : 'border-brown-light/25 text-neutral-gray hover:text-text-light'
                            }
            `}
                    >
                        <FunnelIcon size={12} weight={showCancelled ? 'fill' : 'regular'} />
                        {showCancelled ? 'Hide cancelled' : 'Show cancelled'}
                    </button>
                </div>

                {/* Filter row — search + branch + date */}
                <div className="flex gap-2 flex-wrap md:flex-nowrap">

                    {/* Search */}
                    <div className="relative flex-1 min-w-45">
                        <MagnifyingGlassIcon
                            size={16}
                            weight="bold"
                            className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none ${search ? 'text-primary' : 'text-neutral-gray'}`}
                        />
                        <input
                            type="search"
                            placeholder="Name, phone, or order #..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="
                w-full pl-10 pr-4 py-2.5 text-sm font-body
                bg-brown border-2 border-brown-light/20 focus:border-primary
                rounded-full text-text-dark dark:text-text-light
                placeholder:text-neutral-gray outline-none transition-colors duration-150
              "
                        />
                    </div>

                    {/* Branch filter */}
                    <select
                        value={branchFilter}
                        onChange={e => setBranchFilter(e.target.value)}
                        className="
              bg-brown border-2 border-brown-light/20 focus:border-primary
              text-text-dark dark:text-text-light text-sm font-body
              rounded-full px-3.5 py-2.5 outline-none cursor-pointer
              transition-colors duration-150
            "
                    >
                        {branches.map(b => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>

                    {/* Date filter */}
                    <DateFilter value={dateRange} onChange={setDateRange} />
                </div>
            </div>

            {/* ── Desktop Kanban ───────────────────────────────────────────────── */}
            <div className="hidden md:flex flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
                <div className="flex gap-4 px-8 py-5 min-w-max h-full">
                    {COLUMNS.map(col => (
                        <KanbanColumn
                            key={col.id}
                            column={col}
                            orders={filteredOrders.filter(o => col.statuses.includes(o.status))}
                            draggingId={draggingId}
                            onDragStart={(e, id) => { e.dataTransfer.setData('orderId', id); setDraggingId(id); }}
                            onDragEnd={() => setDraggingId(null)}
                            onDrop={handleDrop}
                            onCardClick={setSelectedOrder}
                            onAdvance={handleAdvance}
                        />
                    ))}
                </div>
            </div>

            {/* ── Mobile tab view ──────────────────────────────────────────────── */}
            <div className="md:hidden flex-1 overflow-y-auto px-4 py-4">
                <MobileTabView
                    orders={filteredOrders}
                    onAdvance={handleAdvance}
                    onCardClick={setSelectedOrder}
                />
            </div>

            {/* ── Detail panel ─────────────────────────────────────────────────── */}
            {selectedOrder && <OrderDetailPanel />}
        </div>
    );
}
