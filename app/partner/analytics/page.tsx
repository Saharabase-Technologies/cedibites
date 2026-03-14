'use client';

import { useState, useMemo } from 'react';
import {
    CalendarIcon,
    ChartBarIcon,
    CurrencyCircleDollarIcon,
    ReceiptIcon,
    TrendUpIcon,
    UsersIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    DownloadSimpleIcon,
} from '@phosphor-icons/react';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 'today' | 'week' | 'month' | '30d' | '90d' | 'custom';

// ─── Branch-scoped mock data ──────────────────────────────────────────────────

const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = ['7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22'];

const BRANCH_DAILY_REVENUE: Record<string, number[]> = {
    'East Legon': [3100, 3400, 2900, 3800, 3500, 4600, 2400],
    'Osu':        [2800, 3100, 2600, 3400, 3200, 4100, 2100],
    'Spintex':    [1200, 1400, 1100, 1600, 1500, 2000, 1000],
};

const BRANCH_KPIS: Record<string, { revenue: string; orders: number; avgOrder: string; newCustomers: number; fulfilment: string; cancellations: string }> = {
    'East Legon': { revenue: '₵14,480', orders: 189, avgOrder: '₵76.61', newCustomers: 14, fulfilment: '93%', cancellations: '4.2%' },
    'Osu':        { revenue: '₵12,700', orders: 166, avgOrder: '₵76.51', newCustomers: 12, fulfilment: '91%', cancellations: '5.1%' },
    'Spintex':    { revenue: '₵5,210',  orders: 97,  avgOrder: '₵53.71', newCustomers: 6,  fulfilment: '88%', cancellations: '7.2%' },
};

const heatmapData: Record<string, number[]> = {
    Mon: [2,  4,  6,  5,  8, 14, 12,  9,  7,  6,  8, 10,  9,  7,  5, 2],
    Tue: [1,  3,  5,  6,  9, 16, 14, 10,  8,  5,  7, 11,  8,  6,  4, 1],
    Wed: [0,  2,  4,  4,  7, 12, 11,  8,  6,  4,  6,  9,  7,  5,  3, 1],
    Thu: [2,  5,  7,  6, 10, 18, 15, 11,  9,  7,  9, 12, 10,  8,  5, 2],
    Fri: [3,  5,  8,  7, 11, 17, 16, 12, 10,  8, 10, 13, 11,  9,  6, 3],
    Sat: [4,  7, 10,  9, 14, 22, 20, 15, 13, 11, 14, 18, 16, 12,  8, 4],
    Sun: [1,  3,  5,  4,  6, 10,  9,  7,  5,  4,  5,  7,  6,  4,  2, 1],
};

const ORDER_SOURCES = [
    { name: 'Online',    count: 48,  pct: 32, avgValue: 82,  color: '#e49925' },
    { name: 'WhatsApp',  count: 36,  pct: 24, avgValue: 76,  color: '#6c833f' },
    { name: 'Phone',     count: 28,  pct: 18, avgValue: 64,  color: '#c8a87a' },
    { name: 'POS',       count: 22,  pct: 14, avgValue: 55,  color: '#1976d2' },
    { name: 'Instagram', count: 11,  pct: 7,  avgValue: 91,  color: '#e91e63' },
    { name: 'Facebook',  count: 7,   pct: 5,  avgValue: 88,  color: '#3f51b5' },
];

const TOP_ITEMS = [
    { name: 'Jollof Rice (Assorted)',  units: 94,  rev: 7990, trend: +12 },
    { name: 'Waakye (Special)',        units: 67,  rev: 5360, trend: +5  },
    { name: 'Banku & Tilapia',         units: 52,  rev: 4160, trend: -3  },
    { name: 'Fried Rice (Plain)',      units: 48,  rev: 3120, trend: +8  },
    { name: 'Kelewele',                units: 44,  rev: 1760, trend: +22 },
];

const SLOW_ITEMS = [
    { name: 'Fried Yam (Large)',  units: 3, rev: 75,  trend: -15 },
    { name: 'Kenkey & Fish',      units: 5, rev: 175, trend: -18 },
    { name: 'Kokonte & Egusi',    units: 6, rev: 210, trend: -12 },
];

const CATEGORY_REVENUE = [
    { cat: 'Basic Meals',  rev: 18420, pct: 52 },
    { cat: 'Combos',       rev: 8830,  pct: 25 },
    { cat: 'Drinks',       rev: 4960,  pct: 14 },
    { cat: 'Top Ups',      rev: 2120,  pct: 6  },
    { cat: 'Budget Bowls', rev: 1060,  pct: 3  },
];

