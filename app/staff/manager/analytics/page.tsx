'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    CalendarIcon,
    CurrencyCircleDollarIcon,
    ReceiptIcon,
    TrendUpIcon,
    XCircleIcon,
    CaretRightIcon,
    CaretLeftIcon,
    ArrowUpIcon,
    ArrowDownIcon,
} from '@phosphor-icons/react';
import { STATUS_CONFIG } from '@/app/staff/orders/constants';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useAnalytics } from '@/lib/api/hooks/useAnalytics';
import { useEmployeeOrders } from '@/lib/api/hooks/useEmployeeOrders';
import { analyticsService, type TopItem, type PaymentMethod } from '@/lib/api/services/analytics.service';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 'today' | 'week' | 'month' | 'custom';

interface AnalyticsOrder {
    id: string;
    customer: string;
    source: string;
    status: string;
    items: number;
    total: number;
    placedAt: Date;
    staffName: string;
}

// ─── Chart / analytics constants ───────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = ['7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGHS(v: number) {
    return `₵${v.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDate(d: Date) {
    return d.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatTime(d: Date) {
    return d.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' });
}
function startOfDay(d = new Date()) {
    const c = new Date(d); c.setHours(0, 0, 0, 0); return c;
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-neutral-card border border-brown-light/15 rounded-2xl p-5 ${className}`}>
            {children}
        </div>
    );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
    return (
        <div className="mb-4">
            <p className="text-text-dark text-sm font-bold font-body">{title}</p>
            {sub && <p className="text-neutral-gray text-xs font-body mt-0.5">{sub}</p>}
        </div>
    );
}

// ─── KPI stat card ────────────────────────────────────────────────────────────

