'use client';

import { useState } from 'react';
import { STATUS_CONFIG } from '@/app/staff/orders/constants';
import Link from 'next/link';
import {
    CurrencyCircleDollarIcon,
    ReceiptIcon,
    CircleNotchIcon,
    XCircleIcon,
    TrendUpIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    ArrowUpRightIcon,
    ListIcon,
    DownloadSimpleIcon,
    WifiHighIcon,
    DatabaseIcon,
    ClockIcon,
    CheckCircleIcon,
} from '@phosphor-icons/react';

// ─── Mock data ────────────────────────────────────────────────────────────────

const ADMIN = { name: 'Nana Kwame' };

function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

function formatGHS(v: number) {
    return `GHS ${v.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CROSS_BRANCH_KPIS = {
    revenueToday: 8_412.50,
    revenueTrend: +14,
    ordersToday: 97,
    ordersTrend: +8,
    activeOrders: 21,
    activeTrend: +5,
    cancelledToday: 4,
    cancelledTrend: -2,
};

const BRANCHES = [
    {
        id: 'osu',
        name: 'Osu',
        status: 'open' as const,
        revenueToday: 3_210.00,
        ordersToday: 38,
        sparkline: [40, 55, 70, 62, 80, 95, 88],
    },
    {
        id: 'east-legon',
        name: 'East Legon',
        status: 'open' as const,
        revenueToday: 3_680.50,
        ordersToday: 42,
        sparkline: [30, 48, 60, 78, 90, 100, 85],
    },
    {
        id: 'spintex',
        name: 'Spintex',
        status: 'busy' as const,
        revenueToday: 1_522.00,
        ordersToday: 17,
        sparkline: [20, 30, 22, 38, 45, 55, 50],
    },
];

type OrderSource = 'WhatsApp' | 'Phone' | 'Online' | 'POS' | 'Instagram' | 'Facebook';

interface LiveOrder {
    id: string;
    customer: string;
    branch: string;
    source: OrderSource;
    status: string;
    timeAgo: string;
    amount: number;
}

const LIVE_ORDERS: LiveOrder[] = [
    { id: 'CB847291', customer: 'Ama Serwaa', branch: 'Osu', source: 'WhatsApp', status: 'preparing', timeAgo: '2 min', amount: 94 },
    { id: 'CB204837', customer: 'Abena Boateng', branch: 'East Legon', source: 'Instagram', status: 'received', timeAgo: '4 min', amount: 73 },
    { id: 'CB173920', customer: 'Yaw Darko', branch: 'East Legon', source: 'Facebook', status: 'preparing', timeAgo: '8 min', amount: 110 },
    { id: 'CB998812', customer: 'Efua Mensah', branch: 'Osu', source: 'Phone', status: 'ready', timeAgo: '12 min', amount: 59 },
    { id: 'CB774433', customer: 'Kojo Appiah', branch: 'Spintex', source: 'WhatsApp', status: 'out_for_delivery', timeAgo: '18 min', amount: 117 },
    { id: 'CB556677', customer: 'Adwoa Ofori', branch: 'East Legon', source: 'Online', status: 'ready_for_pickup', timeAgo: '25 min', amount: 96 },
    { id: 'CB112233', customer: 'Fiifi Annan', branch: 'Osu', source: 'POS', status: 'delivered', timeAgo: '31 min', amount: 76 },
    { id: 'CB332211', customer: 'Nana Asare', branch: 'Spintex', source: 'Phone', status: 'completed', timeAgo: '38 min', amount: 35 },
    { id: 'CB445566', customer: 'Akua Owusu', branch: 'Osu', source: 'WhatsApp', status: 'preparing', timeAgo: '44 min', amount: 145 },
    { id: 'CB667788', customer: 'Kwame Frimpong', branch: 'East Legon', source: 'Instagram', status: 'received', timeAgo: '51 min', amount: 82 },
];


const SOURCE_COLORS: Record<OrderSource, string> = {
    WhatsApp: 'bg-[#25D366]/10 text-[#128C7E]',
    Instagram: 'bg-pink-50 text-pink-600',
    Facebook: 'bg-blue-50 text-blue-600',
    Phone: 'bg-neutral-light text-neutral-gray',
    Online: 'bg-primary/10 text-primary',
    POS: 'bg-secondary/10 text-secondary',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
    icon: Icon,
    label,
    value,
    trend,
    accent = false,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    trend: number;
    accent?: boolean;
}) {
    const up = trend >= 0;
    return (
        <div className={`rounded-2xl px-5 py-4 flex flex-col gap-2 ${accent ? 'bg-primary' : 'bg-neutral-card border border-[#f0e8d8]'}`}>
            <div className="flex items-center gap-2">
                <Icon size={14} weight="fill" className={accent ? 'text-white/70' : 'text-neutral-gray'} />
                <span className={`text-[10px] font-bold font-body uppercase tracking-widest ${accent ? 'text-white/80' : 'text-neutral-gray'}`}>{label}</span>
            </div>
            <p className={`text-2xl font-bold font-body leading-none ${accent ? 'text-white' : 'text-text-dark'}`}>{value}</p>
            <div className="flex items-center gap-1">
                {up
                    ? <ArrowUpIcon size={11} weight="bold" className={accent ? 'text-white/70' : 'text-secondary'} />
                    : <ArrowDownIcon size={11} weight="bold" className={accent ? 'text-white/70' : 'text-error'} />
                }
                <span className={`text-xs font-semibold font-body ${accent ? 'text-white/80' : (up ? 'text-secondary' : 'text-error')}`}>
                    {Math.abs(trend)}% vs last week
                </span>
            </div>
        </div>
    );
}

function BranchStatusDot({ status }: { status: 'open' | 'closed' | 'busy' }) {
    const cfg = {
        open: { color: 'bg-secondary', label: 'Open' },
        closed: { color: 'bg-error', label: 'Closed' },
        busy: { color: 'bg-warning', label: 'Busy' },
    }[status];
    return (
        <span className="inline-flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${cfg.color} animate-pulse`} />
            <span className="text-[10px] font-body font-medium text-neutral-gray">{cfg.label}</span>
        </span>
    );
}

