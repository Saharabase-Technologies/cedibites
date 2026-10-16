'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, CaretRightIcon, CashRegisterIcon } from '@phosphor-icons/react';
import type { Order, OrderStatus } from '@/types/order';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useEmployeeOrders } from '@/lib/api/hooks/useEmployeeOrders';
import { mapApiOrderToOrder } from '@/lib/api/adapters/order.adapter';
import { formatGHS } from '@/lib/utils/currency';
import { serverNow, serverToday } from '@/lib/utils/serverClock';
import { DataTable, type DataTableColumn } from '@/app/inventory/_components';
import { useMySalesOrders } from '@/app/staff/hooks/useStaffOrders';
import { QuietRow } from '@/app/staff/_components/QuietRow';
import { OrderStatusPill } from '@/app/staff/_components/OrderStatusPill';
import { OpenedOrder, OPENED_PANEL, OPENED_ROW } from '@/app/staff/_components/OpenedOrder';
import { dayLabel, firstName, goodsOf, paidBy, sourceLabel, timeOf } from '@/app/staff/_components/orderFormat';
import { OWES } from '@/app/staff/_components/salesTones';

// The Dashboard, for sales staff (staff portal Section 6). Open POS leads, in
// the full red. A quiet row says where the branch's food is, then the active
// orders, each opening in place. The greeting and the day go by the server's
// clock (D21).

const WAITING: OrderStatus[] = ['received', 'accepted'];
const PREPARING: OrderStatus[] = ['preparing'];
const READY: OrderStatus[] = ['ready', 'ready_for_pickup', 'out_for_delivery'];
const ACTIVE: OrderStatus[] = [...WAITING, ...PREPARING, ...READY];

/** Morning before 12, afternoon to 5 pm, evening after. Ghana is UTC+0. */
function greeting(): string {
    const hour = serverNow().getUTCHours();
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

export default function SalesDashboardView() {
    const { staffUser } = useStaffAuth();
    const branch = staffUser?.branches[0];
    const branchId = branch?.id ? Number(branch.id) : undefined;
    const today = serverToday();

    const { orders: apiOrders, isLoading } = useEmployeeOrders(
        branchId ? { branch_id: branchId, status: ACTIVE, date_from: today, date_to: today, per_page: 100 } : undefined,
    );
    const active = useMemo(
        () => apiOrders.map(mapApiOrderToOrder).filter(o => ACTIVE.includes(o.status)).sort((a, b) => b.placedAt - a.placedAt),
        [apiOrders],
    );

    const mine = useMySalesOrders(staffUser?.id ?? '', today);
    const attended = mine.filter(o => o.status !== 'cancelled').length;
    const count = (statuses: OrderStatus[]) => active.filter(o => statuses.includes(o.status)).length;

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
                    <div className="text-xs text-neutral-gray">{sourceLabel(o)}</div>
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
            cell: o => <span className="font-bold tabular-nums">{formatGHS(goodsOf(o))}</span>,
        },
        { key: 'status', header: 'Status', cell: o => <OrderStatusPill status={o.status} /> },
    ];

    const name = firstName(staffUser?.name);

    return (
        <div className="px-4 py-4 md:px-6 md:py-5 xl:px-10 xl:py-7 flex flex-col gap-4.5">
            <div>
                <h1 className="text-2xl font-bold font-brand text-text-dark">{greeting()}{name ? `, ${name}` : ''}</h1>
                <p className="text-neutral-gray text-sm mt-1">
                    {branch?.name ? `${branch.name} · ` : ''}{dayLabel(today)}
                </p>
            </div>

            <Link
                href="/pos/terminal"
                target="_blank"
                rel="noopener noreferrer"
                className="group min-h-19 flex items-center justify-between gap-4 px-5 py-3.5 mb-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
                <span className="flex items-center gap-3.5">
                    <CashRegisterIcon size={28} aria-hidden />
                    <span className="flex flex-col gap-1">
                        <span className="text-lg font-extrabold leading-none">Open POS</span>
                        <span className="text-xs text-[#ffe3e3]">Walk-in, phone and delivery orders</span>
                    </span>
                </span>
                <ArrowRightIcon size={22} weight="bold" aria-hidden className="transition-transform group-hover:translate-x-0.5" />
            </Link>

            <QuietRow
                label="Food at the branch now"
                figures={[
                    { label: 'Waiting', value: String(count(WAITING)) },
                    { label: 'Preparing', value: String(count(PREPARING)) },
                    { label: 'Ready', value: String(count(READY)) },
                    { label: 'Attended today', value: String(attended) },
                ]}
            />

            <section aria-labelledby="active-orders" className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-3">
                    <h2 id="active-orders" className="text-[15px] font-bold text-text-dark">Active orders</h2>
                    <Link href="/staff/sales/orders" className="min-h-11 flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
                        View all
                        <CaretRightIcon size={14} weight="bold" aria-hidden />
                    </Link>
                </div>

                <DataTable<Order>
                    data={active}
                    columns={columns}
                    rowKey={o => o.id}
                    pageSize={7}
                    isLoading={isLoading && active.length === 0}
                    expandedContent={o => <OpenedOrder order={o} />}
                    expandOnRowClick
                    caretAt="end"
                    oneOpenAtATime
                    openRowClassName={OPENED_ROW}
                    openPanelClassName={OPENED_PANEL}
                    emptyState={<p className="py-12 text-center text-sm text-neutral-gray">No orders waiting on the kitchen.</p>}
                />
            </section>
        </div>
    );
}