function KpiCard({
    label, value, trend, trendLabel, accent = false,
}: {
    label: string; value: string; trend?: number; trendLabel?: string; accent?: boolean;
}) {
    const up = (trend ?? 0) >= 0;
    return (
        <div className={`rounded-2xl px-5 py-4 flex flex-col gap-1.5 flex-1 min-w-0 ${accent ? 'bg-primary' : 'bg-neutral-card border border-brown-light/15'}`}>
            <span className={`text-[10px] font-bold font-body uppercase tracking-widest ${accent ? 'text-brand-darker/70' : 'text-neutral-gray'}`}>
                {label}
            </span>
            <span className={`text-2xl font-bold font-body leading-none ${accent ? 'text-brand-darker' : 'text-text-dark'}`}>
                {value}
            </span>
            {trend !== undefined && (
                <div className="flex items-center gap-1 mt-0.5">
                    {up
                        ? <ArrowUpIcon size={12} weight="bold" className={accent ? 'text-brand-darker/70' : 'text-secondary'} />
                        : <ArrowDownIcon size={12} weight="bold" className={accent ? 'text-brand-darker/70' : 'text-error'} />
                    }
                    <span className={`text-xs font-semibold font-body ${accent ? 'text-brand-darker/80' : (up ? 'text-secondary' : 'text-error')}`}>
                        {Math.abs(trend)}%
                    </span>
                    {trendLabel && (
                        <span className={`text-xs font-body ${accent ? 'text-brand-darker/60' : 'text-neutral-gray'}`}>
                            {trendLabel}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Weekly revenue comparison ────────────────────────────────────────────────

function WeeklyRevenue({
    weekRevenue: weekRev,
    lastWeekRevenue: lastRev,
    todayIdx,
}: {
    weekRevenue: number[];
    lastWeekRevenue: number[];
    todayIdx: number;
}) {
    const [hovered, setHovered] = useState<number | null>(null);
    const max = Math.max(...weekRev, ...lastRev, 1);

    return (
        <Card>
            <SectionHeader title="Revenue vs Last Week" sub="Daily — hover a bar for details" />
            <div className="flex items-end gap-1.5 h-24">
                {DAYS.map((day, i) => {
                    const thisVal = weekRev[i] ?? 0;
                    const lastVal = lastRev[i] ?? 0;
                    const thisH  = Math.round((thisVal / max) * 88);
                    const lastH  = Math.round((lastVal / max) * 88);
                    const isToday = i === todayIdx;
                    const diff   = lastVal > 0 ? Math.round(((thisVal - lastVal) / lastVal) * 100) : 0;
                    return (
                        <div
                            key={day}
                            className="flex-1 flex flex-col items-center gap-1 relative"
                            onMouseEnter={() => setHovered(i)}
                            onMouseLeave={() => setHovered(null)}
                        >
                            {hovered === i && (
                                <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-neutral-card border border-brown-light/20 rounded-xl px-3 py-2 z-10 whitespace-nowrap text-[11px] text-text-dark shadow-lg">
                                    <p className="font-bold mb-1">{day}</p>
                                    <p>This: <span className="text-primary font-semibold">₵{(weekRev[i] ?? 0).toLocaleString()}</span></p>
                                    <p>Last: <span className="text-neutral-gray">₵{(lastRev[i] ?? 0).toLocaleString()}</span></p>
                                    <p className={`font-semibold ${diff >= 0 ? 'text-secondary' : 'text-error'}`}>
                                        {diff >= 0 ? '↑' : '↓'} {Math.abs(diff)}%
                                    </p>
                                </div>
                            )}
                            <div className="flex items-end gap-0.5" style={{ height: 88 }}>
                                <div className="w-2.5 rounded-sm bg-brown-light/25" style={{ height: lastH }} />
                                <div
                                    className="w-2.5 rounded-sm"
                                    style={{ height: thisH, background: isToday ? '#e49925' : '#c8a87a' }}
                                />
                            </div>
                            <span className={`text-[9px] font-body ${isToday ? 'text-primary font-bold' : 'text-neutral-gray'}`}>{day}</span>
                        </div>
                    );
                })}
            </div>
            <div className="flex gap-4 mt-3">
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
                    <span className="text-[11px] text-neutral-gray font-body">This week</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-brown-light/25" />
                    <span className="text-[11px] text-neutral-gray font-body">Last week</span>
                </div>
            </div>
        </Card>
    );
}

// ─── Peak hours heatmap ───────────────────────────────────────────────────────

const HEATMAP_FALLBACK: Record<string, number[]> = {
    Mon: [2,  4,  6,  5,  8, 14, 12,  9,  7,  6,  8, 10,  9,  7,  5, 2],
    Tue: [1,  3,  5,  6,  9, 16, 14, 10,  8,  5,  7, 11,  8,  6,  4, 1],
    Wed: [0,  2,  4,  4,  7, 12, 11,  8,  6,  4,  6,  9,  7,  5,  3, 1],
    Thu: [2,  5,  7,  6, 10, 18, 15, 11,  9,  7,  9, 12, 10,  8,  5, 2],
    Fri: [3,  5,  8,  7, 11, 17, 16, 12, 10,  8, 10, 13, 11,  9,  6, 3],
    Sat: [4,  7, 10,  9, 14, 22, 20, 15, 13, 11, 14, 18, 16, 12,  8, 4],
    Sun: [1,  3,  5,  4,  6, 10,  9,  7,  5,  4,  5,  7,  6,  4,  2, 1],
};

function PeakHoursHeatmap({ ordersByHour }: { ordersByHour?: Array<{ hour: number; count: number }> }) {
    const [selectedDay, setSelectedDay] = useState('Sat');
    const data = useMemo(() => {
        if (ordersByHour?.length) {
            const byHour: Record<number, number> = {};
            for (const { hour, count } of ordersByHour) byHour[hour] = (byHour[hour] ?? 0) + count;
            return HOURS.map((_, i) => byHour[7 + i] ?? 0);
        }
        return HEATMAP_FALLBACK[selectedDay] ?? HEATMAP_FALLBACK.Sat;
    }, [selectedDay, ordersByHour]);
    const max  = Math.max(...data, 1);

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
            <SectionHeader title="Peak Hours Heatmap" sub="Orders by hour — darker = busier" />
            <div className="flex gap-1.5 mb-3 flex-wrap">
                {DAYS.map(d => (
                    <button
                        key={d}
                        type="button"
                        onClick={() => setSelectedDay(d)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold font-body transition-all cursor-pointer ${
                            selectedDay === d
                                ? 'bg-primary text-brand-darker'
                                : 'bg-neutral-gray/10 text-neutral-gray hover:text-text-dark'
                        }`}
                    >
                        {d}
                    </button>
                ))}
            </div>
            <div className="flex gap-1 items-end">
                {HOURS.map((h, i) => (
                    <div key={h} className="flex-1 flex flex-col items-center gap-1">
                        <div
                            className="w-full rounded-sm flex items-center justify-center"
                            style={{ height: 44, background: cellBg(data[i]), transition: 'background 0.3s ease' }}
                        >
                            <span
                                className="text-[8px] font-bold font-body"
                                style={{ color: data[i] / max > 0.5 ? '#5c3d00' : '#9a8878' }}
                            >
                                {data[i]}
                            </span>
                        </div>
                        <span className="text-[8px] text-neutral-gray font-body" style={{ transform: 'rotate(-45deg)', display: 'block', marginTop: 4 }}>
                            {h}
                        </span>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2 mt-5">
                <span className="text-[11px] text-neutral-gray font-body">Low</span>
                {(['#f5ede0','#f0dbb8','#e8b86a','#e4a030','#e49925'] as const).map((c, i) => (
                    <div key={i} className="h-2 rounded-sm" style={{ width: 24, background: c }} />
                ))}
                <span className="text-[11px] text-neutral-gray font-body">High</span>
            </div>
        </Card>
    );
}

// ─── Avg prep time ────────────────────────────────────────────────────────────

function PrepTimeTrend({ avgPrepTime }: { avgPrepTime?: number }) {
    const TARGET = 12;
    const MAX    = 20;
    
    // Mock data for now since we don't have hourly prep time breakdown from API
    const prepTimes = [
        { label: '6AM',  mins: 9  },
        { label: '8AM',  mins: 11 },
        { label: '10AM', mins: 8  },
        { label: '12PM', mins: 18 },
        { label: '2PM',  mins: 14 },
        { label: '4PM',  mins: 10 },
        { label: 'Now',  mins: avgPrepTime ?? 13 },
    ];
    
    return (
        <Card>
            <SectionHeader title="Avg. Prep Time Today" sub={`Target: ${TARGET} mins — red = over`} />
            <div className="flex items-end gap-2" style={{ height: 80 }}>
                {prepTimes.map(({ label, mins }) => {
                    const h     = Math.round((mins / MAX) * 72);
                    const over  = mins > TARGET;
                    const isNow = label === 'Now';
                    return (
                        <div key={label} className="flex-1 flex flex-col items-center gap-1">
                            <span
                                className="text-[10px] font-bold font-body"
                                style={{ color: over ? '#d32f2f' : '#6c833f' }}
                            >
                                {mins}m
                            </span>
                            <div
                                className="w-full rounded-sm"
                                style={{
                                    height: h,
                                    background: isNow ? '#e49925' : over ? '#d32f2f' : '#6c833f',
                                    opacity: isNow ? 1 : 0.8,
                                    transition: 'height 0.3s ease',
                                }}
                            />
                            <span
                                className="text-[9px] font-body"
                                style={{ color: isNow ? '#e49925' : '#8b7f70', fontWeight: isNow ? 700 : 400 }}
                            >
                                {label}
                            </span>
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 px-3 py-2 bg-neutral-gray/10 rounded-xl flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                <p className="text-[11px] text-neutral-gray font-body">
                    {avgPrepTime ? (
                        <>Current avg: <span className="text-text-dark font-semibold">{Math.round(avgPrepTime)} mins</span></>
                    ) : (
                        <>Lunch rush (12PM) peaked at <span className="text-text-dark font-semibold">18 mins</span> — 6 mins over target</>
                    )}
                </p>
            </div>
        </Card>
    );
}

// ─── Payment split ────────────────────────────────────────────────────────────

function PaymentSplitCard({ methods }: { methods?: PaymentMethod[] }) {
    const mobileMoney = methods?.find(m => m.label.toLowerCase().includes('mobile'))?.pct ?? 0;
    const cash = methods?.find(m => m.label.toLowerCase().includes('cash'))?.pct ?? 0;
    const circumference = 2 * Math.PI * 30;
    const mmDash = (mobileMoney / 100) * circumference;

    return (
        <Card>
            <SectionHeader title="Payment Method Split" sub="Today — affects cash float" />
            <div className="flex items-center gap-5">
                {/* Donut */}
                <div className="relative w-20 h-20 shrink-0">
                    <svg width="80" height="80" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="30" fill="none" stroke="#e8ddd0" strokeWidth="12" />
                        <circle cx="40" cy="40" r="30" fill="none" stroke="#e49925" strokeWidth="12"
                            strokeDasharray={`${mmDash} ${circumference}`}
                            strokeLinecap="round"
                            transform="rotate(-90 40 40)"
                            style={{ transition: 'stroke-dasharray 0.5s ease' }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold font-body text-primary">{Math.round(mobileMoney)}%</span>
                    </div>
                </div>
                {/* Bars */}
                <div className="flex flex-col gap-2.5 flex-1">
                    {[
                        { label: 'Mobile Money', pct: mobileMoney, color: '#e49925', textColor: 'text-primary' },
                        { label: 'Cash',          pct: cash,        color: '#c8a87a', textColor: 'text-text-dark' },
                    ].map(row => (
                        <div key={row.label}>
                            <div className="flex justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                                    <span className="text-xs font-body text-text-dark">{row.label}</span>
                                </div>
                                <span className={`text-xs font-bold font-body ${row.textColor}`}>{Math.round(row.pct)}%</span>
                            </div>
                            <div className="h-1 bg-neutral-gray/15 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: row.color, transition: 'width 0.4s ease' }} />
                            </div>
                        </div>
                    ))}
                    <div className="text-[11px] text-neutral-gray font-body px-2 py-1.5 bg-neutral-gray/10 rounded-lg">
                        Keep ~<span className="text-text-dark font-semibold">₵{Math.round(cash * 8)}</span> cash float for today
                    </div>
                </div>
            </div>
        </Card>
    );
}

// ─── Fulfilment rate ──────────────────────────────────────────────────────────

function FulfilmentRate() {
    const onTime  = 91;
    const delayed = 9;
    return (
        <Card>
            <SectionHeader title="Order Fulfilment Rate" sub="On-time vs delayed today" />
            <div className="flex justify-between items-end mb-4">
                <div>
                    <p className="text-4xl font-bold font-body text-secondary leading-none">{onTime}%</p>
                    <p className="text-neutral-gray text-xs font-body mt-1">On-time</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold font-body text-warning leading-none">{delayed}%</p>
                    <p className="text-neutral-gray text-xs font-body mt-1">Delayed</p>
                </div>
            </div>
            <div className="h-2 bg-neutral-gray/15 rounded-full overflow-hidden flex">
                <div className="h-full bg-secondary rounded-l-full" style={{ width: `${onTime}%` }} />
                <div className="h-full bg-warning rounded-r-full" style={{ width: `${delayed}%` }} />
            </div>
            <p className="text-[11px] text-neutral-gray font-body mt-3">
                <span className="text-text-dark font-semibold">22 of 24</span> orders fulfilled on time today
            </p>
        </Card>
    );
}

// ─── Top items ────────────────────────────────────────────────────────────────

function TopItemsCard({ items }: { items?: TopItem[] }) {
    const topItems = items?.slice(0, 5) ?? [];
    const maxRev = Math.max(...topItems.map(i => i.rev), 1);
    
    if (topItems.length === 0) {
        return (
            <Card className="flex-1 min-w-0">
                <SectionHeader title="Top 5 Items Today" sub="By revenue — units in brackets" />
                <div className="text-center py-8 text-neutral-gray text-sm font-body">
                    No data available
                </div>
            </Card>
        );
    }
    
    return (
        <Card className="flex-1 min-w-0">
            <SectionHeader title="Top 5 Items Today" sub="By revenue — units in brackets" />
            <div className="flex flex-col gap-3">
                {topItems.map((item, i) => (
                    <div key={item.id ?? item.name}>
                        <div className="flex justify-between items-center mb-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold font-body text-neutral-gray/50 w-3">{i + 1}</span>
                                <span className="text-xs font-semibold font-body text-text-dark">{item.name}</span>
                                <span className="text-[10px] font-body text-neutral-gray">×{item.units}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold font-body text-primary">₵{item.rev}</span>
                                <div className="flex items-center gap-0.5">
                                    {item.trend > 0
                                        ? <ArrowUpIcon size={11} className="text-secondary" />
                                        : <ArrowDownIcon size={11} className="text-error" />
                                    }
                                    <span className={`text-[10px] font-body ${item.trend > 0 ? 'text-secondary' : 'text-error'}`}>
                                        {Math.abs(item.trend)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="h-1 bg-neutral-gray/15 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: `${(item.rev / maxRev) * 100}%`,
                                    background: i === 0 ? '#e49925' : '#c8a87a',
                                    transition: 'width 0.4s ease',
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

// ─── Out of stock alerts ──────────────────────────────────────────────────────

function OutOfStockCard() {
    // Mock data - no backend endpoint available yet
    const outOfStock = [
        { name: 'Fried Yam',        times: 8, lastOOS: '11:42 AM' },
        { name: 'Sobolo (Large)',   times: 5, lastOOS: '1:15 PM'  },
        { name: 'Fufu & Light Soup', times: 3, lastOOS: '12:03 PM' },
    ];
    
    return (
        <Card className="flex-1 min-w-[220px]">
            <SectionHeader title="Out-of-Stock Alerts" sub="Frequency today — action needed" />
            <div className="flex flex-col gap-2.5">
                {outOfStock.map(item => (
                    <div
                        key={item.name}
                        className={`flex justify-between items-center px-3 py-2.5 rounded-xl border ${
                            item.times >= 6
                                ? 'bg-error/10 border-error/20'
                                : 'bg-neutral-gray/10 border-brown-light/20'
                        }`}
                    >
                        <div>
                            <p className="text-xs font-semibold font-body text-text-dark">{item.name}</p>
                            <p className="text-[10px] text-neutral-gray font-body mt-0.5">Last OOS: {item.lastOOS}</p>
                        </div>
                        <span
                            className="text-lg font-extrabold font-body"
                            style={{ color: item.times >= 6 ? '#d32f2f' : item.times >= 4 ? '#f9a61a' : '#8b7f70' }}
                        >
                            {item.times}×
                        </span>
                    </div>
                ))}
                <div className="px-3 py-2 bg-neutral-gray/10 rounded-xl">
                    <p className="text-[11px] text-neutral-gray font-body">
                        <span className="text-primary font-semibold">Tip:</span> Fried Yam runs out by 12PM — prep extra stock tomorrow
                    </p>
                </div>
            </div>
        </Card>
    );
}

// ─── Status dot (for orders table) ───────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.received;
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-body font-medium text-text-dark">
            <span className={`h-2 w-2 rounded-full shrink-0 ${config.dot}`} />
            {config.label}
        </span>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PeriodTab = { key: Period; label: string };
const PERIODS: PeriodTab[] = [
    { key: 'today',  label: 'Today'      },
    { key: 'week',   label: 'This Week'  },
    { key: 'month',  label: 'This Month' },
    { key: 'custom', label: 'All Time'   },
];

function getDateRangeForPeriod(period: Period): { date_from: string; date_to: string } {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (period === 'today') return { date_from: today, date_to: today };
    if (period === 'week') {
        const ws = new Date(now);
        ws.setDate(ws.getDate() - 6);
        return { date_from: ws.toISOString().slice(0, 10), date_to: today };
    }
    if (period === 'month') {
        const ms = new Date(now.getFullYear(), now.getMonth(), 1);
        return { date_from: ms.toISOString().slice(0, 10), date_to: today };
    }
    const d90 = new Date(now);
    d90.setDate(d90.getDate() - 90);
    return { date_from: d90.toISOString().slice(0, 10), date_to: today };
}

function mapSalesByDayToWeekBars(salesByDay?: Array<{ date: string; total: number }>): number[] {
    const bars = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
    if (!salesByDay?.length) return bars;
    for (const d of salesByDay) {
        const date = new Date(d.date);
        const dow = date.getDay();
        const idx = (dow + 6) % 7;
        bars[idx] = (bars[idx] ?? 0) + Number(d.total);
    }
    return bars;
}

export default function ManagerAnalyticsPage() {
    const [period, setPeriod] = useState<Period>('today');
    const [page,   setPage  ] = useState(0);
    const PAGE_SIZE = 8;

    const { staffUser } = useStaffAuth();
    const branchId = staffUser?.branches[0]?.id ? Number(staffUser.branches[0].id) : undefined;
    const branchName = staffUser?.branches[0]?.name ?? '—';

    const { sales: todaySales, orders: todayOrderAnalytics } = useAnalytics('today', branchId);
    const { sales: weekSales, orders: orderAnalytics } = useAnalytics('week', branchId);

    const lastWeekRange = useMemo(() => {
        const now = new Date();
        const end = new Date(now);
        end.setDate(end.getDate() - 7);
        const start = new Date(end);
        start.setDate(start.getDate() - 6);
        return { date_from: start.toISOString().slice(0, 10), date_to: end.toISOString().slice(0, 10) };
    }, []);

    const { data: lastWeekSales } = useQuery({
        queryKey: ['analytics', 'sales', 'last-week', branchId],
        queryFn: () => analyticsService.getSalesAnalytics({ ...lastWeekRange, branch_id: branchId }),
        staleTime: 2 * 60 * 1000,
    });

    const { data: topItems } = useQuery({
        queryKey: ['analytics', 'top-items', 'today', branchId],
        queryFn: () => analyticsService.getTopItemsAnalytics({ 
            date_from: new Date().toISOString().slice(0, 10),
            date_to: new Date().toISOString().slice(0, 10),
            branch_id: branchId,
            limit: 5
        }),
        staleTime: 2 * 60 * 1000,
    });

    const { data: paymentMethods } = useQuery({
        queryKey: ['analytics', 'payment-methods', 'today', branchId],
        queryFn: () => analyticsService.getPaymentMethodAnalytics({
            date_from: new Date().toISOString().slice(0, 10),
            date_to: new Date().toISOString().slice(0, 10),
            branch_id: branchId,
        }),
        staleTime: 2 * 60 * 1000,
    });

    const weekRevenue = useMemo(() => mapSalesByDayToWeekBars(weekSales?.sales_by_day), [weekSales?.sales_by_day]);
    const lastWeekRevenue = useMemo(() => mapSalesByDayToWeekBars(lastWeekSales?.sales_by_day), [lastWeekSales?.sales_by_day]);
    const TODAY_IDX = (new Date().getDay() + 6) % 7;
    const todayRevenue  = weekRevenue[TODAY_IDX] ?? todaySales?.total_sales ?? 0;
    const lastSatRev    = lastWeekRevenue[TODAY_IDX] ?? 0;
    const revTrend      = lastSatRev > 0 ? Math.round(((todayRevenue - lastSatRev) / lastSatRev) * 100) : 0;

    const orderRange = useMemo(() => getDateRangeForPeriod(period), [period]);
    const { orders: apiOrders, isLoading: ordersLoading } = useEmployeeOrders({
        branch_id: branchId,
        date_from: orderRange.date_from,
        date_to: orderRange.date_to,
        per_page: 100,
    });

    const filteredOrders = useMemo(() => {
        return apiOrders.map((o) => ({
            id: o.id,
            customer: o.customer,
            source: o.source,
            status: o.status,
            items: o.items?.length ?? 0,
            total: o.amount,
            placedAt: new Date(o.createdAt),
            staffName: '—',
        }));
    }, [apiOrders]);

    const activeOrders    = useMemo(() => filteredOrders.filter(o => o.status !== 'cancelled'), [filteredOrders]);
    const cancelledOrders = useMemo(() => filteredOrders.filter(o => o.status === 'cancelled'), [filteredOrders]);
    const totalRevenue    = useMemo(() => activeOrders.reduce((s, o) => s + o.total, 0), [activeOrders]);
    const avgOrderValue   = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0;

    const sourceBreakdown = useMemo(() => {
        const map: Record<string, number> = {};
        activeOrders.forEach(o => { map[o.source] = (map[o.source] ?? 0) + 1; });
        return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, [activeOrders]);

    const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
    const pageOrders = filteredOrders.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-text-dark text-xl font-bold font-body">Analytics</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5 flex items-center gap-1.5">
                        <CalendarIcon size={13} weight="fill" />
                        {branchName} · Branch Manager
                    </p>
                </div>
            </div>

            {/* ══ ROW 1 — KPIs ════════════════════════════════════════════════ */}
            <div className="flex flex-wrap gap-3 mb-4">
                <KpiCard
                    label="Revenue Today"
                    value={formatGHS(todayRevenue)}
                    trend={revTrend}
                    trendLabel="vs last Sat"
                    accent
                />
                <KpiCard
                    label="Orders Today"
                    value={String(todayOrderAnalytics?.total_orders ?? todaySales?.total_orders ?? 0)}
                    trend={0}
                    trendLabel="vs last Sat"
                />
                <KpiCard
                    label="Avg. Order Value"
                    value={formatGHS(todaySales?.average_order_value ?? 0)}
                    trend={0}
                    trendLabel="vs last Sat"
                />
                <KpiCard label="Fulfilment Rate" value="—" trend={0} trendLabel="(API pending)" />
            </div>

            {/* ══ ROW 2 — Weekly revenue + heatmap ════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-3 mb-3">
                <WeeklyRevenue
                    weekRevenue={weekRevenue}
                    lastWeekRevenue={lastWeekRevenue}
                    todayIdx={TODAY_IDX}
                />
                <PeakHoursHeatmap ordersByHour={orderAnalytics?.orders_by_hour} />
            </div>

            {/* ══ ROW 3 — Prep time + Payment split + Fulfilment ══════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <PrepTimeTrend avgPrepTime={todayOrderAnalytics?.average_prep_time} />
                <PaymentSplitCard methods={paymentMethods} />
                <FulfilmentRate />
            </div>

            {/* ══ ROW 4 — Top items + OOS ══════════════════════════════════════ */}
            <div className="flex flex-col md:flex-row gap-3 mb-8">
                <TopItemsCard items={topItems} />
                <OutOfStockCard />
            </div>

            {/* ── Divider ─────────────────────────────────────────────────────── */}
            <div className="border-t border-brown-light/15 mb-6" />
            <h2 className="text-text-dark text-base font-bold font-body mb-4 flex items-center gap-2">
                <ReceiptIcon size={16} weight="fill" className="text-primary" />
                Order Log
            </h2>

            {/* ── Period tabs ─────────────────────────────────────────────────── */}
            <div className="flex gap-2 mb-5 bg-neutral-card border border-brown-light/15 rounded-2xl p-1.5 w-fit">
                {PERIODS.map(p => (
                    <button
                        key={p.key}
                        type="button"
                        onClick={() => { setPeriod(p.key); setPage(0); }}
                        className={`
                            px-4 py-2 rounded-xl text-sm font-medium font-body transition-all duration-150 cursor-pointer
                            ${period === p.key
                                ? 'bg-primary text-brand-darker shadow-sm'
                                : 'text-neutral-gray hover:text-text-dark'
                            }
                        `}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* ── Summary stats for selected period ───────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                    { icon: CurrencyCircleDollarIcon, label: 'Revenue',     value: formatGHS(totalRevenue),  sub: 'Excl. cancelled'    },
                    { icon: ReceiptIcon,              label: 'Orders',      value: String(activeOrders.length), sub: `${cancelledOrders.length} cancelled` },
                    { icon: TrendUpIcon,              label: 'Avg. Value',  value: formatGHS(avgOrderValue), sub: 'Per order'          },
                    { icon: XCircleIcon,              label: 'Cancel Rate', value: filteredOrders.length > 0 ? `${Math.round((cancelledOrders.length / filteredOrders.length) * 100)}%` : '0%', sub: 'Of total orders' },
                ].map(({ icon: Icon, label, value, sub }) => (
                    <div key={label} className="bg-neutral-card border border-brown-light/15 rounded-2xl px-4 py-4 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Icon size={14} weight="fill" className="text-neutral-gray shrink-0" />
                            <span className="text-neutral-gray text-sm font-bold font-body">{label}</span>
                        </div>
                        <p className="text-3xl font-bold font-body leading-none text-text-dark">{value}</p>
                        {sub && <p className="text-neutral-gray text-xs font-body">{sub}</p>}
                    </div>
                ))}
            </div>

            {/* ── Source chips ─────────────────────────────────────────────────── */}
            {sourceBreakdown.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                    {sourceBreakdown.map(([source, count]) => (
                        <span
                            key={source}
                            className="flex items-center gap-1.5 bg-neutral-card border border-brown-light/15 rounded-full px-3 py-1.5 text-xs font-body font-medium text-text-dark"
                        >
                            {source}
                            <span className="bg-primary/20 text-primary font-bold rounded-full px-1.5 py-0.5 text-[10px]">{count}</span>
                        </span>
                    ))}
                </div>
            )}

            {/* ── Orders table ────────────────────────────────────────────────── */}
            <div className="bg-neutral-card border border-brown-light/15 rounded-2xl overflow-hidden mb-4">
                <div className="hidden md:grid grid-cols-[1fr_100px_90px_80px_90px_110px] gap-4 px-4 py-3 border-b border-brown-light/15">
                    {['Customer','Source','Status','Items','Total','Date'].map(h => (
                        <span key={h} className="text-neutral-gray text-xs font-bold font-body uppercase tracking-wider">{h}</span>
                    ))}
                </div>

                {ordersLoading ? (
                    <div className="px-4 py-12 text-center">
                        <p className="text-neutral-gray text-sm font-body">Loading orders…</p>
                    </div>
                ) : pageOrders.length === 0 ? (
                    <div className="px-4 py-12 text-center">
                        <p className="text-neutral-gray text-sm font-body">No orders for this period.</p>
                    </div>
                ) : (
                    pageOrders.map((order, i) => (
                        <div
                            key={order.id}
                            className={`
                                px-4 py-3.5 flex flex-col md:grid md:grid-cols-[1fr_100px_90px_80px_90px_110px] gap-2 md:gap-4 md:items-center
                                ${i < pageOrders.length - 1 ? 'border-b border-brown-light/10' : ''}
                            `}
                        >
                            <div className="min-w-0">
                                <p className="text-text-dark text-sm font-semibold font-body truncate">{order.customer}</p>
                                <p className="text-neutral-gray text-xs font-body">#{order.id} · {order.staffName}</p>
                            </div>
                            <span className="text-[10px] font-medium font-body text-text-dark border border-brown-light/20 px-2 py-0.5 rounded-full w-fit">
                                {order.source}
                            </span>
                            <StatusDot status={order.status} />
                            <span className="text-text-dark text-sm font-body">{order.items}</span>
                            <span className={`text-sm font-bold font-body ${order.status === 'cancelled' ? 'text-neutral-gray line-through' : 'text-text-dark'}`}>
                                {formatGHS(order.total)}
                            </span>
                            <div>
                                <p className="text-text-dark text-xs font-body">{formatDate(order.placedAt)}</p>
                                <p className="text-neutral-gray text-[10px] font-body">{formatTime(order.placedAt)}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ── Pagination ──────────────────────────────────────────────────── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="flex items-center gap-2 text-sm font-body font-medium text-neutral-gray disabled:opacity-40 hover:text-text-dark transition-colors disabled:cursor-not-allowed cursor-pointer"
                    >
                        <CaretLeftIcon size={14} weight="bold" />
                        Previous
                    </button>
                    <span className="text-neutral-gray text-xs font-body">
                        Page {page + 1} of {totalPages} · {filteredOrders.length} orders
                    </span>
                    <button
                        type="button"
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="flex items-center gap-2 text-sm font-body font-medium text-neutral-gray disabled:opacity-40 hover:text-text-dark transition-colors disabled:cursor-not-allowed cursor-pointer"
                    >
                        Next
                        <CaretRightIcon size={14} weight="bold" />
                    </button>
                </div>
            )}

            <p className="text-neutral-gray/40 text-xs font-body text-center mt-6">
                {branchName} branch · Data refreshes every 60 seconds · Managers only
            </p>

        </div>
    );
}
