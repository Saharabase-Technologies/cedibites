'use client';

import { useState, useMemo, useRef } from 'react';
import { useAnalytics, useRevenueTrend, useOrderSourceAnalytics, useTopItemsAnalytics, useBottomItemsAnalytics, useCategoryRevenueAnalytics, useBranchPerformanceAnalytics, useDeliveryPickupAnalytics, usePaymentMethodAnalytics, useRepeatCustomerAnalytics, useWeekdayHourAnalytics, useDiscountUsageAnalytics, useCancellationReasonsAnalytics, useFulfillmentAnalytics, useAdminStaffSales, useCustomerLifecycleAnalytics, useBasketAffinityAnalytics, useTargetsVsActual } from '@/lib/api/hooks/useAnalytics';
import type { DiscountUsageAnalytics, CancellationReasonsAnalytics, FulfillmentAnalytics, AdminStaffSalesRow, CustomerLifecycleMetrics, BasketAffinityAnalytics, TargetsVsActualResponse, TargetVsActual } from '@/lib/api/services/analytics.service';
import { useQueryClient } from '@tanstack/react-query';
import GrowthTrendCard from '@/app/components/analytics/GrowthTrendCard';
import MenuComparison from '@/app/components/analytics/MenuComparison';
import { RevenueConcentrationCard, FulfilmentFunnelCard, RepeatCustomersCard, WeekdayHourHeatmap } from '@/app/components/analytics/MetricCards';
import { useSearchParams } from 'next/navigation';
import { useBranchesApi } from '@/lib/api/hooks/useBranchesApi';
import { toast } from '@/lib/utils/toast';
import { exportElementToPdf } from '@/lib/utils/exportPdf';
import { buildReportHtml, printReport, generateCsv, type ReportData, type ReportMeta, type ItemSoldRow } from '@/lib/utils/reportGenerator';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';
import { analyticsService } from '@/lib/api/services/analytics.service';
import { getDateRange, type AnalyticsPeriod } from '@/lib/api/hooks/useAnalytics';
import PeriodFilter, { PERIOD_LABELS, type CustomRange } from '@/app/components/analytics/PeriodFilter';
import {
    CalendarIcon,
    CurrencyCircleDollarIcon,
    ReceiptIcon,
    TrendUpIcon,
    UsersIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    DownloadSimpleIcon,
    BuildingsIcon,
    TagIcon,
    FileCsvIcon,
    TimerIcon,
    UserCircleIcon,
    TargetIcon,
    LinkIcon,
    PencilSimpleIcon,
    UsersThreeIcon,
} from '@phosphor-icons/react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = AnalyticsPeriod;

// ─── Config ────────────────────────────────────────────────────────────────────

const BRANCH_COLORS = ['#e49925', '#6c833f', '#c8a87a'];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const HOURS = ['7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22'];