function Sparkline({ data }: { data: number[] }) {
    const max = Math.max(...data);
    const w = 60;
    const h = 24;
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - (v / max) * h;
        return `${x},${y}`;
    }).join(' ');
    return (
        <svg width={w} height={h} className="shrink-0">
            <polyline
                points={pts}
                fill="none"
                stroke="#e49925"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
        </svg>
    );
}

function SourceBadge({ source }: { source: OrderSource }) {
    return (
        <span className={`text-[10px] font-medium font-body px-2 py-0.5 rounded-full ${SOURCE_COLORS[source]}`}>
            {source}
        </span>
    );
}

function StatusDot({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.received;
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-body font-medium text-text-dark">
            <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot} ${cfg.pulse ? 'animate-pulse' : ''}`} />
            {cfg.label}
        </span>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
    const [_refresh] = useState(0);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-7">
                <div>
                    <h1 className="text-text-dark text-2xl font-bold font-body">
                        {greeting()}, {ADMIN.name}
                    </h1>
                    <p className="text-neutral-gray text-sm font-body mt-1 flex items-center gap-2">
                        {dateStr}
                        <span className="inline-flex items-center gap-1 text-secondary">
                            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                            All branches operational
                        </span>
                    </p>
                </div>
                <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-medium font-body hover:border-primary/40 transition-colors cursor-pointer shrink-0"
                >
                    <DownloadSimpleIcon size={16} weight="bold" className="text-primary" />
                    Export today&apos;s report
                </button>
            </div>

            {/* ── Cross-branch KPI row ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
                <KpiCard icon={CurrencyCircleDollarIcon} label="Revenue Today" value={formatGHS(CROSS_BRANCH_KPIS.revenueToday)} trend={CROSS_BRANCH_KPIS.revenueTrend} accent />
                <KpiCard icon={ReceiptIcon} label="Orders Today" value={String(CROSS_BRANCH_KPIS.ordersToday)} trend={CROSS_BRANCH_KPIS.ordersTrend} />
                <KpiCard icon={CircleNotchIcon} label="Active Now" value={String(CROSS_BRANCH_KPIS.activeOrders)} trend={CROSS_BRANCH_KPIS.activeTrend} />
                <KpiCard icon={XCircleIcon} label="Cancelled Today" value={String(CROSS_BRANCH_KPIS.cancelledToday)} trend={CROSS_BRANCH_KPIS.cancelledTrend} />
            </div>

            {/* ── Branch performance strip ─────────────────────────────────────── */}
            <div className="mb-7">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-text-dark font-bold text-sm font-body uppercase tracking-wider">Branch Performance</h2>
                    <Link href="/admin/branches" className="text-primary text-xs font-body hover:text-primary-hover flex items-center gap-1 transition-colors">
                        <ArrowUpRightIcon size={13} weight="bold" />
                        Manage branches
                    </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {BRANCHES.map(branch => (
                        <Link
                            key={branch.id}
                            href={`/admin/analytics?branch=${branch.id}`}
                            className="bg-neutral-card border border-[#f0e8d8] rounded-2xl px-4 py-4 flex flex-col gap-2 hover:border-primary/30 hover:shadow-sm transition-all group"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-text-dark text-sm font-bold font-body">{branch.name}</span>
                                <BranchStatusDot status={branch.status} />
                            </div>
                            <div className="flex items-end justify-between gap-3">
                                <div>
                                    <p className="text-primary text-lg font-bold font-body leading-none">{formatGHS(branch.revenueToday)}</p>
                                    <p className="text-neutral-gray text-xs font-body mt-1">{branch.ordersToday} orders today</p>
                                </div>
                                <Sparkline data={branch.sparkline} />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── Revenue chart (7-day) ────────────────────────────────────────── */}
            <RevenueChart />

            {/* ── Live order feed ──────────────────────────────────────────────── */}
            <div className="mb-7">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-text-dark font-bold text-sm font-body uppercase tracking-wider">Live Order Feed</h2>
                    <Link href="/admin/orders" className="text-primary text-xs font-body hover:text-primary-hover flex items-center gap-1 transition-colors">
                        <ListIcon size={13} />
                        View all orders
                    </Link>
                </div>
                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                    <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1.2fr_1fr_1fr] gap-4 px-4 py-3 border-b border-[#f0e8d8] bg-[#faf6f0]">
                        {['Customer', 'Branch', 'Source', 'Status', 'Time', 'Amount'].map(h => (
                            <span key={h} className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider">{h}</span>
                        ))}
                    </div>
                    {LIVE_ORDERS.map((order, i) => (
                        <div
                            key={order.id}
                            className={`px-4 py-3 flex flex-col md:grid md:grid-cols-[1.5fr_1fr_1fr_1.2fr_1fr_1fr] gap-2 md:gap-4 md:items-center hover:bg-neutral-light/60 transition-colors ${i < LIVE_ORDERS.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}
                        >
                            <div className="min-w-0">
                                <p className="text-text-dark text-sm font-semibold font-body truncate">{order.customer}</p>
                                <p className="text-neutral-gray text-xs font-body">#{order.id}</p>
                            </div>
                            <span className="text-text-dark text-xs font-body">{order.branch}</span>
                            <span className='text-text-dark text-xs font-body'>{order.source}
                            </span>
                            <StatusDot status={order.status} />
                            <span className="text-neutral-gray text-xs font-body">{order.timeAgo} ago</span>
                            <span className="text-text-dark text-sm font-bold font-body">GHS {order.amount}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── System health ────────────────────────────────────────────────── */}
            <SystemHealth />

        </div>
    );
}

