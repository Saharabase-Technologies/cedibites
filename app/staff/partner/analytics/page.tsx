'use client';

import { useState, useMemo } from 'react';
import {
    ChartBarIcon,
    CurrencyCircleDollarIcon,
    ReceiptIcon,
    TrendUpIcon,
    XCircleIcon,
    ArrowUpIcon,
    ArrowDownIcon,
} from '@phosphor-icons/react';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useAnalytics } from '@/lib/api/hooks/useAnalytics';
import { formatPrice } from '@/types/order';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const BRANCH_REVENUE_FALLBACK: Record<string, number[]> = {
    'East Legon': [3100, 3400, 2900, 3800, 3500, 4600, 2400],
    'Osu': [2800, 3100, 2600, 3400, 3200, 4100, 2100],
    'Spintex': [1200, 1400, 1100, 1600, 1500, 2000, 1000],
};

const ORDER_SOURCES = [
    { name: 'Online',    pct: 30, color: '#e49925' },
    { name: 'WhatsApp',  pct: 26, color: '#6c833f' },
    { name: 'Phone',     pct: 20, color: '#c8a87a' },
    { name: 'POS',       pct: 15, color: '#1976d2' },
    { name: 'Instagram', pct: 6,  color: '#e91e63' },
    { name: 'Facebook',  pct: 3,  color: '#3f51b5' },
];

const TOP_ITEMS = [
    { name: 'Jollof Rice (Assorted)',  units: 94, rev: 7990, trend: +12 },
    { name: 'Waakye (Special)',        units: 67, rev: 5360, trend: +5  },
    { name: 'Banku & Tilapia',         units: 52, rev: 4160, trend: -3  },
    { name: 'Fried Rice (Plain)',      units: 48, rev: 3120, trend: +8  },
    { name: 'Kelewele',                units: 44, rev: 1760, trend: +22 },
    { name: 'Fufu & Light Soup',       units: 38, rev: 2470, trend: -6  },
    { name: 'Milo Ice Cream',          units: 34, rev: 680,  trend: +15 },
    { name: 'Sobolo (Large)',          units: 29, rev: 725,  trend: +4  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 'today' | 'week' | 'month';

const PERIOD_LABELS: Record<Period, string> = {
    today: 'Today',
    week:  'This Week',
    month: 'This Month',
};

// Multipliers for mock data scaling per period
const PERIOD_SCALE: Record<Period, number> = { today: 1 / 7, week: 1, month: 4.2 };

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, trend, accent = false }: {
    icon: React.ElementType; label: string; value: string; trend: number; accent?: boolean;
}) {
    const up = trend >= 0;
    return (
        <div className={`rounded-2xl px-5 py-4 flex flex-col gap-2 ${accent ? 'bg-primary' : 'bg-neutral-card border border-[#f0e8d8]'}`}>
            <div className="flex items-center gap-2">
                <Icon size={13} weight="fill" className={accent ? 'text-white/70' : 'text-neutral-gray'} />
                <span className={`text-[10px] font-bold font-body uppercase tracking-widest ${accent ? 'text-white/80' : 'text-neutral-gray'}`}>{label}</span>
            </div>
            <p className={`text-2xl font-bold font-body leading-none ${accent ? 'text-white' : 'text-text-dark'}`}>{value}</p>
            <div className="flex items-center gap-1">
                {up
                    ? <ArrowUpIcon size={11} weight="bold" className={accent ? 'text-white/70' : 'text-secondary'} />
                    : <ArrowDownIcon size={11} weight="bold" className={accent ? 'text-white/70' : 'text-error'} />
                }
                <span className={`text-xs font-semibold font-body ${accent ? 'text-white/80' : up ? 'text-secondary' : 'text-error'}`}>
                    {Math.abs(trend)}% vs last {trend === 0 ? '' : 'period'}
                </span>
            </div>
        </div>
    );
}

// ─── Revenue bar chart ────────────────────────────────────────────────────────

