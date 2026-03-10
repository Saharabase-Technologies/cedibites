'use client';

import Link from 'next/link';
import {
    PlusCircleIcon,
    ListIcon,
    ChartBarIcon,
    ForkKnifeIcon,
    UsersThreeIcon,
    TrendUpIcon,
    CurrencyCircleDollarIcon,
    ReceiptIcon,
    XCircleIcon,
    CaretRightIcon,
    ArrowUpRightIcon,
} from '@phosphor-icons/react';
import { STATUS_CONFIG } from '@/app/staff/orders/constants';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MANAGER = { name: 'Ama', branch: 'East Legon' };

const TODAY = {
    revenue: 1842.50,
    orders: 24,
    avgOrderValue: 76.77,
    cancelled: 2,
};

const THIS_WEEK = {
    revenue: 11230.00,
    orders: 148,
    avgOrderValue: 75.88,
    cancelled: 9,
};

const THIS_MONTH = {
    revenue: 43760.00,
    orders: 581,
    avgOrderValue: 75.32,
    cancelled: 31,
};

// Weekly revenue bars (Mon→Sun), relative values 0–100
const WEEKLY_BARS = [
    { day: 'M', pct: 62 },
    { day: 'T', pct: 74 },
    { day: 'W', pct: 55 },
    { day: 'T', pct: 88 },
    { day: 'F', pct: 95 },
    { day: 'S', pct: 100 },
    { day: 'S', pct: 45 },
];

const ACTIVE_ORDERS = [
    { id: 'CB847291', name: 'Ama Serwaa', source: 'WhatsApp', status: 'received', time: '2 mins ago' },
    { id: 'CB204837', name: 'Abena Boateng', source: 'Instagram', status: 'preparing', time: '9 mins ago' },
    { id: 'CB998812', name: 'Efua Mensah', source: 'Phone', status: 'ready', time: '18 mins ago' },
    { id: 'CB774433', name: 'Kojo Appiah', source: 'WhatsApp', status: 'out_for_delivery', time: '35 mins ago' },
    { id: 'CB556677', name: 'Adwoa Ofori', source: 'Phone', status: 'ready_for_pickup', time: '42 mins ago' },
];

const TOP_ITEMS = [
    { name: 'Jollof Rice', sold: 18, revenue: 630 },
    { name: 'Waakye', sold: 12, revenue: 360 },
    { name: 'Banku & Tilapia', sold: 9, revenue: 495 },
    { name: 'Fufu & Light Soup', sold: 7, revenue: 315 },
    { name: 'Kelewele', sold: 11, revenue: 220 },
];

const MAX_SOLD = Math.max(...TOP_ITEMS.map(i => i.sold));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGHS(v: number) {
    return `GHS ${v.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

function SourceBadge({ source }: { source: string }) {
    return (
        <span className="text-[10px] font-medium font-body text-text-dark border border-brown-light/20 px-2 py-0.5 rounded-full">
            {source}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.received;
    return (
        <span className="inline-flex items-center gap-1.5 py-2 text-xs text-text-dark font-bold font-body px-2.5">
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
    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            {/* ── Header ──────────────────────────────────────────────────────── */}


            {/* ── Primary CTA ─────────────────────────────────────────────────── */}


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
                    <StatCard icon={CurrencyCircleDollarIcon} label="Revenue" value={formatGHS(TODAY.revenue)} sub="Today" />
                    <StatCard icon={ReceiptIcon} label="Orders" value={String(TODAY.orders)} sub="Today" />
                    <StatCard icon={TrendUpIcon} label="Avg. Value" value={formatGHS(TODAY.avgOrderValue)} sub="Per order" />
                    <StatCard icon={XCircleIcon} label="Cancelled" value={String(TODAY.cancelled)} sub="Today" />
                </div>
            </div>

            {/* ── Weekly bar chart ────────────────────────────────────────────── */}
            <div className="bg-neutral-card border border-brown-light/15 rounded-2xl px-4 pt-4 pb-5 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-text-dark text-sm font-semibold font-body">Revenue this week</p>
                    <p className="text-primary text-sm font-bold font-body">{formatGHS(THIS_WEEK.revenue)}</p>
                </div>
                <div className="flex items-end gap-2 h-16">
                    {WEEKLY_BARS.map((bar, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div
                                className={`w-full rounded-md transition-all ${i === 5 ? 'bg-primary' : 'bg-neutral-gray/50'}`}
                                style={{ height: `${(bar.pct / 100) * 56}px` }}
                            />
                            <span className="text-[10px] text-neutral-gray font-body">{bar.day}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">

                {/* ── Active orders ─────────────────────────────────────────────── */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-text-dark font-bold text-base font-body">Active Orders</h2>
                        <Link
                            href="/staff/orders"
                            className="text-primary text-xs font-body hover:text-primary-hover flex items-center gap-1 transition-colors"
                        >
                            <ListIcon size={14} weight="bold" />
                            View all
                        </Link>
                    </div>

                    <div className="flex flex-col gap-2">
                        {ACTIVE_ORDERS.map(order => (
                            <Link
                                key={order.id}
                                href={`/staff/orders?select=${order.id}`}
                                className="
                                    bg-neutral-card border border-brown-light/30
                                    rounded-2xl px-4 py-3 flex items-center justify-between gap-3
                                    hover:border-brown-light/60 hover:bg-brown-light/5 transition-colors group
                                "
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-text-dark text-sm font-bold font-body">{order.name}</span>
                                        <SourceBadge source={order.source} />
                                    </div>
                                    <span className="text-neutral-gray text-xs font-body">#{order.id} &middot; {order.time}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <StatusBadge status={order.status} />
                                    <CaretRightIcon size={12} weight="bold" className="text-neutral-gray/40 group-hover:text-neutral-gray transition-colors" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* ── Top items ─────────────────────────────────────────────────── */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-text-dark font-bold text-base font-body">Top Items Today</h2>
                        <span className="text-neutral-gray text-xs font-body">by units sold</span>
                    </div>

                    <div className="bg-neutral-card border border-brown-light/15 rounded-2xl overflow-hidden">
                        {TOP_ITEMS.map((item, i) => (
                            <div
                                key={item.name}
                                className={`px-4 py-3 flex items-center gap-3 ${i < TOP_ITEMS.length - 1 ? 'border-b border-brown-light/10' : ''}`}
                            >
                                <span className="text-neutral-gray/50 text-xs font-bold font-body w-4 shrink-0">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-text-dark text-sm font-medium font-body truncate">{item.name}</p>
                                    <div className="mt-1 h-1.5 bg-brown-light/15 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary/60 rounded-full"
                                            style={{ width: `${(item.sold / MAX_SOLD) * 100}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-text-dark text-xs font-bold font-body">{item.sold} sold</p>
                                    <p className="text-neutral-gray text-[10px] font-body">GHS {item.revenue}</p>
                                </div>
                            </div>
                        ))}
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