const SOURCE_COLORS = ['#e49925', '#6c833f', '#c8a87a', '#1976d2', '#e91e63', '#3f51b5'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGHS(v: number) {
    return `₵${v.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, trend, accent = false, icon: Icon }: {
    label: string; value: string; sub?: string; trend?: number; accent?: boolean; icon: React.ElementType;
}) {
    const up = (trend ?? 0) >= 0;
    return (
        <div className={`rounded-2xl px-6 py-4 flex flex-col gap-2 min-w-0 ${accent ? 'bg-primary' : 'bg-neutral-card border border-[#f0e8d8]'}`}>
            <div className="flex items-center gap-2">
                <Icon size={13} weight="fill" className={accent ? 'text-white/70' : 'text-neutral-gray'} />
                <span className={`text-[10px] font-bold font-body uppercase tracking-widest ${accent ? 'text-white/80' : 'text-neutral-gray'}`}>{label}</span>
            </div>
            <p className={`text-lg sm:text-xl lg:text-2xl font-bold font-body leading-none whitespace-nowrap ${accent ? 'text-white' : 'text-text-dark'}`}>{value}</p>
            {sub && <p className={`text-xs font-body whitespace-nowrap ${accent ? 'text-white/70' : 'text-neutral-gray'}`}>{sub}</p>}
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

// ─── Card wrapper ─────────────────────────────────────────────────────────────

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

// ─── Revenue chart (aggregated by day of week) ─────────────────────────────────

function RevenueChart({ salesByDay }: { salesByDay?: Array<{ date: string; total: number; orders: number }> }) {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    // Aggregate revenue & orders by day of week (Mon=0 … Sun=6)
    const { dayTotals, dayOrders } = useMemo(() => {
        const totals = Array(7).fill(0) as number[];
        const orders = Array(7).fill(0) as number[];
        if (salesByDay?.length) {
            for (const d of salesByDay) {
                const idx = (new Date(d.date).getDay() + 6) % 7; // 0=Mon…6=Sun
                totals[idx] += Number(d.total);
                orders[idx] += d.orders;
            }
        }
        return { dayTotals: totals, dayOrders: orders };
    }, [salesByDay]);

    const maxVal = Math.max(...dayTotals, 1);
    const hasData = dayTotals.some(v => v > 0);

    return (
        <Card>
            <SectionTitle title="Revenue by Day of Week" sub="Aggregated from selected period" />
            {!hasData ? (
                <div className="flex items-center justify-center h-36 text-neutral-gray text-sm">No data for selected period</div>
            ) : (
                <div className="flex items-end gap-2 h-36">
                    {DAYS.map((day, di) => {
                        const val = dayTotals[di];
                        const orders = dayOrders[di];
                        const h = Math.round((val / maxVal) * 112) || 4;
                        const isHovered = hoveredIdx === di;
                        return (
                            <div
                                key={day}
                                className="flex-1 flex flex-col items-center gap-1 relative group"
                                onMouseEnter={() => setHoveredIdx(di)}
                                onMouseLeave={() => setHoveredIdx(null)}
                            >
                                {/* Tooltip */}
                                {isHovered && val > 0 && (
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 bg-text-dark text-white rounded-lg px-2.5 py-1.5 text-[10px] font-body whitespace-nowrap shadow-lg pointer-events-none">
                                        <p className="font-bold">{formatGHS(val)}</p>
                                        <p className="text-white/70">{orders} order{orders !== 1 ? 's' : ''}</p>
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-text-dark" />
                                    </div>
                                )}
                                {/* Value label above short bars */}
                                {val > 0 && h < 20 && (
                                    <span className="text-xs font-bold text-primary leading-none select-none">
                                        {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val)}
                                    </span>
                                )}
                                <div
                                    className={`w-full rounded-sm transition-all duration-200 flex items-end justify-center pb-0.5 ${isHovered ? 'bg-primary' : 'bg-primary/70'}`}
                                    style={{ height: Math.max(h, 4), minHeight: 4 }}
                                >
                                    {/* Value label inside tall bars */}
                                    {val > 0 && h >= 20 && (
                                        <span className="text-xs font-bold text-white leading-none select-none">
                                            {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val)}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[9px] text-neutral-gray font-body">{day}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
}

// ─── Peak hours heatmap ───────────────────────────────────────────────────────

function timeStrToHour(t: string | null | undefined): number | null {
    if (!t) return null;
    const h = parseInt(t.split(':')[0], 10);
    return isNaN(h) ? null : h;
}

function PeakHoursHeatmap({ ordersByHour }: { ordersByHour?: Array<{ hour: number; count: number }> }) {
    const { branches: apiBranches } = useBranchesApi();

    // Derive hour range from branch operating_hours (real API shape)
    const { startHour, endHour } = useMemo(() => {
        let earliest = 7;
        let latest = 22;
        if (apiBranches.length > 0) {
            const opens: number[] = [];
            const closes: number[] = [];
            apiBranches.forEach((b) => {
                if (b.operating_hours) {
                    Object.values(b.operating_hours).forEach((oh) => {
                        if (oh?.is_open) {
                            const o = timeStrToHour(oh.open_time);
                            const c = timeStrToHour(oh.close_time);
                            if (o !== null) opens.push(o);
                            if (c !== null) closes.push(c);
                        }
                    });
                }
            });
            if (opens.length) earliest = Math.min(...opens);
            if (closes.length) latest = Math.max(...closes);
        }
        return { startHour: Math.max(0, earliest), endHour: Math.min(23, latest) };
    }, [apiBranches]);

    const hours = useMemo(() => {
        const result: string[] = [];
        for (let h = startHour; h <= endHour; h++) result.push(String(h));
        return result;
    }, [startHour, endHour]);

    const data = useMemo(() => {
        if (ordersByHour?.length) {
            const byHour: Record<number, number> = {};
            for (const { hour, count } of ordersByHour) byHour[hour] = (byHour[hour] ?? 0) + count;
            return hours.map((_, i) => byHour[startHour + i] ?? 0);
        }
        return hours.map(() => 0);
    }, [ordersByHour, hours, startHour]);

    const max = Math.max(...data, 1);

    function cellBg(val: number) {
        if (max === 0) return '#f5ede0';
        const i = val / max;
        if (i < 0.15) return '#f5ede0';
        if (i < 0.30) return '#f0dbb8';
        if (i < 0.50) return '#e8b86a';
        if (i < 0.70) return '#e4a030';
        return '#e49925';
    }

    const hasData = ordersByHour && ordersByHour.length > 0;
    const openLabel = `${startHour}:00 – ${endHour}:00`;

    return (
        <Card>
            <SectionTitle title="Peak Hours Heatmap" sub={`Orders by hour — darker = busier · ${openLabel}`} />
            {!hasData ? (
                <div className="flex items-center justify-center h-32 text-neutral-gray text-sm">
                    No peak hours data available
                </div>
            ) : (
                <div className="flex gap-1 items-end">
                    {hours.map((h, i) => (
                        <div key={h} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full rounded-sm flex items-center justify-center" style={{ height: 44, background: cellBg(data[i]), transition: 'background 0.3s ease' }}>
                                <span className="text-[8px] font-bold font-body" style={{ color: data[i] / max > 0.5 ? '#5c3d00' : '#9a8878' }}>{data[i]}</span>
                            </div>
                            <span className="text-[8px] text-neutral-gray font-body" style={{ transform: 'rotate(-45deg)', display: 'block', marginTop: 4 }}>{h}</span>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}

// ─── Revenue by hour (#1) ─────────────────────────────────────────────────────

function RevenueByHourChart({ ordersByHour }: { ordersByHour?: Array<{ hour: number; revenue?: number }> }) {
    const fmtHour = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? 'a' : 'p'}`;

    const data = useMemo(() => {
        const rows = (ordersByHour ?? []).filter(r => (r.revenue ?? 0) > 0);
        if (rows.length === 0) return [];
        const minH = Math.min(...rows.map(r => r.hour));
        const maxH = Math.max(...rows.map(r => r.hour));
        const byHour: Record<number, number> = {};
        for (const r of rows) byHour[r.hour] = (byHour[r.hour] ?? 0) + (r.revenue ?? 0);
        const out: { hour: number; revenue: number }[] = [];
        for (let h = minH; h <= maxH; h++) out.push({ hour: h, revenue: byHour[h] ?? 0 });
        return out;
    }, [ordersByHour]);

    const maxRev = Math.max(...data.map(d => d.revenue), 1);
    const peak = useMemo(
        () => data.reduce<{ hour: number; revenue: number } | null>((a, b) => (b.revenue > (a?.revenue ?? -1) ? b : a), null),
        [data],
    );

    return (
        <Card>
            <SectionTitle
                title="Revenue by Hour"
                sub={peak ? `Peak: ${fmtHour(peak.hour)} · ${formatGHS(peak.revenue)}` : 'Aggregated from selected period'}
            />
            {data.length === 0 ? (
                <div className="flex items-center justify-center h-36 text-neutral-gray text-sm">No data for selected period</div>
            ) : (
                <div className="flex items-end gap-1.5 h-36">
                    {data.map(d => {
                        const h = Math.round((d.revenue / maxRev) * 112) || 2;
                        return (
                            <div key={d.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                                {d.revenue > 0 && (
                                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-10 bg-text-dark text-white rounded-md px-2 py-1 text-[10px] font-body whitespace-nowrap shadow pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                        {fmtHour(d.hour)} · {formatGHS(d.revenue)}
                                    </div>
                                )}
                                <div className="w-full rounded-sm bg-primary/70 hover:bg-primary transition-colors" style={{ height: Math.max(h, 2), minHeight: 2 }} />
                                <span className="text-[9px] text-neutral-gray font-body">{fmtHour(d.hour)}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
}

// ─── Order source donut ───────────────────────────────────────────────────────

function OrderSourceChart({ orderSources }: { orderSources?: Array<{ name: string; count: number; pct: number; avgValue: number }> }) {
    const sources = orderSources || [];
    const total = sources.reduce((s, x) => s + x.count, 0);
    const circumference = 2 * Math.PI * 32;
    let offset = 0;

    return (
        <Card>
            <SectionTitle title="Order Source Breakdown" />
            {sources.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-neutral-gray text-sm">
                    No order source data available
                </div>
            ) : (
                <div className="flex flex-col md:flex-row gap-5 items-start">
                    {/* Donut */}
                    <div className="relative shrink-0 mx-auto">
                        <svg width={100} height={100} viewBox="0 0 100 100">
                            {sources.map((src, i) => {
                                const dash = (src.pct / 100) * circumference;
                                const seg = (
                                    <circle key={src.name} cx="50" cy="50" r="32" fill="none"
                                        stroke={SOURCE_COLORS[i] || '#ccc'} strokeWidth="14"
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
                        {sources.map((src, i) => (
                            <div key={src.name} className="flex items-center justify-between py-1.5 border-b border-[#f0e8d8] last:border-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SOURCE_COLORS[i] || '#ccc' }} />
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
            )}
        </Card>
    );
}

// ─── Top items ────────────────────────────────────────────────────────────────

function TopItemsCard({ items, title, allowSortToggle = false }: { items?: Array<{ id?: number; name: string; size_label?: string; units: number; rev: number; trend?: number }>; title: string; allowSortToggle?: boolean }) {
    const [sortBy, setSortBy] = useState<'revenue' | 'quantity'>('revenue');

    const itemList = useMemo(() => {
        const base = items || [];
        if (!allowSortToggle || sortBy === 'revenue') return [...base].sort((a, b) => b.rev - a.rev);
        return [...base].sort((a, b) => b.units - a.units);
    }, [items, sortBy, allowSortToggle]);

    const maxVal = itemList.length > 0
        ? (sortBy === 'quantity' ? Math.max(...itemList.map(i => i.units), 1) : Math.max(...itemList.map(i => i.rev), 1))
        : 1;

    return (
        <Card>
            <div className="flex items-start justify-between mb-4">
                <div>
                    <p className="text-text-dark text-sm font-bold font-body">{title}</p>
                </div>
                {allowSortToggle && (
                    <div className="flex rounded-lg overflow-hidden border border-[#f0e8d8] shrink-0">
                        <button type="button" onClick={() => setSortBy('revenue')}
                            className={`px-2.5 py-1 text-[10px] font-semibold font-body transition-colors cursor-pointer ${sortBy === 'revenue' ? 'bg-primary text-white' : 'bg-neutral-card text-neutral-gray hover:text-text-dark'}`}>
                            Revenue
                        </button>
                        <button type="button" onClick={() => setSortBy('quantity')}
                            className={`px-2.5 py-1 text-[10px] font-semibold font-body transition-colors cursor-pointer ${sortBy === 'quantity' ? 'bg-primary text-white' : 'bg-neutral-card text-neutral-gray hover:text-text-dark'}`}>
                            Qty
                        </button>
                    </div>
                )}
            </div>
            {itemList.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-neutral-gray text-sm">
                    No items data available
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {itemList.map((item, i) => {
                        const barVal = sortBy === 'quantity' ? item.units : item.rev;
                        return (
                            <div key={item.id || `${item.name}-${i}`}>
                                <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[10px] font-bold font-body text-neutral-gray/50 w-4 shrink-0">{i + 1}</span>
                                        <span className="text-xs font-semibold font-body text-text-dark truncate">
                                            {getOrderItemLineLabel({ name: item.name, sizeLabel: item.size_label })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <span className="text-[10px] font-body text-neutral-gray">
                                            {sortBy === 'quantity' ? formatGHS(item.rev) : `×${item.units}`}
                                        </span>
                                        <span className="text-xs font-bold font-body text-primary">
                                            {sortBy === 'quantity' ? `×${item.units} sold` : formatGHS(item.rev)}
                                        </span>
                                        {item.trend !== undefined && (
                                            <div className="flex items-center gap-0.5">
                                                {item.trend > 0
                                                    ? <ArrowUpIcon size={10} className="text-secondary" />
                                                    : <ArrowDownIcon size={10} className="text-error" />
                                                }
                                                <span className={`text-[10px] font-body ${item.trend > 0 ? 'text-secondary' : 'text-error'}`}>
                                                    {Math.abs(item.trend)}%
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="h-1 bg-neutral-gray/15 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${(barVal / maxVal) * 100}%`, background: i === 0 ? '#e49925' : '#c8a87a', transition: 'width 0.4s ease' }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
}

// ─── Category revenue ─────────────────────────────────────────────────────────

function CategoryRevenue({ categoryRevenue }: { categoryRevenue?: Array<{ cat: string; rev: number; pct: number }> }) {
    const categories = categoryRevenue || [];

    return (
        <Card>
            <SectionTitle title="Revenue by Category" />
            {categories.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-neutral-gray text-sm">
                    No category revenue data available
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {categories.map((cat, index) => (
                        <div key={`${cat.cat}-${index}`}>
                            <div className="flex justify-between mb-1">
                                <span className="text-text-dark text-xs font-body">{cat.cat}</span>
                                <div className="flex gap-3">
                                    <span className="text-neutral-gray text-xs font-body">{cat.pct}%</span>
                                    <span className="text-text-dark text-xs font-bold font-body">{formatGHS(cat.rev)}</span>
                                </div>
                            </div>
                            <div className="h-1.5 bg-neutral-gray/15 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-primary/70" style={{ width: `${cat.pct}%`, transition: 'width 0.4s ease' }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}

// ─── Branch performance table ─────────────────────────────────────────────────

function BranchPerformanceTable({ branchPerformance }: { branchPerformance?: Array<{ name: string; rev: number; orders: number; avg: number; fulfilment: number; cancelled: number }> }) {
    const branches = branchPerformance || [];
    const maxRev = branches.length > 0 ? Math.max(...branches.map(b => b.rev)) : 1;

    return (
        <Card>
            <SectionTitle title="Branch Performance" />
            {branches.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-neutral-gray text-sm">
                    No branch performance data available
                </div>
            ) : (
                <>
                    {/* Revenue bars */}
                    <div className="flex flex-col gap-3 mb-5">
                        {branches.map((b, i) => (
                            <div key={b.name}>
                                <div className="flex justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <BuildingsIcon size={12} weight="fill" className="text-neutral-gray" />
                                        <span className="text-text-dark text-xs font-semibold font-body">{b.name}</span>
                                    </div>
                                    <span className="text-primary text-xs font-bold font-body">{formatGHS(b.rev)}</span>
                                </div>
                                <div className="h-2 bg-neutral-gray/15 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${(b.rev / maxRev) * 100}%`, background: BRANCH_COLORS[i] || '#ccc', transition: 'width 0.4s ease' }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs font-body">
                            <thead>
                                <tr className="border-b border-[#f0e8d8]">
                                    {['Branch', 'Revenue', 'Orders', 'Avg. Value', 'Fulfilment', 'Cancelled'].map(h => (
                                        <th key={h} className="text-neutral-gray text-[10px] font-bold uppercase tracking-wider pb-2 pr-4 text-left whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {branches.map(b => (
                                    <tr key={b.name} className="border-b border-[#f0e8d8] last:border-0">
                                        <td className="py-2.5 pr-4 text-text-dark font-semibold">{b.name}</td>
                                        <td className="py-2.5 pr-4 text-primary font-bold">{formatGHS(b.rev)}</td>
                                        <td className="py-2.5 pr-4 text-text-dark">{b.orders}</td>
                                        <td className="py-2.5 pr-4 text-text-dark">{formatGHS(b.avg)}</td>
                                        <td className="py-2.5 pr-4">
                                            <span className={`font-semibold ${b.fulfilment >= 90 ? 'text-secondary' : 'text-warning'}`}>{b.fulfilment}%</span>
                                        </td>
                                        <td className="py-2.5 pr-4 text-error font-semibold">{b.cancelled}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </Card>
    );
}

// ─── Customer insights ────────────────────────────────────────────────────────

type TopCustomer = { name?: string; orders_count?: number; total_spend?: number; user?: { name?: string } };

function CustomerInsights({ byOrders, bySpending, deliveryPickup, paymentMethods }: {
    byOrders?: TopCustomer[];
    bySpending?: TopCustomer[];
    deliveryPickup?: { delivery_pct: number; pickup_pct: number };
    paymentMethods?: Array<{ label: string; pct: number }>;
}) {
    const [custMode, setCustMode] = useState<'orders' | 'value'>('orders');
    const custList = (custMode === 'orders' ? byOrders : bySpending) ?? [];
    const deliveryPct = deliveryPickup?.delivery_pct ?? 0;
    const pickupPct = deliveryPickup?.pickup_pct ?? 0;
    const circumference = 2 * Math.PI * 28;
    const delDash = (deliveryPct / 100) * circumference;

    const paymentData = paymentMethods || [];
    const paymentColors = ['#e49925', '#c8a87a', '#8b7f70'];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Top 5 customers — by orders or by value */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <p className="text-text-dark text-sm font-bold font-body">Top 5 Customers</p>
                    <div className="flex rounded-lg border border-[#f0e8d8] overflow-hidden text-[11px] font-semibold font-body">
                        {(['orders', 'value'] as const).map(m => (
                            <button key={m} type="button" onClick={() => setCustMode(m)}
                                className={`px-2.5 py-1 cursor-pointer transition-colors ${custMode === m ? 'bg-primary text-white' : 'text-neutral-gray hover:text-text-dark'}`}>
                                {m === 'orders' ? 'By Orders' : 'By Value'}
                            </button>
                        ))}
                    </div>
                </div>
                {custList.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-neutral-gray text-sm">
                        No customer data available
                    </div>
                ) : (
                    <div className="flex flex-col gap-0">
                        {custList.slice(0, 5).map((c, i) => {
                            const name = c.user?.name ?? c.name ?? '—';
                            const orders = c.orders_count ?? 0;
                            const spend = c.total_spend ?? 0;
                            return (
                                <div key={name + i} className={`flex items-center gap-3 py-2.5 ${i < 4 ? 'border-b border-[#f0e8d8]' : ''}`}>
                                    <span className="text-neutral-gray/50 text-[10px] font-bold font-body w-4 shrink-0">{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-text-dark text-xs font-semibold font-body truncate">{name}</p>
                                        <p className="text-neutral-gray text-[10px] font-body">{orders} orders · {formatGHS(spend)}</p>
                                    </div>
                                    <span className="text-primary text-xs font-bold font-body shrink-0">
                                        {custMode === 'orders' ? `${orders} orders` : formatGHS(spend)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            <div className="flex flex-col gap-3">
                {/* Delivery vs pickup */}
                <Card>
                    <SectionTitle title="Delivery vs Pickup Split" />
                    {deliveryPct === 0 && pickupPct === 0 ? (
                        <div className="flex items-center justify-center h-20 text-neutral-gray text-sm">
                            No delivery/pickup data available
                        </div>
                    ) : (
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
                                            <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: row.color, transition: 'width 0.4s ease' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>

                {/* Payment split */}
                <Card>
                    <SectionTitle title="Payment Methods" />
                    {paymentData.length === 0 ? (
                        <div className="flex items-center justify-center h-20 text-neutral-gray text-sm">
                            No payment method data available
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {paymentData.map((row, i) => (
                                <div key={row.label}>
                                    <div className="flex justify-between mb-1">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full" style={{ background: paymentColors[i] || '#ccc' }} />
                                            <span className="text-xs font-body text-text-dark">{row.label}</span>
                                        </div>
                                        <span className="text-xs font-bold font-body text-text-dark">{row.pct}%</span>
                                    </div>
                                    <div className="h-1.5 bg-neutral-gray/15 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: paymentColors[i] || '#ccc', transition: 'width 0.4s ease' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

// ─── Repeat vs New Customers ──────────────────────────────────────────────────

function RepeatVsNewCustomers({ totalCustomers, newCustomers }: { totalCustomers?: number; newCustomers?: number }) {
    const total = totalCustomers ?? 0;
    const newC = newCustomers ?? 0;
    const repeat = Math.max(0, total - newC);
    const newPct = total > 0 ? Math.round((newC / total) * 100) : 0;
    const repeatPct = total > 0 ? Math.round((repeat / total) * 100) : 0;
    const circumference = 2 * Math.PI * 28;
    const newDash = (newPct / 100) * circumference;

    return (
        <Card>
            <SectionTitle title="Repeat vs New Customers" sub="New = first ever order in this period · Repeat = ordered before" />
            {total === 0 ? (
                <div className="flex items-center justify-center h-24 text-neutral-gray text-sm">No customer data available</div>
            ) : (
                <div className="flex items-center gap-5">
                    <div className="relative w-20 h-20 shrink-0">
                        <svg width="80" height="80" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="28" fill="none" stroke="#f0e8d8" strokeWidth="12" />
                            <circle cx="40" cy="40" r="28" fill="none" stroke="#6c833f" strokeWidth="12"
                                strokeDasharray={`${newDash} ${circumference}`}
                                strokeLinecap="round" transform="rotate(-90 40 40)" />
                            <circle cx="40" cy="40" r="28" fill="none" stroke="#e49925" strokeWidth="12"
                                strokeDasharray={`${(repeatPct / 100) * circumference} ${circumference}`}
                                strokeDashoffset={-newDash}
                                strokeLinecap="round" transform="rotate(-90 40 40)" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold font-body text-text-dark">{total}</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                        {[
                            { label: 'New', count: newC, pct: newPct, color: '#6c833f' },
                            { label: 'Repeat', count: repeat, pct: repeatPct, color: '#e49925' },
                        ].map(row => (
                            <div key={row.label}>
                                <div className="flex justify-between mb-1">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                                        <span className="text-xs font-body text-text-dark">{row.label}</span>
                                        <span className="text-[10px] font-body text-neutral-gray">({row.count})</span>
                                    </div>
                                    <span className="text-xs font-bold font-body text-text-dark">{row.pct}%</span>
                                </div>
                                <div className="h-1 bg-neutral-gray/15 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: row.color, transition: 'width 0.4s ease' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
}

// ─── Orders by Day of Week ────────────────────────────────────────────────────

function OrdersByDayOfWeek({ salesByDay }: { salesByDay?: Array<{ date: string; orders: number }> }) {
    const dayCounts = useMemo(() => {
        const counts = Array(7).fill(0) as number[];
        if (salesByDay?.length) {
            for (const { date, orders } of salesByDay) {
                const idx = (new Date(date).getDay() + 6) % 7; // 0=Mon…6=Sun
                counts[idx] += orders;
            }
        }
        return counts;
    }, [salesByDay]);

    const maxCount = Math.max(...dayCounts, 1);
    const hasData = dayCounts.some(c => c > 0);

    return (
        <Card>
            <SectionTitle title="Orders by Day of Week" sub="Aggregated from selected period" />
            {!hasData ? (
                <div className="flex items-center justify-center h-24 text-neutral-gray text-sm">No data for selected period</div>
            ) : (
                <div className="flex items-end gap-2 h-28 pt-2">
                    {DAYS.map((day, i) => {
                        const val = dayCounts[i];
                        const h = Math.round((val / maxCount) * 80) || 3;
                        return (
                            <div key={day} className="flex-1 flex flex-col items-center gap-1 group relative">
                                {val > 0 && (
                                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-10 bg-text-dark text-white rounded-md px-2 py-1 text-[10px] font-body whitespace-nowrap shadow pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                        {val} order{val !== 1 ? 's' : ''}
                                    </div>
                                )}
                                <div className="w-full rounded-sm bg-primary/70 hover:bg-primary transition-colors flex items-end justify-center pb-0.5" style={{ height: h, minHeight: 3 }}>
                                    {val > 0 && h >= 18 && (
                                        <span className="text-xs font-bold text-white leading-none select-none">{val}</span>
                                    )}
                                </div>
                                <span className="text-[9px] text-neutral-gray font-body">{day}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
}

// ─── Avg Items Per Order (UI-only) ────────────────────────────────────────────

function AvgItemsPerOrder({ avgItems }: { avgItems?: number }) {
    return (
        <Card>
            <div className="mb-4">
                <p className="text-text-dark text-sm font-bold font-body">Avg. Items per Order</p>
                <p className="text-[10px] font-body mt-0.5 text-neutral-gray">Items per completed order</p>
            </div>
            {avgItems !== undefined ? (
                <p className="text-3xl font-bold text-primary font-body">{avgItems.toFixed(1)}</p>
            ) : (
                <div className="flex items-center justify-center h-16 text-neutral-gray text-sm font-body opacity-50">No data</div>
            )}
        </Card>
    );
}

// ─── Discount Usage ───────────────────────────────────────────────────────────

function DiscountUsage({ data }: { data?: DiscountUsageAnalytics }) {
    const hasData = data && data.total_orders > 0;
    return (
        <Card>
            <div className="mb-4">
                <p className="text-text-dark text-sm font-bold font-body">Discount Usage</p>
                <p className="text-[10px] font-body mt-0.5 text-neutral-gray">Orders with a promo / discount applied</p>
            </div>
            {!hasData ? (
                <div className="flex items-center justify-center h-16 text-neutral-gray text-sm font-body opacity-50">No data for selected period</div>
            ) : (
                <>
                    <div className="flex items-end gap-2 mb-1">
                        <p className="text-3xl font-bold text-primary font-body leading-none">{data!.discount_rate}%</p>
                        <p className="text-[11px] text-neutral-gray font-body mb-0.5">of orders discounted</p>
                    </div>
                    <p className="text-[11px] text-neutral-gray font-body mb-3">
                        {data!.discounted_orders} of {data!.total_orders} orders
                    </p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="rounded-lg bg-neutral-light p-2.5">
                            <p className="text-[10px] text-neutral-gray font-body">Total discount</p>
                            <p className="text-sm font-bold text-text-dark font-body">{formatGHS(data!.total_discount_given)}</p>
                        </div>
                        <div className="rounded-lg bg-neutral-light p-2.5">
                            <p className="text-[10px] text-neutral-gray font-body">Avg / order</p>
                            <p className="text-sm font-bold text-text-dark font-body">{formatGHS(data!.avg_discount_per_order)}</p>
                        </div>
                    </div>
                    {data!.promos.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-semibold text-neutral-gray font-body uppercase tracking-wide">Top promos</p>
                            {data!.promos.slice(0, 3).map(p => (
                                <div key={p.promo_id} className="flex items-center justify-between text-xs font-body">
                                    <span className="text-text-dark truncate flex items-center gap-1.5">
                                        <TagIcon size={11} weight="fill" className="text-secondary shrink-0" />
                                        {p.promo_name}
                                    </span>
                                    <span className="text-neutral-gray shrink-0 ml-2">
                                        {p.usage_count}× · {formatGHS(p.total_discount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </Card>
    );
}

// ─── Cancellation Reasons ─────────────────────────────────────────────────────

function CancellationReasons({ data }: { data?: CancellationReasonsAnalytics }) {
    const hasData = data && data.total_cancelled > 0;
    return (
        <Card>
            <div className="mb-4">
                <p className="text-text-dark text-sm font-bold font-body">Cancellation Reasons</p>
                <p className="text-[10px] font-body mt-0.5 text-neutral-gray">Why orders were cancelled this period</p>
            </div>
            {!hasData ? (
                <div className="flex items-center justify-center h-16 text-neutral-gray text-sm font-body opacity-50">No cancellations 🎉</div>
            ) : (
                <>
                    <div className="flex items-end gap-2 mb-3">
                        <p className="text-3xl font-bold text-error font-body leading-none">{data!.total_cancelled}</p>
                        <p className="text-[11px] text-neutral-gray font-body mb-0.5">cancelled</p>
                    </div>
                    <div className="space-y-2">
                        {data!.reasons.slice(0, 5).map((r, i) => (
                            <div key={i}>
                                <div className="flex items-center justify-between text-xs font-body mb-0.5">
                                    <span className="text-text-dark truncate capitalize">{r.reason}</span>
                                    <span className="text-neutral-gray shrink-0 ml-2">{r.count} · {r.pct}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-neutral-light overflow-hidden">
                                    <div className="h-full rounded-full bg-error/70" style={{ width: `${r.pct}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </Card>
    );
}

// ─── Kitchen & Fulfilment Speed (#3) ──────────────────────────────────────────

function KitchenSpeedCard({ data }: { data?: FulfillmentAnalytics }) {
    const fmt = (m: number | null | undefined) => (m == null ? '—' : m < 1 ? '<1 min' : `${m} min`);
    const rows = [
        { label: 'Time to accept', value: data?.avg_time_to_accept, hint: 'Received → Accepted' },
        { label: 'Prep time', value: data?.avg_prep_time, hint: 'Preparing → Ready' },
        { label: 'Total fulfilment', value: data?.avg_fulfillment_time, hint: 'Received → Completed' },
    ];
    const hasData = rows.some(r => r.value != null);
    return (
        <Card>
            <SectionTitle title="Kitchen & Fulfilment Speed" sub="Average minutes per stage (completed orders)" />
            {!hasData ? (
                <div className="flex items-center justify-center h-16 text-neutral-gray text-sm font-body opacity-50">No data for selected period</div>
            ) : (
                <div className="grid grid-cols-3 gap-3">
                    {rows.map(r => (
                        <div key={r.label} className="rounded-xl bg-neutral-light p-3 text-center">
                            <TimerIcon size={18} weight="duotone" className="text-primary mx-auto mb-1.5" />
                            <p className="text-xl font-bold text-text-dark font-body leading-none">{fmt(r.value)}</p>
                            <p className="text-[11px] text-neutral-gray font-body mt-1.5">{r.label}</p>
                            <p className="text-[9px] text-neutral-gray/70 font-body mt-0.5">{r.hint}</p>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}

// ─── Staff Productivity (#3) ──────────────────────────────────────────────────

function StaffProductivityCard({ rows }: { rows?: AdminStaffSalesRow[] }) {
    const sorted = useMemo(
        () => [...(rows ?? [])].sort((a, b) => b.total_revenue - a.total_revenue),
        [rows],
    );
    const maxRev = sorted[0]?.total_revenue ?? 0;
    return (
        <Card>
            <SectionTitle title="Staff Productivity" sub="Revenue & orders handled per staff member" />
            {sorted.length === 0 ? (
                <div className="flex items-center justify-center h-16 text-neutral-gray text-sm font-body opacity-50">No staff sales for selected period</div>
            ) : (
                <div className="space-y-2.5">
                    {sorted.slice(0, 8).map(s => (
                        <div key={s.employee_id}>
                            <div className="flex items-center justify-between text-xs font-body mb-1">
                                <span className="text-text-dark font-medium flex items-center gap-1.5 truncate">
                                    <UserCircleIcon size={14} weight="fill" className="text-primary/70 shrink-0" />
                                    {s.staff_name}
                                </span>
                                <span className="text-neutral-gray shrink-0 ml-2">
                                    <span className="text-text-dark font-semibold">{formatGHS(s.total_revenue)}</span>
                                    {' · '}{s.total_orders} order{s.total_orders !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-neutral-light overflow-hidden">
                                <div className="h-full rounded-full bg-primary/70" style={{ width: maxRev > 0 ? `${(s.total_revenue / maxRev) * 100}%` : '0%' }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}

// ─── Customer Lifetime & Churn (#4) ───────────────────────────────────────────

function LifecycleBucket({ label, hint, value, color }: { label: string; hint: string; value: number; color: string }) {
    return (
        <div className="rounded-lg bg-neutral-light p-2.5 text-center">
            <p className={`text-xl font-bold font-body leading-none ${color}`}>{value}</p>
            <p className="text-[11px] text-text-dark font-body mt-1">{label}</p>
            <p className="text-[9px] text-neutral-gray/70 font-body">{hint}</p>
        </div>
    );
}

function CustomerLifecycleCard({ data }: { data?: CustomerLifecycleMetrics }) {
    const hasData = data && data.total_customers > 0;
    return (
        <Card>
            <SectionTitle title="Customer Lifetime & Churn" sub="All-time value & recency (branch-scoped, ignores period)" />
            {!hasData ? (
                <div className="flex items-center justify-center h-24 text-neutral-gray text-sm">No customer data</div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="rounded-lg bg-neutral-light p-2.5">
                            <p className="text-[10px] text-neutral-gray font-body">Avg lifetime value</p>
                            <p className="text-base font-bold text-primary font-body">{formatGHS(data!.avg_lifetime_value)}</p>
                        </div>
                        <div className="rounded-lg bg-neutral-light p-2.5">
                            <p className="text-[10px] text-neutral-gray font-body">Avg orders / customer</p>
                            <p className="text-base font-bold text-text-dark font-body">{data!.avg_orders_per_customer.toFixed(1)}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <LifecycleBucket label="Active" hint="≤30 days" value={data!.active_customers} color="text-secondary" />
                        <LifecycleBucket label="At risk" hint="31–60 days" value={data!.at_risk_customers} color="text-warning" />
                        <LifecycleBucket label="Churned" hint=">60 days" value={data!.churned_customers} color="text-error" />
                    </div>
                    <div className="flex items-center justify-between text-xs font-body text-neutral-gray">
                        <span className="flex items-center gap-1"><UsersThreeIcon size={13} weight="fill" className="text-primary/60" /> Repeat: <span className="text-text-dark font-semibold">{data!.repeat_customers}</span></span>
                        <span>One-time: <span className="text-text-dark font-semibold">{data!.one_time_customers}</span></span>
                    </div>
                </>
            )}
        </Card>
    );
}

// ─── Retention by Cohort (#4) ─────────────────────────────────────────────────

function RetentionCohortCard({ cohorts }: { cohorts?: CustomerLifecycleMetrics['cohorts'] }) {
    const fmtMonth = (m: string) => {
        const [y, mo] = m.split('-');
        return new Date(Number(y), Number(mo) - 1, 1).toLocaleString('en', { month: 'short', year: '2-digit' });
    };
    const rows = cohorts ?? [];
    return (
        <Card>
            <SectionTitle title="Retention by Cohort" sub="Of customers acquired each month, % who ordered again later" />
            {rows.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-neutral-gray text-sm">Not enough history yet</div>
            ) : (
                <div className="space-y-2.5">
                    {rows.map(c => (
                        <div key={c.month}>
                            <div className="flex items-center justify-between text-xs font-body mb-0.5">
                                <span className="text-text-dark">{fmtMonth(c.month)} · {c.acquired} new</span>
                                <span className="text-neutral-gray">{c.retention_rate}% returned</span>
                            </div>
                            <div className="h-2 rounded-full bg-neutral-light overflow-hidden">
                                <div className="h-full rounded-full bg-secondary/70" style={{ width: `${c.retention_rate}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}

// ─── Frequently Bought Together (#4) ──────────────────────────────────────────

function BasketAffinityCard({ data }: { data?: BasketAffinityAnalytics }) {
    const pairs = data?.pairs ?? [];
    return (
        <Card>
            <SectionTitle
                title="Frequently Bought Together"
                sub={data ? `${data.total_multi_item_orders} multi-item orders analysed` : 'Items appearing in the same order'}
            />
            {pairs.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-neutral-gray text-sm">No item pairs for selected period</div>
            ) : (
                <div className="space-y-2">
                    {pairs.map((p, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 text-xs font-body">
                            <span className="text-text-dark truncate flex items-center gap-1.5">
                                <LinkIcon size={12} weight="bold" className="text-primary shrink-0" />
                                {p.item_a} <span className="text-neutral-gray">+</span> {p.item_b}
                            </span>
                            <span className="text-neutral-gray shrink-0 whitespace-nowrap">
                                {p.count}×{p.lift >= 1.1 ? <span className="text-secondary"> · {p.lift}× lift</span> : null}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}

// ─── Targets vs Actual (#5) ───────────────────────────────────────────────────

function TargetsVsActualCard({ data, onEdit }: { data?: TargetsVsActualResponse; onEdit: () => void }) {
    const rows = data?.rows ?? [];
    const monthLabel = data ? new Date(data.year, data.month - 1, 1).toLocaleString('en', { month: 'long', year: 'numeric' }) : '';
    return (
        <Card>
            <div className="flex items-start justify-between gap-2 mb-4">
                <div>
                    <p className="text-text-dark text-sm font-bold font-body flex items-center gap-1.5">
                        <TargetIcon size={15} weight="fill" className="text-primary" /> Revenue Targets vs Actual
                    </p>
                    <p className="text-[10px] font-body mt-0.5 text-neutral-gray">
                        {monthLabel}{data ? ` · day ${data.days_elapsed}/${data.days_in_month}` : ''}
                    </p>
                </div>
                <button
                    onClick={onEdit}
                    data-export-ignore
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-light text-text-dark text-xs font-medium font-body hover:bg-neutral-gray/15 transition-colors cursor-pointer shrink-0"
                >
                    <PencilSimpleIcon size={13} weight="bold" /> Set targets
                </button>
            </div>
            {rows.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-neutral-gray text-sm">No branches</div>
            ) : (
                <div className="space-y-3">
                    {rows.map(r => {
                        const pct = Math.min(100, r.attainment_pct);
                        const hasTarget = r.target_amount > 0;
                        return (
                            <div key={r.branch_id}>
                                <div className="flex items-center justify-between text-xs font-body mb-1">
                                    <span className="text-text-dark font-medium truncate">{r.branch_name}</span>
                                    <span className="text-neutral-gray shrink-0 ml-2">
                                        {formatGHS(r.actual_amount)}{hasTarget && <> / {formatGHS(r.target_amount)}</>}
                                    </span>
                                </div>
                                {hasTarget ? (
                                    <>
                                        <div className="relative h-2 rounded-full bg-neutral-light overflow-hidden">
                                            <div className={`h-full rounded-full ${r.on_track ? 'bg-secondary/80' : 'bg-warning/80'}`} style={{ width: `${pct}%` }} />
                                            <div className="absolute top-0 bottom-0 w-0.5 bg-text-dark/50" style={{ left: `${Math.min(100, r.pace_pct)}%` }} title={`Pace: ${r.pace_pct}%`} />
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] font-body mt-0.5">
                                            <span className={r.on_track ? 'text-secondary' : 'text-warning'}>
                                                {r.attainment_pct}% attained · {r.on_track ? 'on track' : 'behind'}
                                            </span>
                                            <span className="text-neutral-gray">proj. {formatGHS(r.projected_amount)}</span>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-[10px] text-neutral-gray font-body italic">No target set</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
}

function SetTargetsModal({ year, month, rows, onClose }: { year: number; month: number; rows: TargetVsActual[]; onClose: () => void }) {
    const qc = useQueryClient();
    const [values, setValues] = useState<Record<number, string>>(
        () => Object.fromEntries(rows.map(r => [r.branch_id, r.target_amount > 0 ? String(r.target_amount) : ''])),
    );
    const [saving, setSaving] = useState(false);
    const monthLabel = new Date(year, month - 1, 1).toLocaleString('en', { month: 'long', year: 'numeric' });

    async function handleSave() {
        setSaving(true);
        try {
            await Promise.all(rows.map(r => {
                const v = parseFloat(values[r.branch_id] ?? '');
                const amount = Number.isFinite(v) ? v : 0;
                if (amount === r.target_amount) return Promise.resolve();
                return analyticsService.setRevenueTarget({ branch_id: r.branch_id, year, month, target_amount: amount });
            }));
            await qc.invalidateQueries({ queryKey: ['analytics', 'targets-vs-actual'] });
            toast.success('Targets saved');
            onClose();
        } catch {
            toast.error('Failed to save targets');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div className="bg-neutral-card rounded-2xl border border-[#f0e8d8] w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-text-dark text-base font-bold font-body mb-1">Set Revenue Targets</h2>
                <p className="text-neutral-gray text-xs font-body mb-4">{monthLabel} · monthly goal per branch</p>
                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto mb-5">
                    {rows.map(r => (
                        <div key={r.branch_id} className="flex items-center gap-3">
                            <span className="text-text-dark text-sm font-body flex-1 truncate">{r.branch_name}</span>
                            <div className="relative w-32">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-gray text-sm">₵</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={values[r.branch_id] ?? ''}
                                    onChange={e => setValues(v => ({ ...v, [r.branch_id]: e.target.value }))}
                                    placeholder="0"
                                    className="w-full h-9 pl-6 pr-2 rounded-lg bg-neutral-light border border-neutral-gray/20 focus:border-primary/50 outline-none text-sm font-body text-text-dark"
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 h-10 rounded-xl bg-neutral-light text-text-dark text-sm font-medium font-body hover:bg-neutral-gray/15 transition-colors cursor-pointer">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 h-10 rounded-xl bg-primary text-white text-sm font-semibold font-body hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50">
                        {saving ? 'Saving…' : 'Save targets'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Product Summary Table ────────────────────────────────────────────────────

type ProductItem = { id?: number; name: string; size_label?: string; units: number; rev: number; trend?: number };
type ProductSortKey = 'name' | 'units' | 'rev';

function ProductSummaryCard({ items }: { items?: ProductItem[] }) {
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
    const exportRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();
    const [period, setPeriod] = useState<Period>('today');
    const [isExporting, setIsExporting] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportFormat, setReportFormat] = useState<'pdf' | 'csv'>('pdf');
    const [reportSections, setReportSections] = useState({ summary: true, itemsSold: true, dailyBreakdown: true, topCustomers: true });
    const [isGenerating, setIsGenerating] = useState(false);
    const [customDateFrom, setCustomDateFrom] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [customDateTo, setCustomDateTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const customRange = period === 'custom'
        ? { date_from: customDateFrom, date_to: customDateTo }
        : undefined;
    const branchId = useMemo(() => {
        const raw = searchParams.get('branch');
        if (!raw) {
            return undefined;
        }

        const parsed = Number(raw);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    }, [searchParams]);

    const { sales, orders, customers, isLoading } = useAnalytics(period, branchId, customRange);

    // Growth trajectory — force monthly buckets on the 90-day view.
    const trendBucket = (period === 'today' || period === 'yesterday') ? 'hour' : period === '90d' ? 'month' : undefined;
    const { data: revenueTrend } = useRevenueTrend(period, branchId, trendBucket, customRange);
    const { data: repeatCustomers } = useRepeatCustomerAnalytics(period, branchId, customRange);
    const { data: weekdayHour } = useWeekdayHourAnalytics(period, branchId, customRange);

    // Additional analytics hooks
    const { data: orderSources } = useOrderSourceAnalytics(period, branchId, customRange);
    const { data: topItems } = useTopItemsAnalytics(period, branchId, 10, customRange);
    const { data: allProductItems } = useTopItemsAnalytics(period, branchId, 500, customRange);
    const { data: bottomItems } = useBottomItemsAnalytics(period, branchId, 3, customRange);
    const { data: categoryRevenue } = useCategoryRevenueAnalytics(period, branchId, customRange);
    const { data: branchPerformance } = useBranchPerformanceAnalytics(period, branchId, customRange);
    const { data: deliveryPickup } = useDeliveryPickupAnalytics(period, branchId, customRange);
    const { data: paymentMethods } = usePaymentMethodAnalytics(period, branchId, customRange);
    const { data: discountUsage } = useDiscountUsageAnalytics(period, branchId, customRange);
    const { data: cancellationReasons } = useCancellationReasonsAnalytics(period, branchId, customRange);
    const { data: fulfillment } = useFulfillmentAnalytics(period, branchId, customRange);
    const { data: staffSales } = useAdminStaffSales(period, branchId, customRange);
    const { data: customerLifecycle } = useCustomerLifecycleAnalytics(period, branchId, customRange);
    const { data: basketAffinity } = useBasketAffinityAnalytics(period, branchId, customRange);
    const { data: targetsVsActual } = useTargetsVsActual();
    const [showTargetsModal, setShowTargetsModal] = useState(false);

    const fulfilmentPct = useMemo(() => {
        if (!orders?.orders_by_status || !orders?.total_orders) return 0;
        const completed = (orders.orders_by_status['completed'] ?? 0) + (orders.orders_by_status['delivered'] ?? 0);
        return orders.total_orders > 0 ? Math.round((completed / orders.total_orders) * 100) : 0;
    }, [orders]);
    const cancelledPct = useMemo(() => {
        if (!orders?.orders_by_status || !orders?.total_orders) return 0;
        const c = orders.orders_by_status['cancelled'] ?? 0;
        return orders.total_orders > 0 ? Math.round((c / orders.total_orders) * 1000) / 10 : 0;
    }, [orders]);

    async function handleExportPdf(): Promise<void> {
        if (!exportRef.current || isExporting) {
            return;
        }

        setIsExporting(true);
        try {
            const branchPart = branchId ? `branch-${branchId}` : 'all-branches';
            const filename = `analytics-${period}-${branchPart}-${new Date().toISOString().slice(0, 10)}.pdf`;
            await exportElementToPdf({
                element: exportRef.current,
                filename,
            });
            toast.success('Analytics report exported as PDF');
        } catch (error) {
            console.error('Failed to export analytics PDF:', error);
            toast.error('Failed to export analytics report');
        } finally {
            setIsExporting(false);
        }
    }

    async function handleGenerateReport(): Promise<void> {
        setIsGenerating(true);
        try {
            const range = getDateRange(period, customRange ?? undefined);
            const periodLabel = PERIOD_LABELS[period] ?? period;
            const branchName = branchId ? `Branch #${branchId}` : 'All Branches';
            const dateRange = `${range.date_from} – ${range.date_to}`;
            const generatedAt = new Date().toLocaleString('en-GH', { timeZone: 'Africa/Accra', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            // Fetch all items if needed (full list, not just top 10)
            let allItemsData = topItems;
            if (reportSections.itemsSold) {
                allItemsData = await analyticsService.getTopItemsAnalytics({ ...range, branch_id: branchId, limit: 500 });
            }

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
                    summary: reportSections.summary && sales ? {
                        totalRevenue: sales.total_sales,
                        totalOrders: sales.total_orders,
                        avgOrderValue: sales.average_order_value,
                        noChargeOrders: sales.no_charge_count,
                        noChargeAmount: sales.no_charge_amount,
                        cancelledOrders: orders?.orders_by_status?.['cancelled'] ?? 0,
                        avgItemsPerOrder: sales.avg_items_per_order,
                    } : undefined,
                    itemsSold: reportSections.itemsSold && itemRows.length ? itemRows : undefined,
                    dailyBreakdown: reportSections.dailyBreakdown && sales?.sales_by_day?.length
                        ? sales.sales_by_day.map(d => ({ date: d.date, orders: d.orders, revenue: Number(d.total) }))
                        : undefined,
                    topCustomers: reportSections.topCustomers && customers?.top_customers_by_spending?.length
                        ? customers.top_customers_by_spending.slice(0, 10).map(c => ({
                            name: c.user?.name ?? c.name ?? 'Unknown',
                            phone: c.user?.phone ?? '—',
                            orders: c.orders_count ?? 0,
                            totalSpend: c.total_spend ?? 0,
                        }))
                        : undefined,
                };
                printReport(buildReportHtml(reportData));
            } else {
                if (reportSections.summary && sales) {
                    generateCsv(['Metric', 'Value'], [
                        ['Total Revenue', String(sales.total_sales)],
                        ['Total Orders', String(sales.total_orders)],
                        ['Avg. Order Value', String(sales.average_order_value)],
                        ['No-Charge Orders', String(sales.no_charge_count)],
                        ['No-Charge Amount', String(sales.no_charge_amount)],
                        ['Cancelled Orders', String(orders?.orders_by_status?.['cancelled'] ?? 0)],
                        ['Avg. Items per Order', String(sales.avg_items_per_order ?? '—')],
                    ], `sales-summary-${range.date_from}.csv`);
                }
                if (reportSections.itemsSold && itemRows.length) {
                    generateCsv(['Item', 'Qty Sold', 'Revenue (GHS)', '% of Total', 'Trend (%)'],
                        itemRows.map(i => [i.name, String(i.units), String(i.revenue), String(i.pctOfTotal ?? ''), String(i.trend ?? '')]),
                        `items-sold-${range.date_from}.csv`);
                }
                if (reportSections.dailyBreakdown && sales?.sales_by_day?.length) {
                    generateCsv(['Date', 'Orders', 'Revenue (GHS)'],
                        sales.sales_by_day.map(d => [d.date, String(d.orders), String(d.total)]),
                        `daily-breakdown-${range.date_from}.csv`);
                }
                if (reportSections.topCustomers && customers?.top_customers_by_spending?.length) {
                    generateCsv(['Name', 'Phone', 'Orders', 'Total Spend (GHS)'],
                        customers.top_customers_by_spending.slice(0, 10).map(c => [
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
            toast.error('Failed to generate report');
        } finally {
            setIsGenerating(false);
        }
    }

    return (
        <div ref={exportRef} className="px-4 md:px-8 py-6 max-w-6xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-text-dark text-2xl font-bold font-body">Analytics</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5 flex items-center gap-1.5">
                        <CalendarIcon size={13} weight="fill" />
                        {branchId ? `Branch #${branchId} · Admin View` : 'All Branches · Admin View'}
                    </p>
                </div>
                <div className="flex items-center gap-2" data-export-ignore>
                    <button
                        type="button"
                        onClick={() => void handleExportPdf()}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-4 py-2 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-medium font-body hover:border-primary/40 transition-colors cursor-pointer shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <DownloadSimpleIcon size={15} weight="bold" className="text-primary" />
                        {isExporting ? 'Exporting…' : 'Export PDF'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowReportModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium font-body hover:bg-primary-hover transition-colors cursor-pointer shrink-0"
                    >
                        <FileCsvIcon size={15} weight="bold" />
                        Generate Report
                    </button>
                </div>
            </div>

            {/* Period filter */}
            <PeriodFilter
                value={period}
                onChange={setPeriod}
                customRange={{ date_from: customDateFrom, date_to: customDateTo }}
                onCustomRangeChange={(r: CustomRange) => { setCustomDateFrom(r.date_from); setCustomDateTo(r.date_to); }}
                className="mb-6"
            />

            {/* KPI row */}
            <div className="flex flex-wrap gap-3 mb-5">
                <KpiCard icon={CurrencyCircleDollarIcon} label="Revenue" value={isLoading ? '…' : formatGHS(sales?.total_sales ?? 0)} accent />
                <KpiCard icon={ReceiptIcon} label="Orders" value={isLoading ? '…' : String(sales?.total_orders ?? orders?.total_orders ?? 0)} />
                <KpiCard icon={TrendUpIcon} label="Avg. Order" value={isLoading ? '…' : formatGHS(sales?.average_order_value ?? 0)} />
                {/* <KpiCard icon={UsersIcon} label="New Customers" value={isLoading ? '…' : String(customers?.new_customers_30_days ?? 0)} /> */}
                <KpiCard icon={CheckCircleIcon} label="Fulfilment" value={`${fulfilmentPct}%`} />
                <KpiCard icon={XCircleIcon} label="Cancellations" value={`${cancelledPct}%`} sub={(() => { const n = orders?.orders_by_status?.['cancelled'] ?? 0; return n > 0 ? `${n} order${n !== 1 ? 's' : ''} cancelled` : undefined; })()}
                />
                <KpiCard
                    icon={TagIcon}
                    label="No Charge"
                    value={isLoading ? '…' : String(sales?.no_charge_count ?? 0)}
                    sub={sales?.no_charge_amount ? formatGHS(sales.no_charge_amount) + ' waived' : undefined}
                />
            </div>

            {/* Growth trajectory */}
            <div className="mb-3">
                <GrowthTrendCard trend={revenueTrend} period={period} />
            </div>

            {/* Revenue + heatmap */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-3 mb-3">
                <RevenueChart salesByDay={sales?.sales_by_day} />
                <PeakHoursHeatmap ordersByHour={orders?.orders_by_hour} />
            </div>

            {/* Revenue by hour */}
            <div className="mb-3">
                <RevenueByHourChart ordersByHour={orders?.orders_by_hour} />
            </div>

            {/* Source + category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <OrderSourceChart orderSources={orderSources} />
                <CategoryRevenue categoryRevenue={categoryRevenue} />
            </div>

            {/* Top items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <TopItemsCard items={topItems?.slice(0, 5)} title="Top 5 Items" allowSortToggle />
                <div className="flex flex-col gap-3">
                    <TopItemsCard items={bottomItems} title="Slow Movers (Last 7 Days)" />
                </div>
            </div>

            {/* Concentration + outcomes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <RevenueConcentrationCard items={topItems} totalRevenue={sales?.total_sales} />
                <FulfilmentFunnelCard ordersByStatus={orders?.orders_by_status} totalOrders={orders?.total_orders} />
            </div>

            {/* Busiest times + loyalty */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3 mb-3">
                <WeekdayHourHeatmap cells={weekdayHour?.cells} />
                <RepeatCustomersCard data={repeatCustomers} />
            </div>

            {/* Menu comparison device */}
            <div className="mb-3">
                <MenuComparison period={period} customRange={customRange ?? undefined} branchId={branchId} />
            </div>

            {/* Product summary */}
            <div className="mb-3">
                <ProductSummaryCard items={allProductItems} />
            </div>

            {/* Branch performance */}
            <div className="mb-3">
                <BranchPerformanceTable branchPerformance={branchPerformance} />
            </div>

            {/* Customer insights */}
            <CustomerInsights
                byOrders={customers?.top_customers_by_orders}
                bySpending={customers?.top_customers_by_spending}
                deliveryPickup={deliveryPickup}
                paymentMethods={paymentMethods}
            />

            {/* Repeat vs new + orders by day */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <RepeatVsNewCustomers
                    totalCustomers={customers?.total_customers}
                    newCustomers={customers?.new_customers_in_period ?? customers?.new_customers_30_days}
                />
                <OrdersByDayOfWeek salesByDay={sales?.sales_by_day} />
            </div>

            {/* Operational efficiency — kitchen speed + staff productivity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                <KitchenSpeedCard data={fulfillment} />
                <StaffProductivityCard rows={staffSales} />
            </div>

            {/* Targets vs actual (#5) */}
            <div className="mt-3">
                <TargetsVsActualCard data={targetsVsActual} onEdit={() => setShowTargetsModal(true)} />
            </div>

            {/* Customer lifetime / churn + retention cohorts (#4) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                <CustomerLifecycleCard data={customerLifecycle} />
                <RetentionCohortCard cohorts={customerLifecycle?.cohorts} />
            </div>

            {/* Basket affinity (#4) */}
            <div className="mt-3">
                <BasketAffinityCard data={basketAffinity} />
            </div>

            {/* Avg items / discounts / cancellations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <AvgItemsPerOrder avgItems={sales?.avg_items_per_order} />
                <DiscountUsage data={discountUsage} />
                <CancellationReasons data={cancellationReasons} />
            </div>

            {/* Set targets modal */}
            {showTargetsModal && targetsVsActual && (
                <SetTargetsModal
                    year={targetsVsActual.year}
                    month={targetsVsActual.month}
                    rows={targetsVsActual.rows}
                    onClose={() => setShowTargetsModal(false)}
                />
            )}

            {/* Report generation modal */}
            {showReportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowReportModal(false)}>
                    <div className="bg-neutral-card rounded-2xl border border-[#f0e8d8] w-full max-w-sm p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                        <h2 className="text-text-dark text-base font-bold font-body mb-1">Generate Report</h2>
                        <p className="text-neutral-gray text-xs font-body mb-5">
                            {PERIOD_LABELS[period]} &nbsp;·&nbsp; {branchId ? `Branch #${branchId}` : 'All Branches'}
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