const TOP_CUSTOMERS = [
    { name: 'Adwoa Ofori',   orders: 42, spend: 3360, last: 'Today'      },
    { name: 'Abena Boateng', orders: 31, spend: 2480, last: 'Today'      },
    { name: 'Ama Serwaa',    orders: 24, spend: 1840, last: 'Today'      },
    { name: 'Kwame Asante',  orders: 18, spend: 1260, last: 'Yesterday'  },
    { name: 'Kojo Appiah',   orders: 14, spend: 1120, last: 'Today'      },
    { name: 'Fiifi Annan',   orders: 12, spend: 912,  last: '2 days ago' },
    { name: 'Efua Mensah',   orders: 11, spend: 770,  last: '2 weeks ago'},
    { name: 'Yaw Darko',     orders: 9,  spend: 675,  last: 'Today'      },
    { name: 'Nana Asare',    orders: 7,  spend: 490,  last: 'Yesterday'  },
    { name: 'Akua Owusu',    orders: 6,  spend: 435,  last: 'Today'      },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGHS(v: number) {
    return `₵${v.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, trend, accent = false, icon: Icon }: {
    label: string; value: string; trend?: number; accent?: boolean; icon: React.ElementType;
}) {
    const up = (trend ?? 0) >= 0;
    return (
        <div className={`rounded-2xl px-5 py-4 flex flex-col gap-2 ${accent ? 'bg-primary' : 'bg-neutral-card border border-[#f0e8d8]'}`}>
            <div className="flex items-center gap-2">
                <Icon size={13} weight="fill" className={accent ? 'text-white/70' : 'text-neutral-gray'} />
                <span className={`text-[10px] font-bold font-body uppercase tracking-widest ${accent ? 'text-white/80' : 'text-neutral-gray'}`}>{label}</span>
            </div>
            <p className={`text-2xl font-bold font-body leading-none ${accent ? 'text-white' : 'text-text-dark'}`}>{value}</p>
            {trend !== undefined && (
                <div className="flex items-center gap-1">
                    {up ? <ArrowUpIcon size={11} weight="bold" className={accent ? 'text-white/70' : 'text-secondary'} />
                        : <ArrowDownIcon size={11} weight="bold" className={accent ? 'text-white/70' : 'text-error'} />}
                    <span className={`text-xs font-semibold font-body ${accent ? 'text-white/80' : (up ? 'text-secondary' : 'text-error')}`}>
                        {Math.abs(trend)}% vs prev. period
                    </span>
                </div>
            )}
        </div>
    );
}

// ─── Card + section title ─────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <div className={`bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 ${className}`}>{children}</div>;
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
    return (
        <div className="mb-4">
            <p className="text-text-dark text-sm font-bold font-body">{title}</p>
            {sub && <p className="text-neutral-gray text-xs font-body mt-0.5">{sub}</p>}
        </div>
    );
}

// ─── Revenue chart (single-branch) ───────────────────────────────────────────

function RevenueChart({ data, branchName }: { data: number[]; branchName: string }) {
    const maxVal = Math.max(...data);
    const weekTotal = data.reduce((a, b) => a + b, 0);

    return (
        <Card>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                    <SectionTitle title={`Daily Revenue — ${branchName}`} sub="7-day view" />
                    <p className="text-primary text-sm font-bold font-body -mt-2">{formatGHS(weekTotal)} this week</p>
                </div>
            </div>
            <div className="flex items-end gap-2 h-32">
                {DAYS.map((day, di) => {
                    const val  = data[di];
                    const h    = Math.round((val / maxVal) * 112);
                    const isMax = val === maxVal;
                    return (
                        <div key={day} className="flex-1 flex flex-col items-center gap-1 group">
                            <div className="w-full flex flex-col justify-end" style={{ height: 112 }}>
                                <div
                                    className={`w-full rounded-sm transition-all ${isMax ? 'opacity-100' : 'opacity-70'} group-hover:opacity-100`}
                                    style={{ height: h, background: '#e49925', transition: 'height 0.3s ease' }}
                                    title={`${day}: ${formatGHS(val)}`}
                                />
                            </div>
                            <span className="text-[9px] text-neutral-gray font-body">{day}</span>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}

// ─── Peak hours heatmap ───────────────────────────────────────────────────────

function PeakHoursHeatmap() {
    const [selectedDay, setSelectedDay] = useState<string>('All');
    const allDays = ['All', ...DAYS];

    const data = useMemo(() => {
        if (selectedDay === 'All') {
            return HOURS.map((_, hi) => DAYS.reduce((s, d) => s + heatmapData[d][hi], 0));
        }
        return heatmapData[selectedDay];
    }, [selectedDay]);

    const max = Math.max(...data);

    function cellBg(val: number) {
        const i = val / max;
        if (i < 0.15) return '#f5ede0';
        if (i < 0.30) return '#f0dbb8';
        if (i < 0.50) return '#e8b86a';
        if (i < 0.70) return '#e4a030';
        return '#e49925';
    }

    return (
        <Card>
            <SectionTitle title="Peak Hours Heatmap" sub="Orders by hour — darker = busier" />
            <div className="flex gap-1.5 mb-3 flex-wrap">
                {allDays.map(d => (
                    <button key={d} type="button" onClick={() => setSelectedDay(d)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold font-body transition-all cursor-pointer ${selectedDay === d ? 'bg-primary text-white' : 'bg-neutral-light text-neutral-gray hover:text-text-dark'}`}>
                        {d}
                    </button>
                ))}
            </div>
            <div className="flex gap-1 items-end">
                {HOURS.map((h, i) => (
                    <div key={h} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-sm flex items-center justify-center"
                            style={{ height: 44, background: cellBg(data[i]), transition: 'background 0.3s ease' }}>
                            <span className="text-[8px] font-bold font-body"
                                style={{ color: data[i] / max > 0.5 ? '#5c3d00' : '#9a8878' }}>{data[i]}</span>
                        </div>
                        <span className="text-[8px] text-neutral-gray font-body"
                            style={{ transform: 'rotate(-45deg)', display: 'block', marginTop: 4 }}>{h}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
}

// ─── Order source donut ───────────────────────────────────────────────────────

function OrderSourceChart() {
    const total = ORDER_SOURCES.reduce((s, x) => s + x.count, 0);
    const circumference = 2 * Math.PI * 32;
    let offset = 0;

    return (
        <Card>
            <SectionTitle title="Order Source Breakdown" />
            <div className="flex flex-col md:flex-row gap-5 items-start">
                {/* Donut */}
                <div className="relative shrink-0 mx-auto">
                    <svg width={100} height={100} viewBox="0 0 100 100">
                        {ORDER_SOURCES.map((src, i) => {
                            const dash = (src.pct / 100) * circumference;
                            const seg = (
                                <circle key={src.name} cx="50" cy="50" r="32" fill="none"
                                    stroke={src.color} strokeWidth="14"
                                    strokeDasharray={`${dash} ${circumference}`}
                                    strokeDashoffset={-offset}
                                    transform="rotate(-90 50 50)"
                                    strokeLinecap="butt"
                                />
                            );
                            offset += dash;
                            return seg;
                        })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-text-dark text-lg font-bold font-body leading-none">{total}</p>
                        <p className="text-neutral-gray text-[9px] font-body">orders</p>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 min-w-0 w-full">
                    {ORDER_SOURCES.map(src => (
                        <div key={src.name} className="flex items-center justify-between py-1.5 border-b border-[#f0e8d8] last:border-0">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: src.color }} />
                                <span className="text-text-dark text-xs font-body">{src.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-text-dark text-xs font-semibold font-body w-6 text-right">{src.count}</span>
                                <span className="text-neutral-gray text-[10px] font-body w-8 text-right">{src.pct}%</span>
                                <span className="text-neutral-gray text-[10px] font-body w-16 text-right">{formatGHS(src.avgValue)}</span>
                            </div>
                        </div>
                    ))}
                    <div className="flex justify-end gap-4 mt-1 pt-1">
                        <span className="text-neutral-gray text-[9px] font-body w-6 text-right">Count</span>
                        <span className="text-neutral-gray text-[9px] font-body w-8 text-right">%</span>
                        <span className="text-neutral-gray text-[9px] font-body w-16 text-right">Avg. Value</span>
                    </div>
                </div>
            </div>
        </Card>
    );
}

// ─── Top / slow items ─────────────────────────────────────────────────────────

type AnyItem = { name: string; units: number; rev: number; trend: number };

function TopItemsCard({ items, title }: { items: AnyItem[]; title: string }) {
    const maxRev = Math.max(...items.map(i => i.rev));
    return (
        <Card>
            <SectionTitle title={title} />
            <div className="flex flex-col gap-3">
                {items.map((item, i) => (
                    <div key={item.name}>
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold font-body text-neutral-gray/50 w-4">{i + 1}</span>
                                <span className="text-xs font-semibold font-body text-text-dark">{item.name}</span>
                                <span className="text-[10px] font-body text-neutral-gray">×{item.units}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-bold font-body text-primary">{formatGHS(item.rev)}</span>
                                <div className="flex items-center gap-0.5">
                                    {item.trend > 0
                                        ? <ArrowUpIcon size={10} className="text-secondary" />
                                        : <ArrowDownIcon size={10} className="text-error" />}
                                    <span className={`text-[10px] font-body ${item.trend > 0 ? 'text-secondary' : 'text-error'}`}>
                                        {Math.abs(item.trend)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="h-1 bg-neutral-gray/15 rounded-full overflow-hidden">
                            <div className="h-full rounded-full"
                                style={{ width: `${(item.rev / maxRev) * 100}%`, background: i === 0 ? '#e49925' : '#c8a87a', transition: 'width 0.4s ease' }} />
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

// ─── Category revenue ─────────────────────────────────────────────────────────

function CategoryRevenue() {
    return (
        <Card>
            <SectionTitle title="Revenue by Category" />
            <div className="flex flex-col gap-3">
                {CATEGORY_REVENUE.map(cat => (
                    <div key={cat.cat}>
                        <div className="flex justify-between mb-1">
                            <span className="text-text-dark text-xs font-body">{cat.cat}</span>
                            <div className="flex gap-3">
                                <span className="text-neutral-gray text-xs font-body">{cat.pct}%</span>
                                <span className="text-text-dark text-xs font-bold font-body">{formatGHS(cat.rev)}</span>
                            </div>
                        </div>
                        <div className="h-1.5 bg-neutral-gray/15 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-primary/70"
                                style={{ width: `${cat.pct}%`, transition: 'width 0.4s ease' }} />
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

// ─── Customer insights ────────────────────────────────────────────────────────

function CustomerInsights() {
    const deliveryPct = 68;
    const pickupPct   = 32;
    const circumference = 2 * Math.PI * 28;
    const delDash = (deliveryPct / 100) * circumference;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Top 10 customers */}
            <Card>
                <SectionTitle title="Top 10 Customers by Spend" />
                <div className="flex flex-col gap-0">
                    {TOP_CUSTOMERS.map((c, i) => (
                        <div key={c.name}
                            className={`flex items-center gap-3 py-2.5 ${i < TOP_CUSTOMERS.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}>
                            <span className="text-neutral-gray/50 text-[10px] font-bold font-body w-4 shrink-0">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-text-dark text-xs font-semibold font-body truncate">{c.name}</p>
                                <p className="text-neutral-gray text-[10px] font-body">{c.orders} orders · Last: {c.last}</p>
                            </div>
                            <span className="text-primary text-xs font-bold font-body shrink-0">{formatGHS(c.spend)}</span>
                        </div>
                    ))}
                </div>
            </Card>

            <div className="flex flex-col gap-3">
                {/* Delivery vs pickup */}
                <Card>
                    <SectionTitle title="Delivery vs Pickup Split" />
                    <div className="flex items-center gap-5">
                        <div className="relative w-20 h-20 shrink-0">
                            <svg width="80" height="80" viewBox="0 0 80 80">
                                <circle cx="40" cy="40" r="28" fill="none" stroke="#f0e8d8" strokeWidth="12" />
                                <circle cx="40" cy="40" r="28" fill="none" stroke="#e49925" strokeWidth="12"
                                    strokeDasharray={`${delDash} ${circumference}`}
                                    strokeLinecap="round" transform="rotate(-90 40 40)" />
                                <circle cx="40" cy="40" r="28" fill="none" stroke="#6c833f" strokeWidth="12"
                                    strokeDasharray={`${(pickupPct / 100) * circumference} ${circumference}`}
                                    strokeDashoffset={-delDash}
                                    strokeLinecap="round" transform="rotate(-90 40 40)" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-bold font-body text-primary">{deliveryPct}%</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 flex-1">
                            {[{ label: 'Delivery', pct: deliveryPct, color: '#e49925' }, { label: 'Pickup', pct: pickupPct, color: '#6c833f' }].map(row => (
                                <div key={row.label}>
                                    <div className="flex justify-between mb-1">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                                            <span className="text-xs font-body text-text-dark">{row.label}</span>
                                        </div>
                                        <span className="text-xs font-bold font-body text-text-dark">{row.pct}%</span>
                                    </div>
                                    <div className="h-1 bg-neutral-gray/15 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full"
                                            style={{ width: `${row.pct}%`, background: row.color, transition: 'width 0.4s ease' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Payment methods */}
                <Card>
                    <SectionTitle title="Payment Methods" />
                    <div className="flex flex-col gap-2">
                        {[
                            { label: 'Mobile Money',     pct: 71, color: '#e49925' },
                            { label: 'Cash on Delivery', pct: 19, color: '#c8a87a' },
                            { label: 'Cash at Pickup',   pct: 10, color: '#8b7f70' },
                        ].map(row => (
                            <div key={row.label}>
                                <div className="flex justify-between mb-1">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                                        <span className="text-xs font-body text-text-dark">{row.label}</span>
                                    </div>
                                    <span className="text-xs font-bold font-body text-text-dark">{row.pct}%</span>
                                </div>
                                <div className="h-1.5 bg-neutral-gray/15 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full"
                                        style={{ width: `${row.pct}%`, background: row.color, transition: 'width 0.4s ease' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}

// ─── Period config ────────────────────────────────────────────────────────────

const PERIODS: { key: Period; label: string }[] = [
    { key: 'today',  label: 'Today'        },
    { key: 'week',   label: 'This Week'    },
    { key: 'month',  label: 'This Month'   },
    { key: '30d',    label: 'Last 30 Days' },
    { key: '90d',    label: 'Last 90 Days' },
    { key: 'custom', label: 'Custom'       },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartnerAnalyticsPage() {
    const { staffUser } = useStaffAuth();
    const branchName = staffUser?.branch ?? 'East Legon';

    const [period, setPeriod] = useState<Period>('week');

    const revenueData = BRANCH_DAILY_REVENUE[branchName] ?? BRANCH_DAILY_REVENUE['East Legon'];
    const kpis        = BRANCH_KPIS[branchName]          ?? BRANCH_KPIS['East Legon'];

    return (
        <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ChartBarIcon size={20} weight="fill" className="text-primary" />
                        <h1 className="text-text-dark text-2xl font-bold font-body">Analytics</h1>
                    </div>
                    <p className="text-neutral-gray text-sm font-body flex items-center gap-1.5">
                        <CalendarIcon size={13} weight="fill" />
                        {branchName} Branch
                    </p>
                </div>
                <button type="button"
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-medium font-body hover:border-primary/40 transition-colors cursor-pointer shrink-0">
                    <DownloadSimpleIcon size={15} weight="bold" className="text-primary" />
                    Export Report
                </button>
            </div>

            {/* Period tabs */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-6">
                {PERIODS.map(p => (
                    <button key={p.key} type="button" onClick={() => setPeriod(p.key)}
                        className={`px-3 py-2 rounded-xl text-sm font-medium font-body whitespace-nowrap transition-all cursor-pointer ${period === p.key ? 'bg-primary text-white' : 'bg-neutral-card border border-[#f0e8d8] text-neutral-gray hover:text-text-dark'}`}>
                        {p.label}
                    </button>
                ))}
            </div>

            {/* KPI row — 6 cards matching admin */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                <KpiCard icon={CurrencyCircleDollarIcon} label="Revenue"       value={kpis.revenue}       trend={+14} accent />
                <KpiCard icon={ReceiptIcon}              label="Orders"        value={String(kpis.orders)} trend={+8} />
                <KpiCard icon={TrendUpIcon}              label="Avg. Order"    value={kpis.avgOrder}       trend={-2} />
                <KpiCard icon={UsersIcon}                label="New Customers" value={String(kpis.newCustomers)} trend={+18} />
                <KpiCard icon={CheckCircleIcon}          label="Fulfilment"    value={kpis.fulfilment}     trend={+3} />
                <KpiCard icon={XCircleIcon}              label="Cancellations" value={kpis.cancellations}  trend={-1} />
            </div>

            {/* Revenue chart + heatmap */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-3 mb-3">
                <RevenueChart data={revenueData} branchName={branchName} />
                <PeakHoursHeatmap />
            </div>

            {/* Source + category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <OrderSourceChart />
                <CategoryRevenue />
            </div>

            {/* Top items + slow movers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <TopItemsCard items={TOP_ITEMS} title="Top 5 Items by Revenue" />
                <TopItemsCard items={SLOW_ITEMS} title="Slow Movers (Last 7 Days)" />
            </div>

            {/* Customer insights */}
            <CustomerInsights />
        </div>
    );
}