function RevenueChart({ data, branchName }: { data: number[]; branchName: string }) {
    const maxVal = Math.max(...data);
    const weekTotal = data.reduce((a, b) => a + b, 0);

    return (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <p className="text-text-dark text-sm font-bold font-body">{branchName} — Revenue (7 days)</p>
                    <p className="text-primary text-base font-bold font-body mt-0.5">{formatPrice(weekTotal)}</p>
                </div>
            </div>
            <div className="flex items-end gap-2 h-32">
                {DAYS.map((day, di) => {
                    const val = data[di];
                    const h = Math.round((val / maxVal) * 112);
                    const isMax = val === maxVal;
                    return (
                        <div key={day} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex flex-col justify-end" style={{ height: 112 }}>
                                <div
                                    className={`w-full rounded-sm transition-all ${isMax ? 'opacity-100' : 'opacity-70'} hover:opacity-100`}
                                    style={{ height: h, background: '#e49925' }}
                                    title={`${day}: ${formatPrice(val)}`}
                                />
                            </div>
                            <span className="text-[9px] text-neutral-gray font-body">{day}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Order sources ────────────────────────────────────────────────────────────

function SourcesChart() {
    return (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5">
            <p className="text-text-dark text-sm font-bold font-body mb-4">Order Sources</p>
            <div className="flex flex-col gap-3">
                {ORDER_SOURCES.map(s => (
                    <div key={s.name}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-text-dark text-xs font-body">{s.name}</span>
                            <span className="text-neutral-gray text-xs font-bold font-body">{s.pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-light overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${s.pct}%`, background: s.color }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Top items ────────────────────────────────────────────────────────────────

function TopItems({ scale }: { scale: number }) {
    return (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f0e8d8]">
                <p className="text-text-dark text-sm font-bold font-body">Top Items</p>
            </div>
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-[#f0e8d8] bg-[#faf6f0]">
                {['Item', 'Units Sold', 'Revenue', 'Trend'].map(h => (
                    <span key={h} className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider">{h}</span>
                ))}
            </div>
            {TOP_ITEMS.map((item, i) => {
                const up = item.trend >= 0;
                return (
                    <div
                        key={item.name}
                        className={`px-5 py-3.5 flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-2 md:gap-4 md:items-center ${i < TOP_ITEMS.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-neutral-gray/40 text-xs font-bold font-body w-4 shrink-0">#{i + 1}</span>
                            <span className="text-text-dark text-sm font-body truncate">{item.name}</span>
                        </div>
                        <span className="text-neutral-gray text-sm font-body">{Math.round(item.units * scale)}</span>
                        <span className="text-text-dark text-sm font-bold font-body">{formatPrice(Math.round(item.rev * scale))}</span>
                        <span className={`flex items-center gap-1 text-xs font-semibold font-body ${up ? 'text-secondary' : 'text-error'}`}>
                            {up ? <ArrowUpIcon size={11} weight="bold" /> : <ArrowDownIcon size={11} weight="bold" />}
                            {Math.abs(item.trend)}%
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartnerAnalyticsPage() {
    const { staffUser } = useStaffAuth();
    const branchId = staffUser?.branches[0]?.id ? Number(staffUser.branches[0].id) : undefined;
    const [period, setPeriod] = useState<Period>('week');
    const analyticsPeriod = period === 'today' ? 'today' : period === 'month' ? 'month' : 'week';
    const { sales, isLoading } = useAnalytics(analyticsPeriod, branchId);
    const branchName = staffUser?.branches[0]?.name ?? '—';

    const scale = PERIOD_SCALE[period];

    const revenueData = useMemo(() => {
        if (sales?.sales_by_day?.length) {
            return sales.sales_by_day.map((d) => Number(d.total));
        }
        return BRANCH_REVENUE_FALLBACK[branchName] ?? BRANCH_REVENUE_FALLBACK['East Legon'];
    }, [sales?.sales_by_day, branchName]);

    const weekRevTotal = revenueData.reduce((a, b) => a + b, 0);
    const kpiRevenue = isLoading ? '…' : formatPrice(sales?.total_sales ?? Math.round(weekRevTotal * scale));
    const kpiOrders = isLoading ? '…' : String(sales?.total_orders ?? Math.round(42 * scale));
    const kpiCompleted = isLoading ? '…' : String(Math.round((sales?.total_orders ?? 38) * 0.9 * scale));
    const kpiCancelled = isLoading ? '…' : String(Math.round(3 * scale));

    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ChartBarIcon size={20} weight="fill" className="text-primary" />
                        <h1 className="text-text-dark text-2xl font-bold font-body">Analytics</h1>
                    </div>
                    <p className="text-neutral-gray text-sm font-body">{branchName} branch performance</p>
                </div>
                {/* Period selector */}
                <div className="flex items-center gap-1 bg-neutral-card border border-[#f0e8d8] rounded-xl p-1">
                    {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-all cursor-pointer ${period === p ? 'bg-primary text-white' : 'text-neutral-gray hover:text-text-dark'}`}
                        >
                            {PERIOD_LABELS[p]}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <KpiCard icon={CurrencyCircleDollarIcon} label="Revenue"   value={kpiRevenue}   trend={+14} accent />
                <KpiCard icon={ReceiptIcon}              label="Orders"    value={kpiOrders}    trend={+8} />
                <KpiCard icon={TrendUpIcon}              label="Completed" value={kpiCompleted} trend={+6} />
                <KpiCard icon={XCircleIcon}              label="Cancelled" value={kpiCancelled} trend={-2} />
            </div>

            {/* Revenue chart */}
            <div className="mb-6">
                <RevenueChart data={revenueData} branchName={branchName} />
            </div>

            {/* Sources + Top items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <SourcesChart />
                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5">
                    <p className="text-text-dark text-sm font-bold font-body mb-4">Order Breakdown</p>
                    <div className="flex flex-col gap-3">
                        {[
                            { label: 'Delivery',  pct: 58, color: '#e49925' },
                            { label: 'Pickup',    pct: 28, color: '#6c833f' },
                            { label: 'Dine In',   pct: 14, color: '#c8a87a' },
                        ].map(r => (
                            <div key={r.label}>
                                <div className="flex justify-between mb-1">
                                    <span className="text-text-dark text-xs font-body">{r.label}</span>
                                    <span className="text-neutral-gray text-xs font-bold font-body">{r.pct}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-neutral-light overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.color }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top items */}
            <TopItems scale={scale} />
        </div>
    );
}
