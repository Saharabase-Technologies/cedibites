'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { MagnifyingGlassIcon, FunnelIcon, SpeakerHighIcon, SpeakerSlashIcon, PlusIcon } from '@phosphor-icons/react';
import { useOrders } from './context';
import DateFilter from './components/DateFilter';
import BranchFilter from './components/BranchFilter';
import KanbanColumn from './components/KanbanColumn';
import MobileTabView from './components/MobileTabView';
import OrderDetailPanel from './components/OrderDetailPanel';
import ToastStack from './components/ToastStack';
import { COLUMNS } from './constants';

// ─── OrdersView ───────────────────────────────────────────────────────────────

export default function OrdersView() {
    const {
        orders,
        filteredOrders,
        userRole,
        search, setSearch,
        branchFilter, setBranchFilter,
        dateRange, setDateRange,
        showCancelled, setShowCancelled,
        branches,
        receivedCount, preparingCount,
        draggingId, setDraggingId,
        handleDrop, handleAdvance,
        selectedOrder, setSelectedOrder,
        soundEnabled, toggleSound, playSound,
        notifications, dismissNotification,
        simulateNewOrder,
    } = useOrders();

    // ── Auto-select from ?select=<orderId> (used by dashboard quick-links) ──
    const searchParams = useSearchParams();
    useEffect(() => {
        const selectId = searchParams.get('select');
        if (!selectId) return;
        const order = orders.find(o => o.id === selectId);
        if (order) setSelectedOrder(order);
    }, [searchParams, orders, setSelectedOrder]);

    return (
        <div className="flex flex-col bg-neutral-light dark:bg-brand-darker h-full">

            {/* ── Top bar ─────────────────────────────────────────────────────── */}
            <div className="shrink-0  px-4 md:px-8 pt-6 pb-4 border-b border-brown-light/25">

                {/* Title row */}
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <h1 className="text-text-dark dark:text-text-light text-2xl font-bold font-body">All Orders</h1>
                        {receivedCount > 0 && (
                            <p className="text-warning text-xs font-body mt-0.5">
                                {receivedCount} new · {preparingCount} preparing
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">

                        {/* Simulate new order (test/demo) */}
                        <button
                            type="button"
                            onClick={simulateNewOrder}
                            title="Simulate a new incoming order"
                            className="
                flex items-center gap-1.5 px-3 py-1.5 rounded-full border
                border-primary/40 text-primary bg-primary/5 hover:bg-primary/10
                text-xs font-semibold font-body transition-colors cursor-pointer
              "
                        >
                            <PlusIcon size={12} weight="bold" />
                            Test Order
                        </button>

                        {/* Sound toggle */}
                        <button
                            type="button"
                            onClick={() => { toggleSound(); if (!soundEnabled) playSound('notification'); }}
                            title={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
                            className={`
                flex items-center justify-center w-8 h-8 rounded-full border
                transition-colors cursor-pointer
                ${soundEnabled
                                    ? 'border-brown-light/40 text-neutral-gray hover:text-text-light dark:hover:text-text-light'
                                    : 'border-brown-light/20 text-neutral-gray/40 hover:text-neutral-gray'
                                }
              `}
                        >
                            {soundEnabled
                                ? <SpeakerHighIcon size={13} weight="fill" />
                                : <SpeakerSlashIcon size={13} weight="fill" />
                            }
                        </button>

                        {/* Show/hide cancelled */}
                        <button
                            type="button"
                            onClick={() => setShowCancelled(s => !s)}
                            className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full border
                text-xs font-body transition-colors cursor-pointer
                ${showCancelled
                                    ? 'border-error/40 text-error bg-error/5'
                                    : 'border-brown-light text-text-dark hover:font-semibold dark:text-neutral-gray dark:hover:text-text-light'
                                }
              `}
                        >
                            <FunnelIcon size={12} weight={showCancelled ? 'fill' : 'regular'} />
                            {showCancelled ? 'Hide cancelled' : 'Show cancelled'}
                        </button>
                    </div>
                </div>

                {/* Filter row — search + branch + date */}
                <div className="flex gap-2 items-center flex-wrap md:flex-nowrap">

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
                w-full pl-10 pr-4 py-4 text-sm font-body
                bg-neutral-light dark:bg-brand-dark border-2 border-brown-light/20 focus:border-primary
                rounded-full text-text-dark dark:text-text-light
                placeholder:text-neutral-gray outline-none transition-colors duration-150
              "
                        />
                    </div>

                    {/* Branch filter */}
                    <BranchFilter value={branchFilter} onChange={setBranchFilter} branches={branches} />

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
                            userRole={userRole}
                            draggingId={draggingId}
                            onDragStart={(e, id) => { e.dataTransfer.setData('orderId', id); setDraggingId(id); playSound('pickup'); }}
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
                    userRole={userRole}
                    onAdvance={handleAdvance}
                    onCardClick={setSelectedOrder}
                />
            </div>

            {/* ── Detail panel ─────────────────────────────────────────────────── */}
            {selectedOrder && <OrderDetailPanel />}

            {/* ── Toast notifications ──────────────────────────────────────────── */}
            <ToastStack notifications={notifications} onDismiss={dismissNotification} />
        </div>
    );
}
