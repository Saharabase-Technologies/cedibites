'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
    ListIcon,
    ChartBarIcon,
    ForkKnifeIcon,
    UsersThreeIcon,
    TrendUpIcon,
    CurrencyCircleDollarIcon,
    ReceiptIcon,
    XCircleIcon,
    ArrowUpRightIcon,
} from '@phosphor-icons/react';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useBranchStats, useBranchTopItems, useBranchRevenueChart } from '@/lib/api/hooks/useBranches';
import { useEmployeeOrders } from '@/lib/api/hooks/useEmployeeOrders';
import { mapApiOrderToAdminOrder } from '@/lib/api/adapters/order.adapter';
import { STATUS_CONFIG } from '@/app/staff/orders/constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGHS(v: number) {
    return `₵${v.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
    icon: Icon,
    label,
    value,
    sub,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    sub?: string;
}) {
    return (
        <div className="bg-neutral-card border border-brown-light/15 rounded-2xl px-4 py-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <Icon size={14} weight="fill" className="text-neutral-gray shrink-0" />
                <span className="text-neutral-gray text-sm font-bold font-body">{label}</span>
            </div>
            <p className="text-3xl font-bold font-body leading-none text-text-dark">{value}</p>
            {sub && <p className="text-neutral-gray text-xs font-body">{sub}</p>}
        </div>
    );
}


function StatusBadge({ status }: { status: string }) {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.received;
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-body font-medium text-text-dark">
            <span className={`h-2 w-2 rounded-full shrink-0 ${config.dot} ${config.pulse ? 'animate-pulse' : ''}`} />
            {config.label}
        </span>
    );
}

function QuickLinkCard({
    href,
    icon: Icon,
    label,
    sub,
}: {
    href: string;
    icon: React.ElementType;
    label: string;
    sub: string;
}) {
    return (
        <Link
            href={href}
            className="
                bg-neutral-card border border-brown-light/30
                rounded-2xl px-4 py-4 flex items-center gap-3
                hover:border-brown-light/60 hover:bg-brown-light/5
                transition-colors group
            "
        >
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Icon size={18} weight="fill" className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-text-dark text-sm font-semibold font-body">{label}</p>
                <p className="text-neutral-gray text-xs font-body truncate">{sub}</p>
            </div>
            <ArrowUpRightIcon size={16} weight="bold" className="text-neutral-gray/50 group-hover:text-neutral-gray transition-colors shrink-0" />
        </Link>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManagerDashboardPage() {
    const { staffUser } = useStaffAuth();
    const branchId = staffUser?.branches[0]?.id ? Number(staffUser.branches[0].id) : null;
    const { stats } = useBranchStats(branchId, true);
    const { topItems } = useBranchTopItems(branchId, { date: 'today', limit: 5 });
    const { chartData } = useBranchRevenueChart(branchId, { period: 'week' });
    const { orders: rawOrders } = useEmployeeOrders({
        branch_id: branchId ?? undefined,
        status: ['received', 'preparing', 'ready', 'ready_for_pickup', 'out_for_delivery'],
        per_page: 5,
    });

    const orders = useMemo(() => rawOrders.map(mapApiOrderToAdminOrder), [rawOrders]);

    const todayRevenue = stats?.today_revenue ?? 0;
    const todayOrders = stats?.today_orders ?? 0;
    const todayCancelled = stats?.today_cancelled ?? 0;
    const todayCancelledRevenue = stats?.today_cancelled_revenue ?? 0;
    const avgOrderValue = todayOrders > 0 ? todayRevenue / todayOrders : 0;
    const monthRevenue = stats?.month_revenue ?? 0;

    // Calculate max sold for progress bars
    const maxSold = topItems.length > 0 ? Math.max(...topItems.map(i => i.sold)) : 1;

    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            {/* ── Period stats ────────────────────────────────────────────────── */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-text-dark font-bold text-base font-body">Today&apos;s Overview</h2>
                    <Link
                        href="/staff/manager/analytics"
                        className="text-primary text-xs font-body hover:text-primary-hover flex items-center gap-1 transition-colors"
                    >
                        <ChartBarIcon size={14} weight="bold" />
                        Full analytics
                    </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard icon={CurrencyCircleDollarIcon} label="Revenue" value={formatGHS(todayRevenue)} sub="Today" />
                    <StatCard icon={ReceiptIcon} label="Orders" value={String(todayOrders)} sub="Today" />
                    <StatCard icon={TrendUpIcon} label="Avg. Value" value={formatGHS(avgOrderValue)} sub="Per order" />
                    <StatCard icon={XCircleIcon} label="Cancelled" value={String(todayCancelled)} sub={todayCancelledRevenue > 0 ? formatGHS(todayCancelledRevenue) + ' lost' : 'Today'} />
                </div>
            </div>

            {/* ── Weekly bar chart ────────────────────────────────────────────── */}
            <div className="bg-neutral-card border border-brown-light/15 rounded-2xl px-4 pt-4 pb-5 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-text-dark text-sm font-semibold font-body">Revenue this week</p>
                    <p className="text-primary text-sm font-bold font-body">{formatGHS(monthRevenue)}</p>
                </div>
                <div className="flex items-end gap-2 h-16">
                    {chartData.length > 0 ? chartData.map((bar, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div
                                className={`w-full rounded-md transition-all ${bar.percentage === Math.max(...chartData.map(d => d.percentage)) ? 'bg-primary' : 'bg-neutral-gray/50'}`}
                                style={{ height: `${Math.max((bar.percentage / 100) * 56, 2)}px` }}
                            />
                            <span className="text-[10px] text-neutral-gray font-body">{bar.day}</span>
                        </div>
                    )) : (
                        // Fallback when no data
                        Array.from({ length: 7 }, (_, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full rounded-md bg-neutral-gray/20 h-2" />
                                <span className="text-[10px] text-neutral-gray font-body">—</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">

                {/* ── Active orders ─────────────────────────────────────────────── */}
                <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-text-dark font-bold text-base font-body">Active Orders</h2>
                        <Link
                            href="/staff/manager/orders"
                            className="text-primary text-xs font-body hover:text-primary-hover flex items-center gap-1 transition-colors"
                        >
                            <ListIcon size={14} weight="bold" />
                            View all
                        </Link>
                    </div>

                    <div className="bg-neutral-card border border-brown-light/15 rounded-2xl overflow-hidden">
                        {/* Table header */}
                        <div className="grid grid-cols-[minmax(0,1fr)_100px_90px_minmax(0,1fr)_80px] gap-3 px-4 py-2.5 border-b border-[#f0e8d8] text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">
                            <span>Customer</span>
                            <span>Order</span>
                            <span>Status</span>
                            <span>Staff</span>
                            <span className="text-right">Time</span>
                        </div>
                        {orders.length > 0 ? orders.slice(0, 5).map((order, i) => {
                            const raw = rawOrders.find(r => String(r.id) === String(order.dbId));
                            const staffName = raw?.staff_name ?? raw?.assigned_employee?.name ?? '—';
                            return (
                                <Link
                                    key={order.id}
                                    href={`/staff/manager/orders?select=${order.id}`}
                                    className={`grid grid-cols-[minmax(0,1fr)_100px_90px_minmax(0,1fr)_80px] gap-3 px-4 py-3 items-center hover:bg-brown-light/5 transition-colors ${
                                        i < Math.min(orders.length, 5) - 1 ? 'border-b border-brown-light/10' : ''
                                    }`}
                                >
                                    <div className="min-w-0">
                                        <p className="text-text-dark text-sm font-semibold font-body truncate">{order.customer}</p>
                                        <p className="text-neutral-gray text-[10px] font-body">{order.source}</p>
                                    </div>
                                    <span className="text-neutral-gray text-xs font-body font-medium">#{order.id}</span>
                                    <StatusBadge status={order.status} />
                                    <p className="text-text-dark text-xs font-body truncate">{staffName}</p>
                                    <span className="text-neutral-gray text-xs font-body text-right">{order.timeAgo ?? order.placedAt}</span>
                                </Link>
                            );
                        }) : (
                            <div className="px-4 py-8 text-center">
                                <p className="text-neutral-gray text-sm font-body">No active orders right now</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Top items ─────────────────────────────────────────────────── */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-text-dark font-bold text-base font-body">Top Items Today</h2>
                        <span className="text-neutral-gray text-xs font-body">by units sold</span>
                    </div>

                    <div className="bg-neutral-card border border-brown-light/15 rounded-2xl overflow-hidden">
                        {topItems.length > 0 ? topItems.map((item, i) => (
                            <div
                                key={item.name}
                                className={`px-4 py-3 flex items-center gap-3 ${i < topItems.length - 1 ? 'border-b border-brown-light/10' : ''}`}
                            >
                                <span className="text-neutral-gray/50 text-xs font-bold font-body w-4 shrink-0">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-text-dark text-sm font-medium font-body truncate">{item.name}</p>
                                    <div className="mt-1 h-1.5 bg-brown-light/15 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary/60 rounded-full"
                                            style={{ width: `${(item.sold / maxSold) * 100}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-text-dark text-xs font-bold font-body">{item.sold} sold</p>
                                    <p className="text-neutral-gray text-[10px] font-body">₵{item.revenue}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="px-4 py-8 text-center">
                                <p className="text-neutral-gray text-sm font-body">No sales data for today</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Manager quick links ─────────────────────────────────────────── */}
            <div>
                <h2 className="text-text-dark font-bold text-base font-body mb-3">Manager Tools</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <QuickLinkCard
                        href="/staff/manager/analytics"
                        icon={ChartBarIcon}
                        label="Full Analytics"
                        sub="Revenue, trends &amp; order history"
                    />
                    <QuickLinkCard
                        href="/staff/manager/menu"
                        icon={ForkKnifeIcon}
                        label="Menu Management"
                        sub="Edit items, toggle availability"
                    />
                    <QuickLinkCard
                        href="/staff/manager/staff"
                        icon={UsersThreeIcon}
                        label="Staff Management"
                        sub="View &amp; manage branch staff"
                    />
                </div>
            </div>

        </div>
    );
}