// ─── Revenue chart ────────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const BRANCH_REVENUE: Record<string, number[]> = {
    'Osu': [2800, 3100, 2600, 3400, 3200, 4100, 2100],
    'East Legon': [3100, 3400, 2900, 3800, 3500, 4600, 2400],
    'Spintex': [1200, 1400, 1100, 1600, 1500, 2000, 1000],
};

const BRANCH_COLORS = ['#e49925', '#6c833f', '#c8a87a'];

function RevenueChart() {
    const [stacked, setStacked] = useState(true);
    const branches = Object.keys(BRANCH_REVENUE);
    const totals = DAYS.map((_, i) => branches.reduce((s, b) => s + BRANCH_REVENUE[b][i], 0));
    const maxVal = stacked ? Math.max(...totals) : Math.max(...Object.values(BRANCH_REVENUE).flat());
    const weekTotal = totals.reduce((a, b) => a + b, 0);

    return (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 mb-7">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                    <p className="text-text-dark text-sm font-bold font-body">Revenue — All Branches (7 days)</p>
                    <p className="text-primary text-base font-bold font-body mt-0.5">{formatGHS(weekTotal)}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setStacked(true)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-all cursor-pointer ${stacked ? 'bg-primary text-white' : 'bg-neutral-light text-neutral-gray hover:text-text-dark'}`}
                    >
                        Stacked
                    </button>
                    <button
                        type="button"
                        onClick={() => setStacked(false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-all cursor-pointer ${!stacked ? 'bg-primary text-white' : 'bg-neutral-light text-neutral-gray hover:text-text-dark'}`}
                    >
                        Grouped
                    </button>
                </div>
            </div>

            <div className="flex items-end gap-2 h-32">
                {DAYS.map((day, di) => (
                    <div key={day} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`w-full flex ${stacked ? 'flex-col-reverse' : 'flex-row'} items-end gap-0.5`} style={{ height: 112 }}>
                            {branches.map((b, bi) => {
                                const val = BRANCH_REVENUE[b][di];
                                const h = stacked
                                    ? Math.round((val / maxVal) * 112)
                                    : Math.round((val / maxVal) * 112);
                                return (
                                    <div
                                        key={b}
                                        className="rounded-sm"
                                        style={{
                                            height: stacked ? h : h,
                                            width: stacked ? '100%' : `${100 / branches.length}%`,
                                            background: BRANCH_COLORS[bi],
                                            opacity: 0.85,
                                            transition: 'height 0.3s ease',
                                            flexShrink: 0,
                                        }}
                                    />
                                );
                            })}
                        </div>
                        <span className="text-[9px] text-neutral-gray font-body">{day}</span>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-4">
                {branches.map((b, bi) => (
                    <div key={b} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: BRANCH_COLORS[bi] }} />
                        <span className="text-[11px] text-neutral-gray font-body">{b}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── System health panel ──────────────────────────────────────────────────────

function SystemHealth() {
    const items = [
        { icon: CheckCircleIcon, label: 'Hubtel API', value: 'Connected', color: 'text-secondary' },
        { icon: WifiHighIcon, label: 'WebSocket', value: '3 active', color: 'text-secondary' },
        { icon: DatabaseIcon, label: 'Database', value: '42ms', color: 'text-secondary' },
        { icon: ClockIcon, label: 'Last order', value: '2 mins ago', color: 'text-neutral-gray' },
    ];
    return (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl px-4 py-4 flex flex-wrap gap-4">
            <p className="text-neutral-gray text-xs font-bold font-body uppercase tracking-wider w-full mb-1">System Health</p>
            {items.map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="flex items-center gap-2">
                    <Icon size={14} weight="fill" className={color} />
                    <span className="text-neutral-gray text-xs font-body">{label}:</span>
                    <span className={`text-xs font-semibold font-body ${color}`}>{value}</span>
                </div>
            ))}
        </div>
    );
}
