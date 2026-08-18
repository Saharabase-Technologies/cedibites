'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    CalendarIcon,
    CurrencyCircleDollarIcon,
    TrendUpIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    FileCsvIcon,
} from '@phosphor-icons/react';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useAnalytics } from '@/lib/api/hooks/useAnalytics';
import { analyticsService, type TopItem, type PaymentMethod } from '@/lib/api/services/analytics.service';
import { useBranchesApi } from '@/lib/api/hooks/useBranchesApi';
import { buildReportHtml, printReport, generateCsv, type ReportData, type ReportMeta, type ItemSoldRow } from '@/lib/utils/reportGenerator';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';

// ─── Chart / analytics constants ───────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeStrToHour(t: string | null | undefined): number | null {
    if (!t) return null;
    const h = parseInt(t.split(':')[0], 10);
    return isNaN(h) ? null : h;
}

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
    label, value, trend, trendLabel, sub, accent = false,
}: {
    label: string; value: string; trend?: number; trendLabel?: string; sub?: string; accent?: boolean;
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
            {sub && (
                <span className={`text-xs font-body ${accent ? 'text-brand-darker/60' : 'text-neutral-gray'}`}>
                    {sub}
                </span>
            )}
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
            <SectionHeader title="Revenue vs Last Week" sub="Daily. Hover a bar for details." />
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
                            <div className="flex items-end gap-0.5 relative" style={{ height: 88 }}>
                                {thisVal > 0 && (
                                    <span className="absolute -top-4 right-0 text-[8px] font-bold text-primary leading-none whitespace-nowrap">
                                        {thisVal >= 1000 ? `${(thisVal / 1000).toFixed(1)}k` : Math.round(thisVal)}
                                    </span>
                                )}
                                <div className="w-4 rounded-sm bg-brown-light/25" style={{ height: lastH }} />
                                <div
                                    className="w-4 rounded-sm"
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

function PeakHoursHeatmap({ ordersByHour, branchId }: { ordersByHour?: Array<{ hour: number; count: number }>; branchId?: number }) {
    const { branches: apiBranches } = useBranchesApi();

    const { startHour, endHour } = useMemo(() => {
        let earliest = 7;
        let latest = 22;
        const branch = apiBranches.find(b => b.id === branchId);
        if (branch?.operating_hours) {
            const opens: number[] = [];
            const closes: number[] = [];
            Object.values(branch.operating_hours).forEach((oh) => {
                if (oh?.is_open) {
                    const o = timeStrToHour(oh.open_time);
                    const c = timeStrToHour(oh.close_time);
                    if (o !== null) opens.push(o);
                    if (c !== null) closes.push(c);
                }
            });
            if (opens.length) earliest = Math.min(...opens);
            if (closes.length) latest = Math.max(...closes);
        }
        return { startHour: Math.max(0, earliest), endHour: Math.min(23, latest) };
    }, [apiBranches, branchId]);

    const hours = useMemo(() => {
        const result: string[] = [];
        for (let h = startHour; h <= endHour; h++) result.push(String(h));
        return result;
    }, [startHour, endHour]);

    const data = useMemo(() => {
        const byHour: Record<number, number> = {};
        for (const { hour, count } of ordersByHour ?? []) {
            byHour[hour] = (byHour[hour] ?? 0) + count;
        }
        return hours.map((_, i) => byHour[startHour + i] ?? 0);
    }, [ordersByHour, hours, startHour]);
    const max  = Math.max(...data, 1);
    const openLabel = `${startHour}:00-${endHour}:00`;

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
            <SectionHeader title="Peak Hours Heatmap" sub={`Orders by hour, darker = busier · ${openLabel}`} />
            <div className="flex gap-1 items-end">
                {hours.map((h, i) => (
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
    const currentPrepTime = avgPrepTime ?? 0;
    const hasPrepData = avgPrepTime !== undefined && avgPrepTime > 0;
    
    return (
        <Card>
            <SectionHeader title="Avg. Prep Time Today" sub={`Target: ${TARGET} mins`} />
            <div className="flex items-end gap-4" style={{ height: 80 }}>
                <div className="flex-1 flex flex-col items-center gap-1">
                    <span
                        className="text-[10px] font-bold font-body"
                        style={{ color: currentPrepTime > TARGET ? '#d32f2f' : '#6c833f' }}
                    >
                        {Math.round(currentPrepTime)}m
                    </span>
                    <div
                        className="w-full rounded-sm"
                        style={{
                            height: Math.round((Math.min(currentPrepTime, MAX) / MAX) * 72),
                            background: currentPrepTime > TARGET ? '#d32f2f' : '#6c833f',
                            transition: 'height 0.3s ease',
                        }}
                    />
                    <span className="text-[9px] font-body text-primary font-bold">Current</span>
                </div>
            </div>
            <div className="mt-3 px-3 py-2 bg-neutral-gray/10 rounded-xl flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                <p className="text-[11px] text-neutral-gray font-body">
                    {hasPrepData ? (
                        <>Current avg: <span className="text-text-dark font-semibold">{Math.round(avgPrepTime)} mins</span></>
                    ) : (
                        <>No prep-time data yet for today.</>
                    )}
                </p>
            </div>
        </Card>
    );
}

// ─── Payment split ────────────────────────────────────────────────────────────

function PaymentSplitCard({ methods }: { methods?: PaymentMethod[] }) {
    const paymentData = methods ?? [];
    const COLORS = ['#e49925', '#c8a87a', '#6c833f', '#1976d2', '#8b7f70'];
    const circumference = 2 * Math.PI * 30;
    const topPct = paymentData[0]?.pct ?? 0;
    const topDash = (topPct / 100) * circumference;
    const cashEntry = paymentData.find(m => m.label.toLowerCase().includes('cash'));
    const cashPct = cashEntry?.pct ?? 0;

    return (
        <Card>
            <SectionHeader title="Payment Method Split" sub="Today. Affects cash float." />
            <div className="flex items-center gap-5">
                {/* Donut */}
                <div className="relative w-20 h-20 shrink-0">
                    <svg width="80" height="80" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="30" fill="none" stroke="#e8ddd0" strokeWidth="12" />
                        {(() => {
                            let offset = 0;
                            return paymentData.map((m, i) => {
                                const dash = (m.pct / 100) * circumference;
                                const seg = (
                                    <circle key={m.label} cx="40" cy="40" r="30" fill="none"
                                        stroke={COLORS[i % COLORS.length]} strokeWidth="12"
                                        strokeDasharray={`${dash} ${circumference}`}
                                        strokeDashoffset={-offset}
                                        strokeLinecap="butt"
                                        transform="rotate(-90 40 40)"
                                        style={{ transition: 'stroke-dasharray 0.5s ease' }}
                                    />
                                );
                                offset += dash;
                                return seg;
                            });
                        })()}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold font-body text-primary">{Math.round(topPct)}%</span>
                    </div>
                </div>
                {/* Bars */}
                <div className="flex flex-col gap-2.5 flex-1">
                    {paymentData.length === 0 ? (
                        <p className="text-neutral-gray text-xs font-body">No payment data available</p>
                    ) : (
                        paymentData.map((row, i) => (
                            <div key={row.label}>
                                <div className="flex justify-between mb-1">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                                        <span className="text-xs font-body text-text-dark">{row.label}</span>
                                    </div>
                                    <span className="text-xs font-bold font-body text-text-dark">{Math.round(row.pct)}%</span>
                                </div>
                                <div className="h-1 bg-neutral-gray/15 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: COLORS[i % COLORS.length], transition: 'width 0.4s ease' }} />
                                </div>
                            </div>
                        ))
                    )}
                    <div className="text-[11px] text-neutral-gray font-body px-2 py-1.5 bg-neutral-gray/10 rounded-lg">
                        Keep ~<span className="text-text-dark font-semibold">₵{Math.round(cashPct * 8)}</span> cash float for today
                    </div>
                </div>
            </div>
        </Card>
    );
}

// ─── Fulfilment rate ──────────────────────────────────────────────────────────

function FulfilmentRate({ ordersByStatus, periodLabel = 'today' }: { ordersByStatus?: Record<string, number>; periodLabel?: string }) {
    const statusValues = Object.values(ordersByStatus ?? {});
    const totalOrders = statusValues.reduce((sum, count) => sum + count, 0);
    const cancelled = ordersByStatus?.cancelled ?? 0;
    const fulfilled = Math.max(0, totalOrders - cancelled);
    const onTime = totalOrders > 0 ? Math.round((fulfilled / totalOrders) * 100) : 0;
    const delayed = totalOrders > 0 ? 100 - onTime : 0;

    return (
        <Card>
            <SectionHeader title="Order Fulfilment Rate" sub={`Fulfilled vs cancelled ${periodLabel}`} />
            <div className="flex justify-between items-end mb-4">
                <div>
                    <p className="text-4xl font-bold font-body text-secondary leading-none">{onTime}%</p>
                    <p className="text-neutral-gray text-xs font-body mt-1">Fulfilled</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold font-body text-warning leading-none">{delayed}%</p>
                    <p className="text-neutral-gray text-xs font-body mt-1">Cancelled</p>
                </div>
            </div>
            <div className="h-2 bg-neutral-gray/15 rounded-full overflow-hidden flex">
                <div className="h-full bg-secondary rounded-l-full" style={{ width: `${onTime}%` }} />
                <div className="h-full bg-warning rounded-r-full" style={{ width: `${delayed}%` }} />
            </div>
            <p className="text-[11px] text-neutral-gray font-body mt-3">
                <span className="text-text-dark font-semibold">{fulfilled} of {totalOrders}</span> orders fulfilled {periodLabel}
            </p>
        </Card>
    );
}

// ─── Top items ────────────────────────────────────────────────────────────────

function TopItemsCard({ items, periodLabel = 'Today' }: { items?: TopItem[]; periodLabel?: string }) {
    const topItems = items?.slice(0, 5) ?? [];
    const maxRev = Math.max(...topItems.map(i => i.rev), 1);
    
    if (topItems.length === 0) {
        return (
            <Card className="flex-1 min-w-0">
                <SectionHeader title={`Top 5 Items (${periodLabel})`} sub="By revenue. Units in brackets." />
                <div className="text-center py-8 text-neutral-gray text-sm font-body">
                    No data available
                </div>
            </Card>
        );
    }
    
    return (
        <Card className="flex-1 min-w-0">
            <SectionHeader title={`Top 5 Items (${periodLabel})`} sub="By revenue. Units in brackets." />
            <div className="flex flex-col gap-3">
                {topItems.map((item, i) => (
                    <div key={item.id ?? item.name}>
                        <div className="flex justify-between items-center mb-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold font-body text-neutral-gray/50 w-3">{i + 1}</span>
                                <span className="text-xs font-semibold font-body text-text-dark">
                                    {getOrderItemLineLabel({ name: item.name, sizeLabel: item.size_label })}
                                </span>
                                <span className="text-[10px] font-body text-neutral-gray">×{item.units}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold font-body text-primary">{formatGHS(item.rev)}</span>
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

// ─── Product Summary Table ────────────────────────────────────────────────────

type ProductSortKey = 'name' | 'units' | 'rev';

function ProductSummaryCard({ items }: { items?: TopItem[] }) {
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<ProductSortKey>('rev');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const filtered = useMemo(() => {
        if (!items?.length) return [];
        const q = search.toLowerCase();
        const base = q ? items.filter(i => getOrderItemLineLabel({ name: i.name, sizeLabel: i.size_label }).toLowerCase().includes(q)) : items;
        return [...base].sort((a, b) => {
            let av: string | number, bv: string | number;
            if (sortKey === 'name') { av = getOrderItemLineLabel({ name: a.name, sizeLabel: a.size_label }).toLowerCase(); bv = getOrderItemLineLabel({ name: b.name, sizeLabel: b.size_label }).toLowerCase(); }
            else if (sortKey === 'units') { av = a.units; bv = b.units; }
            else { av = a.rev; bv = b.rev; }
            return sortDir === 'asc' ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0);
        });
    }, [items, search, sortKey, sortDir]);

    const grandRev = items?.reduce((s, i) => s + i.rev, 0) ?? 0;
    const grandUnits = items?.reduce((s, i) => s + i.units, 0) ?? 0;
    const filteredRev = filtered.reduce((s, i) => s + i.rev, 0);
    const filteredUnits = filtered.reduce((s, i) => s + i.units, 0);

    function toggleSort(key: ProductSortKey) {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir(key === 'name' ? 'asc' : 'desc'); }
    }

    function handleExportCsv() {
        generateCsv(
            ['#', 'Item', 'Units Sold', 'Revenue (GHS)', '% of Total'],
            filtered.map((item, idx) => [
                String(idx + 1),
                getOrderItemLineLabel({ name: item.name, sizeLabel: item.size_label }),
                String(item.units),
                item.rev.toFixed(2),
                grandRev > 0 ? (item.rev / grandRev * 100).toFixed(1) : '0.0',
            ]),
            `product-summary.csv`,
        );
    }

    function ColHeader({ label, sk, right }: { label: string; sk: ProductSortKey; right?: boolean }) {
        const active = sortKey === sk;
        return (
            <th onClick={() => toggleSort(sk)}
                className={`text-[10px] font-bold uppercase tracking-wider pb-2 pr-3 ${right ? 'text-right' : 'text-left'} cursor-pointer select-none whitespace-nowrap transition-colors ${active ? 'text-primary' : 'text-neutral-gray hover:text-text-dark'}`}>
                {label}{active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
            </th>
        );
    }

    return (
        <Card>
            <div className="flex items-start justify-between mb-4">
                <div>
                    <p className="text-text-dark text-sm font-bold font-body">Product Summary</p>
                    <p className="text-neutral-gray text-xs font-body mt-0.5">
                        {items?.length ?? 0} items &nbsp;·&nbsp; {grandUnits.toLocaleString()} units sold &nbsp;·&nbsp; {formatGHS(grandRev)}
                    </p>
                </div>
                <button type="button" onClick={handleExportCsv} disabled={!filtered.length}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#f0e8d8] text-xs font-semibold font-body text-neutral-gray hover:text-text-dark hover:border-primary/40 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                    <FileCsvIcon size={13} weight="bold" className="text-primary" />
                    Export CSV
                </button>
            </div>
            <input type="text" placeholder="Search items…" value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-3 py-2 mb-3 rounded-xl border border-[#f0e8d8] bg-neutral-card/50 text-sm font-body text-text-dark placeholder:text-neutral-gray/60 focus:outline-none focus:border-primary/40" />
            {!items?.length ? (
                <div className="flex items-center justify-center h-32 text-neutral-gray text-sm font-body">No product data available</div>
            ) : filtered.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-neutral-gray text-sm font-body">No items match your search</div>
            ) : (
                <div className="overflow-x-auto">
                    <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-xs font-body">
                            <thead className="sticky top-0 bg-neutral-card z-10">
                                <tr className="border-b border-[#f0e8d8]">
                                    <th className="text-neutral-gray text-[10px] font-bold uppercase tracking-wider pb-2 pr-3 text-left w-8 select-none">#</th>
                                    <ColHeader label="Item" sk="name" />
                                    <ColHeader label="Units Sold" sk="units" right />
                                    <ColHeader label="Revenue" sk="rev" right />
                                    <th className="text-neutral-gray text-[10px] font-bold uppercase tracking-wider pb-2 text-right select-none whitespace-nowrap">% of Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((item, idx) => {
                                    const pct = grandRev > 0 ? (item.rev / grandRev * 100).toFixed(1) : '0.0';
                                    const displayName = getOrderItemLineLabel({ name: item.name, sizeLabel: item.size_label });
                                    return (
                                        <tr key={`${displayName}-${idx}`} className="border-b border-[#f0e8d8] last:border-0 hover:bg-primary/5 transition-colors">
                                            <td className="py-2 pr-3 text-neutral-gray/50">{idx + 1}</td>
                                            <td className="py-2 pr-3 text-text-dark font-semibold">{displayName}</td>
                                            <td className="py-2 pr-3 text-text-dark text-right">{item.units.toLocaleString()}</td>
                                            <td className="py-2 pr-3 text-primary font-bold text-right">{formatGHS(item.rev)}</td>
                                            <td className="py-2 text-neutral-gray text-right">{pct}%</td>
                                        </tr>
                                    );
                                })}
                                <tr className="bg-[#fff8ee]">
                                    <td></td>
                                    <td className="py-2.5 pr-3 font-bold text-text-dark">TOTAL</td>
                                    <td className="py-2.5 pr-3 font-bold text-text-dark text-right">{filteredUnits.toLocaleString()}</td>
                                    <td className="py-2.5 pr-3 font-bold text-primary text-right">{formatGHS(filteredRev)}</td>
                                    <td className="py-2.5 text-neutral-gray text-right">100%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </Card>
    );
}

// ─── Out of stock alerts ──────────────────────────────────────────────────────

function OutOfStockCard() {
    return (
        <Card className="flex-1 min-w-55">
            <SectionHeader title="Out-of-Stock Alerts" sub="Live stock alert feed" />
            <div className="text-center py-8 text-neutral-gray text-sm font-body">
                No out-of-stock analytics endpoint yet.
            </div>
        </Card>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportFormat, setReportFormat] = useState<'pdf' | 'csv'>('pdf');
    const [reportSections, setReportSections] = useState({ summary: true, itemsSold: true, dailyBreakdown: true, topCustomers: true });
    const [isGenerating, setIsGenerating] = useState(false);

    const { staffUser } = useStaffAuth();
    const branchId = staffUser?.branches[0]?.id ? Number(staffUser.branches[0].id) : undefined;
    const branchName = staffUser?.branches[0]?.name ?? '—';

    // ── Period selection (limited to current + last month) ────────────────────
    type ManagerPeriod = 'today' | 'yesterday' | 'week' | 'last_week' | 'month' | 'last_month' | 'custom';

    const MANAGER_PERIODS: { key: ManagerPeriod; label: string }[] = [
        { key: 'today', label: 'Today' },
        { key: 'yesterday', label: 'Yesterday' },
        { key: 'week', label: 'This Week' },
        { key: 'last_week', label: 'Last Week' },
        { key: 'month', label: 'This Month' },
        { key: 'last_month', label: 'Last Month' },
        { key: 'custom', label: 'Custom' },
    ];

    const [period, setPeriod] = useState<ManagerPeriod>('today');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [customError, setCustomError] = useState('');

    // Determine the earliest date managers can view (1st of last month)
    const managerMinDate = useMemo(() => {
        const now = new Date();
        const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return first.toISOString().slice(0, 10);
    }, []);
    const managerMaxDate = new Date().toISOString().slice(0, 10);

    function getManagerDateRange(p: ManagerPeriod): { date_from: string; date_to: string } {
        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        switch (p) {
            case 'today': return { date_from: today, date_to: today };
            case 'yesterday': {
                const y = new Date(now); y.setDate(y.getDate() - 1);
                const ys = y.toISOString().slice(0, 10);
                return { date_from: ys, date_to: ys };
            }
            case 'week': {
                const ws = new Date(now); ws.setDate(ws.getDate() - ((ws.getDay() + 6) % 7));
                return { date_from: ws.toISOString().slice(0, 10), date_to: today };
            }
            case 'last_week': {
                const end = new Date(now); end.setDate(end.getDate() - ((end.getDay() + 6) % 7) - 1);
                const start = new Date(end); start.setDate(start.getDate() - 6);
                return { date_from: start.toISOString().slice(0, 10), date_to: end.toISOString().slice(0, 10) };
            }
            case 'month': {
                return { date_from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10), date_to: today };
            }
            case 'last_month': {
                const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const last = new Date(now.getFullYear(), now.getMonth(), 0);
                return { date_from: first.toISOString().slice(0, 10), date_to: last.toISOString().slice(0, 10) };
            }
            case 'custom': {
                if (customFrom && customTo) return { date_from: customFrom, date_to: customTo };
                return { date_from: today, date_to: today };
            }
            default: return { date_from: today, date_to: today };
        }
    }

    function handleCustomApply(): void {
        if (!customFrom || !customTo) { setCustomError('Please select both start and end dates.'); return; }
        if (customFrom > customTo) { setCustomError('Start date must be before end date.'); return; }
        if (customFrom < managerMinDate) { setCustomError(`You can only view data from ${new Date(managerMinDate).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })} onwards.`); return; }
        if (customTo > managerMaxDate) { setCustomError('End date cannot be in the future.'); return; }
        setCustomError('');
        setPeriod('custom');
    }

    const range = getManagerDateRange(period);

    // Period label
    const periodLabel = period === 'custom'
        ? `${new Date(range.date_from).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })} - ${new Date(range.date_to).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}`
        : MANAGER_PERIODS.find(p => p.key === period)?.label ?? 'Today';

    // ── Data fetching driven by selected period ──────────────────────────────
    const { data: periodSales } = useQuery({
        queryKey: ['manager-analytics', 'sales', period, branchId, range.date_from, range.date_to],
        queryFn: () => analyticsService.getSalesAnalytics({ ...range, branch_id: branchId }),
        staleTime: 60 * 1000,
    });

    const { data: periodOrders } = useQuery({
        queryKey: ['manager-analytics', 'orders', period, branchId, range.date_from, range.date_to],
        queryFn: () => analyticsService.getOrderAnalytics({ ...range, branch_id: branchId }),
        staleTime: 60 * 1000,
    });

    // Previous period for trend comparison
    const prevRange = useMemo(() => {
        const days = Math.max(1, Math.ceil((new Date(range.date_to).getTime() - new Date(range.date_from).getTime()) / 86400000) + 1);
        const prevEnd = new Date(range.date_from);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - days + 1);
        return { date_from: prevStart.toISOString().slice(0, 10), date_to: prevEnd.toISOString().slice(0, 10) };
    }, [range.date_from, range.date_to]);

    const { data: prevSales } = useQuery({
        queryKey: ['manager-analytics', 'sales', 'prev', branchId, prevRange.date_from, prevRange.date_to],
        queryFn: () => analyticsService.getSalesAnalytics({ ...prevRange, branch_id: branchId }),
        staleTime: 60 * 1000,
    });

    const { sales: weekSales, orders: orderAnalytics } = useAnalytics('week', branchId);

    const { data: topItems } = useQuery({
        queryKey: ['manager-analytics', 'top-items', period, branchId, range.date_from, range.date_to],
        queryFn: () => analyticsService.getTopItemsAnalytics({ ...range, branch_id: branchId, limit: 5 }),
        staleTime: 60 * 1000,
    });

    const { data: allProductItems } = useQuery({
        queryKey: ['manager-analytics', 'all-items', period, branchId, range.date_from, range.date_to],
        queryFn: () => analyticsService.getTopItemsAnalytics({ ...range, branch_id: branchId, limit: 500 }),
        staleTime: 60 * 1000,
    });

    const { data: paymentMethods } = useQuery({
        queryKey: ['manager-analytics', 'payment-methods', period, branchId, range.date_from, range.date_to],
        queryFn: () => analyticsService.getPaymentMethodAnalytics({ ...range, branch_id: branchId }),
        staleTime: 60 * 1000,
    });

    const weekRevenue = useMemo(() => mapSalesByDayToWeekBars(weekSales?.sales_by_day), [weekSales?.sales_by_day]);
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
        staleTime: 60 * 1000,
    });

    const lastWeekRevenue = useMemo(() => mapSalesByDayToWeekBars(lastWeekSales?.sales_by_day), [lastWeekSales?.sales_by_day]);
    const TODAY_IDX = (new Date().getDay() + 6) % 7;

    // KPI values from selected period
    const periodRevenue = periodSales?.total_sales ?? 0;
    const periodDeliveryFees = periodSales?.delivery_fees ?? 0;
    const prevRevenue = prevSales?.total_sales ?? 0;
    const revTrend = prevRevenue > 0 ? Math.round(((periodRevenue - prevRevenue) / prevRevenue) * 100) : 0;
    const periodOrderCount = periodOrders?.total_orders ?? periodSales?.total_orders ?? 0;
    const prevOrderCount = prevSales?.total_orders ?? 0;
    const ordersTrend = prevOrderCount > 0 ? Math.round(((periodOrderCount - prevOrderCount) / prevOrderCount) * 100) : 0;
    const avgOrderValuePeriod = periodSales?.average_order_value ?? 0;
    const avgOrderValuePrev = prevSales?.average_order_value ?? 0;
    const avgOrderValueTrend = avgOrderValuePrev > 0
        ? Math.round(((avgOrderValuePeriod - avgOrderValuePrev) / avgOrderValuePrev) * 100)
        : 0;
    const fulfilmentRate = periodOrders?.total_orders
        ? Math.round((((periodOrders.total_orders - (periodOrders.orders_by_status?.cancelled ?? 0)) / periodOrders.total_orders) * 100))
        : 0;

    async function handleGenerateReport(): Promise<void> {
        setIsGenerating(true);
        try {
            const dateRange = range.date_from === range.date_to
                ? range.date_from
                : `${range.date_from} - ${range.date_to}`;
            const generatedAt = new Date().toLocaleString('en-GH', { timeZone: 'Africa/Accra', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            const [salesData, ordersData, customersData, allItemsData] = await Promise.all([
                (reportSections.summary || reportSections.dailyBreakdown)
                    ? analyticsService.getSalesAnalytics({ ...range, branch_id: branchId })
                    : Promise.resolve(undefined),
                reportSections.summary
                    ? analyticsService.getOrderAnalytics({ ...range, branch_id: branchId })
                    : Promise.resolve(undefined),
                reportSections.topCustomers
                    ? analyticsService.getCustomerAnalytics({ date_from: range.date_from, date_to: range.date_to })
                    : Promise.resolve(undefined),
                reportSections.itemsSold
                    ? analyticsService.getTopItemsAnalytics({ ...range, branch_id: branchId, limit: 500 })
                    : Promise.resolve(undefined),
            ]);

            const totalRev = allItemsData?.reduce((s, i) => s + i.rev, 0) ?? 0;
            const itemRows: ItemSoldRow[] = (allItemsData ?? []).map(i => ({
                name: i.size_label || i.name,
                units: i.units,
                revenue: i.rev,
                pctOfTotal: totalRev > 0 ? Math.round((i.rev / totalRev) * 1000) / 10 : 0,
                trend: i.trend,
            }));

            const meta: ReportMeta = { title: 'Sales Report', branchName, periodLabel, dateRange, generatedAt };

            if (reportFormat === 'pdf') {
                const reportData: ReportData = {
                    meta,
                    summary: reportSections.summary && salesData ? {
                        totalRevenue: salesData.total_sales,
                        totalOrders: salesData.total_orders,
                        avgOrderValue: salesData.average_order_value,
                        noChargeOrders: salesData.no_charge_count,
                        noChargeAmount: salesData.no_charge_amount,
                        cancelledOrders: ordersData?.orders_by_status?.['cancelled'] ?? 0,
                        avgItemsPerOrder: salesData.avg_items_per_order,
                    } : undefined,
                    itemsSold: reportSections.itemsSold && itemRows.length ? itemRows : undefined,
                    dailyBreakdown: reportSections.dailyBreakdown && salesData?.sales_by_day?.length
                        ? salesData.sales_by_day.map(d => ({ date: d.date, orders: d.orders, revenue: Number(d.total) }))
                        : undefined,
                    topCustomers: reportSections.topCustomers && customersData?.top_customers_by_spending?.length
                        ? customersData.top_customers_by_spending.slice(0, 10).map(c => ({
                            name: c.user?.name ?? c.name ?? 'Unknown',
                            phone: c.user?.phone ?? '—',
                            orders: c.orders_count ?? 0,
                            totalSpend: c.total_spend ?? 0,
                        }))
                        : undefined,
                };
                printReport(buildReportHtml(reportData));
            } else {
                if (reportSections.summary && salesData) {
                    generateCsv(['Metric', 'Value'], [
                        ['Total Revenue', String(salesData.total_sales)],
                        ['Total Orders', String(salesData.total_orders)],
                        ['Avg. Order Value', String(salesData.average_order_value)],
                        ['No-Charge Orders', String(salesData.no_charge_count)],
                        ['No-Charge Amount', String(salesData.no_charge_amount)],
                        ['Cancelled Orders', String(ordersData?.orders_by_status?.['cancelled'] ?? 0)],
                        ['Avg. Items per Order', String(salesData.avg_items_per_order ?? '—')],
                    ], `sales-summary-${range.date_from}.csv`);
                }
                if (reportSections.itemsSold && itemRows.length) {
                    generateCsv(['Item', 'Qty Sold', 'Revenue (GHS)', '% of Total', 'Trend (%)'],
                        itemRows.map(i => [i.name, String(i.units), String(i.revenue), String(i.pctOfTotal ?? ''), String(i.trend ?? '')]),
                        `items-sold-${range.date_from}.csv`);
                }
                if (reportSections.dailyBreakdown && salesData?.sales_by_day?.length) {
                    generateCsv(['Date', 'Orders', 'Revenue (GHS)'],
                        salesData.sales_by_day.map(d => [d.date, String(d.orders), String(d.total)]),
                        `daily-breakdown-${range.date_from}.csv`);
                }
                if (reportSections.topCustomers && customersData?.top_customers_by_spending?.length) {
                    generateCsv(['Name', 'Phone', 'Orders', 'Total Spend (GHS)'],
                        customersData.top_customers_by_spending.slice(0, 10).map(c => [
                            c.user?.name ?? c.name ?? 'Unknown',
                            c.user?.phone ?? '—',
                            String(c.orders_count ?? 0),
                            String(c.total_spend ?? 0),
                        ]),
                        `top-customers-${range.date_from}.csv`);
                }
            }
            setShowReportModal(false);
        } catch (err) {
            console.error('Failed to generate report:', err);
        } finally {
            setIsGenerating(false);
        }
    }

    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div>
                    <h1 className="text-text-dark text-xl font-bold font-body">Analytics</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5 flex items-center gap-1.5">
                        <CalendarIcon size={13} weight="fill" />
                        {branchName} · Branch Manager
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium font-body hover:bg-primary-hover transition-colors cursor-pointer shrink-0 self-start"
                >
                    <FileCsvIcon size={15} weight="bold" />
                    Generate Report
                </button>
            </div>

            {/* ── Period selector ──────────────────────────────────────────────── */}
            <div className="mb-6">
                <div className="flex flex-wrap gap-1.5 bg-neutral-light rounded-xl p-1">
                    {MANAGER_PERIODS.map(p => (
                        <button
                            key={p.key}
                            type="button"
                            onClick={() => { if (p.key === 'custom') { setPeriod('custom'); } else { setPeriod(p.key); } }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium font-body transition-all cursor-pointer ${
                                period === p.key
                                    ? 'bg-neutral-card text-text-dark shadow-sm'
                                    : 'text-neutral-gray hover:text-text-dark'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                {/* Custom date range picker */}
                {(period === 'custom' || MANAGER_PERIODS.find(p => p.key === 'custom')) && (
                    <div className={`mt-3 ${period === 'custom' ? '' : 'hidden'}`}>
                        <div className="flex flex-wrap items-end gap-3">
                            <div>
                                <label className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider block mb-1">From</label>
                                <input
                                    type="date"
                                    value={customFrom}
                                    min={managerMinDate}
                                    max={managerMaxDate}
                                    onChange={e => { setCustomFrom(e.target.value); setCustomError(''); }}
                                    className="bg-neutral-card border border-[#f0e8d8] rounded-lg px-3 py-2 text-xs font-body text-text-dark cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider block mb-1">To</label>
                                <input
                                    type="date"
                                    value={customTo}
                                    min={customFrom || managerMinDate}
                                    max={managerMaxDate}
                                    onChange={e => { setCustomTo(e.target.value); setCustomError(''); }}
                                    className="bg-neutral-card border border-[#f0e8d8] rounded-lg px-3 py-2 text-xs font-body text-text-dark cursor-pointer"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleCustomApply}
                                disabled={!customFrom || !customTo}
                                className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium font-body hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Apply
                            </button>
                        </div>
                        {customError && <p className="text-error text-xs font-body mt-1.5">{customError}</p>}
                        <p className="text-neutral-gray text-[10px] font-body mt-1.5">
                            You can view analytics for the current month and last month only.
                        </p>
                    </div>
                )}
                {period !== 'custom' && (
                    <p className="text-neutral-gray text-xs font-body mt-2 flex items-center gap-1.5">
                        Showing: <span className="text-text-dark font-semibold">{periodLabel}</span>
                        <span className="text-neutral-gray/50">·</span>
                        {range.date_from === range.date_to
                            ? new Date(range.date_from).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })
                            : `${new Date(range.date_from).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })} - ${new Date(range.date_to).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        }
                    </p>
                )}
            </div>

            {/* ══ ROW 1 — KPIs ════════════════════════════════════════════════ */}
            <div className="flex flex-wrap gap-3 mb-4">
                <KpiCard
                    label={`Revenue · ${periodLabel}`}
                    value={formatGHS(periodRevenue)}
                    trend={revTrend}
                    trendLabel="vs previous period"
                    accent
                />
                <KpiCard
                    label="Delivery Fees"
                    value={formatGHS(periodDeliveryFees)}
                />
                <KpiCard
                    label={`Orders · ${periodLabel}`}
                    value={String(periodOrderCount)}
                    trend={ordersTrend}
                    trendLabel="vs previous period"
                />
                <KpiCard
                    label="Avg. Order Value"
                    value={formatGHS(avgOrderValuePeriod)}
                    trend={avgOrderValueTrend}
                    trendLabel="vs previous period"
                />
                <KpiCard label="Fulfilment Rate" value={`${fulfilmentRate}%`} />
            </div>

            {/* ══ ROW 2 — Weekly revenue + heatmap ════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <WeeklyRevenue
                    weekRevenue={weekRevenue}
                    lastWeekRevenue={lastWeekRevenue}
                    todayIdx={TODAY_IDX}
                />
                <PeakHoursHeatmap ordersByHour={periodOrders?.orders_by_hour ?? orderAnalytics?.orders_by_hour} branchId={branchId} />
            </div>

            {/* ══ ROW 3 — Prep time + Payment split + Fulfilment ══════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <PrepTimeTrend avgPrepTime={periodOrders?.average_prep_time ?? undefined} />
                <PaymentSplitCard methods={paymentMethods} />
                <FulfilmentRate ordersByStatus={periodOrders?.orders_by_status} periodLabel={periodLabel} />
            </div>

            {/* ══ ROW 4 — Top items + OOS ══════════════════════════════════════ */}
            <div className="flex flex-col md:flex-row gap-3 mb-3">
                <TopItemsCard items={topItems} periodLabel={periodLabel} />
                <OutOfStockCard />
            </div>

            {/* ══ ROW 5 — Product Summary ══════════════════════════════════════ */}
            <div className="mb-8">
                <ProductSummaryCard items={allProductItems} />
            </div>

            <p className="text-neutral-gray/40 text-xs font-body text-center mt-6">
                {branchName} branch · Data refreshes every 60 seconds · Managers only
            </p>

            {/* Report generation modal */}
            {showReportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowReportModal(false)}>
                    <div className="bg-neutral-card rounded-2xl border border-[#f0e8d8] w-full max-w-sm p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                        <h2 className="text-text-dark text-base font-bold font-body mb-1">Generate Report</h2>
                        <p className="text-neutral-gray text-xs font-body mb-5">
                            {periodLabel} &nbsp;·&nbsp; {branchName}
                        </p>

                        <p className="text-text-dark text-xs font-semibold font-body mb-2">Format</p>
                        <div className="flex rounded-xl overflow-hidden border border-[#f0e8d8] mb-5">
                            {(['pdf', 'csv'] as const).map(f => (
                                <button key={f} type="button" onClick={() => setReportFormat(f)}
                                    className={`flex-1 py-2 text-xs font-semibold font-body transition-colors cursor-pointer ${reportFormat === f ? 'bg-primary text-white' : 'bg-neutral-card text-neutral-gray hover:text-text-dark'}`}>
                                    {f === 'pdf' ? 'PDF (Printable)' : 'CSV (Spreadsheet)'}
                                </button>
                            ))}
                        </div>

                        <p className="text-text-dark text-xs font-semibold font-body mb-2">Include sections</p>
                        <div className="flex flex-col gap-2.5 mb-6">
                            {([
                                ['summary', 'Sales Summary'],
                                ['itemsSold', 'Items Sold Detail'],
                                ['dailyBreakdown', 'Daily Breakdown'],
                                ['topCustomers', 'Top Customers'],
                            ] as const).map(([key, label]) => (
                                <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                                    <input type="checkbox" checked={reportSections[key]}
                                        onChange={e => setReportSections(s => ({ ...s, [key]: e.target.checked }))}
                                        className="accent-primary w-4 h-4" />
                                    <span className="text-text-dark text-xs font-body">{label}</span>
                                </label>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button type="button" onClick={() => setShowReportModal(false)}
                                className="flex-1 py-2.5 rounded-xl border border-[#f0e8d8] text-xs font-semibold font-body text-neutral-gray hover:text-text-dark cursor-pointer transition-colors">
                                Cancel
                            </button>
                            <button type="button" onClick={() => void handleGenerateReport()}
                                disabled={isGenerating || !Object.values(reportSections).some(Boolean)}
                                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold font-body hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-colors">
                                {isGenerating ? 'Generating…' : 'Generate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
