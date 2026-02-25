'use client';

import { useState, useMemo, useCallback } from 'react';
import {
    ClockIcon,
    ReceiptIcon,
    CurrencyCircleDollarIcon,
    ListChecksIcon,
    TrendUpIcon,
    WarningCircleIcon,
} from '@phosphor-icons/react';
import type { SalesOrder } from './types';
import { MY_SALES_TODAY } from './constants';
import { formatGHS, formatDate, itemCount } from './utils';
import StatCard from './components/StatCard';
import SourcePills from './components/SourcePills';
import SalesTable from './components/SalesTable';
import OrderDrawer from './components/OrderDrawer';

export default function MySalesView() {
    // TODO: fetch from GET /api/v1/staff/my-sales?period=today
    const orders = MY_SALES_TODAY;

    const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);

    const handleClose = useCallback(() => setSelectedOrder(null), []);
    const handleSelect = useCallback((order: SalesOrder) => {
        setSelectedOrder(prev => prev?.id === order.id ? null : order);
    }, []);

    const activeOrders = useMemo(() => orders.filter(o => o.status !== 'cancelled'), [orders]);
    const cancelledOrders = useMemo(() => orders.filter(o => o.status === 'cancelled'), [orders]);
    const totalRevenue = useMemo(() => activeOrders.reduce((s, o) => s + o.total, 0), [activeOrders]);
    const totalItems = useMemo(() => activeOrders.reduce((s, o) => s + itemCount(o), 0), [activeOrders]);
    const avgOrderValue = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0;

    const sourceBreakdown = useMemo(() => {
        const map: Record<string, number> = {};
        activeOrders.forEach(o => { map[o.source] = (map[o.source] ?? 0) + 1; });
        return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, [activeOrders]);

    return (
        <>
            <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">

                {/* ── Header ────────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
                    <div>
                        <h1 className="text-text-dark dark:text-text-light text-xl font-bold font-body">My Sales</h1>
                        <p className="text-neutral-gray text-sm font-body mt-0.5 flex items-center gap-1.5">
                            <ClockIcon size={13} weight="fill" />
                            {formatDate(new Date())}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 bg-warning/10 border border-warning/25 rounded-xl px-3 py-2 w-fit">
                        <WarningCircleIcon size={14} weight="fill" className="text-warning shrink-0" />
                        <p className="text-warning text-xs font-body font-medium">Today only · 24-hour view</p>
                    </div>
                </div>

                {/* ── Stats ─────────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <StatCard
                        icon={ReceiptIcon}
                        label="Orders Placed"
                        value={String(activeOrders.length)}
                        sub={cancelledOrders.length > 0 ? `${cancelledOrders.length} cancelled` : 'No cancellations'}
                        accent="text-text-light"
                    />
                    <StatCard
                        icon={CurrencyCircleDollarIcon}
                        label="Revenue Generated"
                        value={formatGHS(totalRevenue)}
                        sub="Excl. cancelled"
                        accent="text-text-light dark:text-text-light/75"
                    />
                    <StatCard
                        icon={ListChecksIcon}
                        label="Items Sold"
                        value={String(totalItems)}
                        accent="text-text-light dark:text-text-light/75"
                    />
                    <StatCard
                        icon={TrendUpIcon}
                        label="Avg. Order Value"
                        value={formatGHS(avgOrderValue)}
                        accent="text-text-light dark:text-text-light/75"
                    />
                </div>

                {/* ── Source breakdown pills ────────────────────────────────── */}
                <SourcePills breakdown={sourceBreakdown} />

                {/* ── Orders table ──────────────────────────────────────────── */}
                <SalesTable
                    activeOrders={activeOrders}
                    cancelledOrders={cancelledOrders}
                    totalRevenue={totalRevenue}
                    selectedId={selectedOrder?.id ?? null}
                    onSelect={handleSelect}
                />

                <p className="text-neutral-gray/40 text-xs font-body text-center mt-6">
                    Shows only orders you placed today · Click any row for full detail · Contact your branch manager for historical data.
                </p>

            </div>

            <OrderDrawer order={selectedOrder} onClose={handleClose} />
        </>
    );
}
