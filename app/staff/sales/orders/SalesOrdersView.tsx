'use client';

import { useMemo, useState } from 'react';
import { SpinnerIcon, WarningIcon } from '@phosphor-icons/react';
import type { Order, OrderStatus } from '@/types/order';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useEmployeeOrders } from '@/lib/api/hooks/useEmployeeOrders';
import { mapApiOrderToOrder } from '@/lib/api/adapters/order.adapter';
import { formatGHS } from '@/lib/utils/currency';
import { serverToday } from '@/lib/utils/serverClock';
import { SearchBar, SegmentedTabs, DataTable, type DataTableColumn } from '@/app/inventory/_components';
import { OrderStatusPill } from '@/app/staff/_components/OrderStatusPill';
import { OpenedOrder, OPENED_PANEL, OPENED_ROW } from '@/app/staff/_components/OpenedOrder';
import { goodsOf, moneyLine, owedOn, phoneOf, timeOf } from '@/app/staff/_components/orderFormat';
import { OWES } from '@/app/staff/_components/salesTones';

// Today's Orders, for sales staff (staff portal Section 6). Every order at the
// branch today, one line each. A line opens the order in place, as on My
// Sales. Today is the server's day (D21).

type Tab = 'all' | 'active' | 'owed' | 'done' | 'cancelled';

const ACTIVE: OrderStatus[] = ['received', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'ready_for_pickup', 'cancel_requested'];
const DONE: OrderStatus[] = ['delivered', 'completed'];

const inTab: Record<Tab, (o: Order) => boolean> = {
    all: () => true,
    active: o => ACTIVE.includes(o.status),
    owed: o => owedOn(o) > 0,
    done: o => DONE.includes(o.status),
    cancelled: o => o.status === 'cancelled',
};

export default function SalesOrdersView() {
    const { staffUser } = useStaffAuth();
    const branchId = staffUser?.branches[0]?.id ? Number(staffUser.branches[0].id) : undefined;
    const today = serverToday();

    const { orders: apiOrders, isLoading, error } = useEmployeeOrders(
        branchId ? { branch_id: branchId, date_from: today, date_to: today, per_page: 200 } : undefined,
    );

    const orders = useMemo(
        () => apiOrders.map(mapApiOrderToOrder).sort((a, b) => b.placedAt - a.placedAt),
        [apiOrders],
    );

    const [search, setSearch] = useState('');
    const [tab, setTab] = useState<Tab>('all');

    const count = (t: Tab) => orders.filter(inTab[t]).length;

    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        return orders.filter(o => inTab[tab](o) && (!q
            || o.contact.name.toLowerCase().includes(q)
            || o.orderNumber.toLowerCase().includes(q)
            || (o.contact.phone ?? '').replace(/\s/g, '').includes(q.replace(/\s/g, ''))
            || phoneOf(o).replace(/\s/g, '').includes(q.replace(/\s/g, ''))));
    }, [orders, tab, search]);

    const columns: DataTableColumn<Order>[] = [
        {
            key: 'time',
            header: 'Time',
            width: 'w-24',
            cell: (o, _i, open) => (
                <span className={`tabular-nums whitespace-nowrap ${open ? 'text-text-dark' : 'text-neutral-gray'}`}>{timeOf(o.placedAt)}</span>
            ),
        },
        {
            key: 'order',
            header: 'Order',
            width: 'w-24',
            cell: (o, _i, open) => <span className={open ? 'font-extrabold' : 'font-bold'}>#{o.orderNumber}</span>,
        },
        {
            key: 'customer',
            header: 'Customer',
            cell: (o, _i, open) => (
                <span className="whitespace-nowrap">
                    <span className={open ? 'font-extrabold' : 'font-semibold'}>{o.contact.name || 'Walk-in'}</span>
                    {open && o.contact.phone && (
                        <span className="ml-1.5 text-xs font-bold text-neutral-gray tabular-nums">{phoneOf(o)}</span>
                    )}
                </span>
            ),
        },
        {
            key: 'total',
            header: 'Total',
            align: 'right',
            cell: o => (
                <span className={`font-bold tabular-nums ${o.status === 'cancelled' ? 'text-neutral-gray line-through' : ''}`}>
                    {formatGHS(goodsOf(o))}
                </span>
            ),
        },
        {
            key: 'money',
            header: 'Money',
            cell: o => {
                const m = moneyLine(o);
                return <span className={`whitespace-nowrap tabular-nums ${m.owes ? `font-bold ${OWES}` : ''}`}>{m.label}</span>;
            },
        },
        { key: 'food', header: 'Food', cell: o => <OrderStatusPill status={o.status} /> },
    ];

    if (!branchId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 px-4">
                <WarningIcon size={32} weight="fill" className="text-warning" />
                <p className="text-text-dark text-sm font-semibold">No branch assigned</p>
                <p className="text-neutral-gray text-xs text-center">Your account is not assigned to any branch. Ask your manager.</p>
            </div>
        );
    }

    return (
        <div className="px-4 py-4 md:px-6 md:py-5 xl:px-10 xl:py-7 flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold font-brand text-text-dark">Today&apos;s Orders</h1>
                    <p className="text-neutral-gray text-sm mt-1">
                        {orders.length} {orders.length === 1 ? 'order' : 'orders'} · {count('active')} active
                    </p>
                </div>
                <label className="flex w-full sm:w-75">
                    <span className="sr-only">Search orders</span>
                    <SearchBar value={search} onChange={setSearch} placeholder="Name, order # or phone" />
                </label>
            </div>

            <div className="self-start">
                <SegmentedTabs<Tab>
                    value={tab}
                    onChange={setTab}
                    options={[
                        { value: 'all', label: `All ${orders.length}` },
                        { value: 'active', label: `Active ${count('active')}` },
                        { value: 'owed', label: `Still owed ${count('owed')}` },
                        { value: 'done', label: `Done ${count('done')}` },
                        { value: 'cancelled', label: `Cancelled ${count('cancelled')}` },
                    ]}
                />
            </div>

            {isLoading && orders.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                    <SpinnerIcon size={28} className="text-primary animate-spin" />
                </div>
            ) : error && orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                    <WarningIcon size={28} weight="fill" className="text-error" />
                    <p className="text-text-dark text-sm font-semibold">The orders did not load.</p>
                    <p className="text-neutral-gray text-xs">Check the connection. The list tries again by itself.</p>
                </div>
            ) : (
                <DataTable<Order>
                    key={`${tab}|${search}`}
                    data={shown}
                    columns={columns}
                    rowKey={o => o.id}
                    pageSize={7}
                    expandedContent={o => <OpenedOrder order={o} />}
                    expandOnRowClick
                    caretAt="end"
                    oneOpenAtATime
                    openRowClassName={OPENED_ROW}
                    openPanelClassName={OPENED_PANEL}
                    emptyState={
                        <p className="py-12 text-center text-sm text-neutral-gray">
                            {orders.length === 0 ? 'No orders at the branch today yet.' : 'No order matches that.'}
                        </p>
                    }
                />
            )}
        </div>
    );
}
