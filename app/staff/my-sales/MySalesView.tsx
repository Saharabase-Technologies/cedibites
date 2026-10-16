'use client';

import { useMemo, useState } from 'react';
import { SpinnerGapIcon } from '@phosphor-icons/react';
import type { Order } from '@/types/order';
import { useOrderStore } from '@/app/components/providers/OrderStoreProvider';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useMySalesOrders } from '@/app/staff/hooks/useStaffOrders';
import { useMyMoney } from '@/lib/api/hooks/useMyMoney';
import { formatGHS } from '@/lib/utils/currency';
import { serverToday } from '@/lib/utils/serverClock';
import { PageHeader, SegmentedTabs, DataTable, type DataTableColumn } from '@/app/inventory/_components';
import { QuietRow } from '@/app/staff/_components/QuietRow';
import { OrderStatusPill } from '@/app/staff/_components/OrderStatusPill';
import { OpenedOrder, OPENED_PANEL, OPENED_ROW } from '@/app/staff/_components/OpenedOrder';
import { dayLabel, goodsOf, isNoCharge, owedOn, paidBy, phoneOf, timeOf } from '@/app/staff/_components/orderFormat';
import { OWES } from '@/app/staff/_components/salesTones';
import { MoneyLeadBlock } from './components/MoneyLeadBlock';

// My Sales, for sales staff (staff portal Section 6). The money the person
// took today leads. A quiet row of four figures sits under it, then their
// orders, each opening in place. Today is the server's day (D21).

type Tab = 'all' | 'owed' | 'cancelled';

function plural(n: number, one: string, many: string): string {
    return `${n} ${n === 1 ? one : many}`;
}

export default function MySalesView() {
    const { staffUser } = useStaffAuth();
    const { isLoading, refresh } = useOrderStore();
    const { data: myMoney } = useMyMoney();
    const today = myMoney?.date ?? serverToday();

    const mine = useMySalesOrders(staffUser?.id ?? '', today);
    const orders = useMemo(() => [...mine].sort((a, b) => b.placedAt - a.placedAt), [mine]);
    const [tab, setTab] = useState<Tab>('all');

    const figures = useMemo(() => {
        const live = orders.filter(o => o.status !== 'cancelled');
        const owing = live.filter(o => owedOn(o) > 0);
        return {
            attended: live.length,
            value: live.filter(o => !isNoCharge(o)).reduce((s, o) => s + goodsOf(o), 0),
            owing,
            owed: owing.reduce((s, o) => s + owedOn(o), 0),
            cancelled: orders.filter(o => o.status === 'cancelled').length,
            waiting: orders.filter(o => o.status === 'cancel_requested').length,
        };
    }, [orders]);

    const shown = useMemo(() => {
        if (tab === 'owed') return figures.owing;
        if (tab === 'cancelled') return orders.filter(o => o.status === 'cancelled' || o.status === 'cancel_requested');
        return orders;
    }, [tab, orders, figures.owing]);

    const columns: DataTableColumn<Order>[] = [
        {
            key: 'order',
            header: 'Order',
            cell: o => (
                <>
                    <div className="font-bold">#{o.orderNumber}</div>
                    <div className="text-xs text-neutral-gray tabular-nums">{timeOf(o.placedAt)}</div>
                </>
            ),
        },
        {
            key: 'customer',
            header: 'Customer',
            cell: o => (
                <>
                    <div className="font-semibold">{o.contact.name || 'Walk-in'}</div>
                    {o.contact.phone && <div className="text-xs text-neutral-gray tabular-nums">{phoneOf(o)}</div>}
                </>
            ),
        },
        {
            key: 'paid',
            header: 'Paid by',
            cell: o => {
                const p = paidBy(o);
                return (
                    <>
                        <div className={p.owes ? `font-bold ${OWES}` : ''}>{p.label}</div>
                        {p.sub && <div className={`text-xs tabular-nums ${p.owes ? OWES : 'text-neutral-gray'}`}>{p.sub}</div>}
                    </>
                );
            },
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
        { key: 'status', header: 'Status', cell: o => <OrderStatusPill status={o.status} /> },
    ];

    const owedCount = figures.owing.length;
    const cancelledOrAsked = figures.cancelled + figures.waiting;

    return (
        <div className="px-4 py-4 md:px-6 md:py-5 xl:px-10 xl:py-7">
            <PageHeader title="My Sales" subtitle={`Today only · ${dayLabel(today)}`} />

            <div className="flex flex-col gap-4.5">
                <MoneyLeadBlock money={myMoney} />

                <QuietRow
                    label="Your orders today"
                    figures={[
                        { label: 'Orders Attended', value: String(figures.attended), note: 'Placed or accepted' },
                        { label: 'Order Value', value: formatGHS(figures.value), note: 'Food on those orders' },
                        {
                            label: 'Still Owed',
                            value: formatGHS(figures.owed),
                            note: owedCount > 0 ? plural(owedCount, 'order', 'orders') : 'Nothing owed',
                            noteOwes: owedCount > 0,
                        },
                        {
                            label: 'Cancelled',
                            value: String(figures.cancelled),
                            note: figures.waiting > 0 ? `${figures.waiting} waiting` : 'None waiting',
                            noteOwes: figures.waiting > 0,
                        },
                    ]}
                />

                <div className="flex flex-col gap-2.5 mt-4">
                    <div className="self-start max-w-full">
                        <SegmentedTabs<Tab>
                            value={tab}
                            onChange={setTab}
                            options={[
                                { value: 'all', label: `All ${orders.length}` },
                                { value: 'owed', label: `Still owed ${owedCount}` },
                                { value: 'cancelled', label: `Cancelled and asked ${cancelledOrAsked}` },
                            ]}
                        />
                    </div>

                    {isLoading && orders.length === 0 ? (
                        <div className="flex items-center justify-center gap-2 py-12 text-sm text-neutral-gray">
                            <SpinnerGapIcon size={18} className="animate-spin" />
                            Loading your orders
                        </div>
                    ) : (
                        <DataTable<Order>
                            key={tab}
                            data={shown}
                            columns={columns}
                            rowKey={o => o.id}
                            pageSize={7}
                            expandedContent={o => <OpenedOrder order={o} onCancelAsked={refresh} />}
                            expandOnRowClick
                            caretAt="end"
                            oneOpenAtATime
                            openRowClassName={OPENED_ROW}
                            openPanelClassName={OPENED_PANEL}
                            emptyState={
                                <p className="py-12 text-center text-sm text-neutral-gray">
                                    {tab === 'owed' ? 'Nothing is owed on your orders.'
                                        : tab === 'cancelled' ? 'Nothing cancelled or asked today.'
                                            : 'No orders on your name today yet.'}
                                </p>
                            }
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
