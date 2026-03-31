'use client';

import { useState, useMemo, useRef } from 'react';
import { useAnalytics, useOrderSourceAnalytics, useTopItemsAnalytics, useBottomItemsAnalytics, useCategoryRevenueAnalytics, useBranchPerformanceAnalytics, useDeliveryPickupAnalytics, usePaymentMethodAnalytics } from '@/lib/api/hooks/useAnalytics';
import { useSearchParams } from 'next/navigation';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { toast } from '@/lib/utils/toast';
import { exportElementToPdf } from '@/lib/utils/exportPdf';
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
} from '@phosphor-icons/react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 'today' | 'yesterday' | 'week' | 'month' | '30d' | '90d' | 'custom';

// ─── Config ────────────────────────────────────────────────────────────────────

const BRANCH_COLORS = ['#e49925', '#6c833f', '#c8a87a'];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const HOURS = ['7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22'];

const SOURCE_COLORS = ['#e49925','#6c833f','#c8a87a','#1976d2','#e91e63','#3f51b5'];

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

// ─── Revenue chart (from API sales_by_day) ─────────────────────────────────────

function RevenueChart({ salesByDay }: { salesByDay?: Array<{ date: string; total: number; orders: number }> }) {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    const dayLabels = useMemo(() => {
        if (!salesByDay?.length) return DAYS;
        return salesByDay.map((d) => {
            const date = new Date(d.date);
            return DAYS[(date.getDay() + 6) % 7] ?? date.toLocaleDateString('en-GB', { weekday: 'short' });
        });
    }, [salesByDay]);
    const values = useMemo(() => salesByDay?.map((d) => Number(d.total)) ?? [], [salesByDay]);
    const orderCounts = useMemo(() => salesByDay?.map((d) => d.orders) ?? [], [salesByDay]);
    const maxVal = values.length ? Math.max(...values, 1) : 1;
    const labels = salesByDay?.length ? dayLabels : DAYS;

    return (
        <Card>
            <SectionTitle title="Daily Revenue — All Branches" sub={salesByDay?.length ? `${salesByDay.length}-day view` : '7-day view'} />
            <div className="flex items-end gap-2 h-36">
                {labels.map((day, di) => {
                    const val = values[di] ?? 0;
                    const orders = orderCounts[di] ?? 0;
                    const h = Math.round((val / maxVal) * 112) || 4;
                    const isHovered = hoveredIdx === di;
                    return (
                        <div
                            key={`${day}-${di}`}
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
                            <div
                                className={`w-full rounded-sm transition-all duration-200 ${isHovered ? 'bg-primary' : 'bg-primary/70'}`}
                                style={{ height: h, minHeight: 4 }}
                            />
                            <span className="text-[9px] text-neutral-gray font-body">{day}</span>
                        </div>
                    );
                })}
            </div>
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
    const [selectedDay, setSelectedDay] = useState<string>('All');
    const { branches } = useBranch();
    const allDays = ['All', ...DAYS];

    // Derive hour range from branch operating hours
    const { startHour, endHour } = useMemo(() => {
        let earliest = 7;
        let latest = 22;
        if (branches.length > 0) {
            const opens: number[] = [];
            const closes: number[] = [];
            branches.forEach((b: any) => {
                if (b.operatingHours) {
                    Object.values(b.operatingHours).forEach((oh: any) => {
                        if (oh?.isOpen) {
                            const o = timeStrToHour(oh.openTime ?? oh.open_time);
                            const c = timeStrToHour(oh.closeTime ?? oh.close_time);
                            if (o !== null) opens.push(o);
                            if (c !== null) closes.push(c);
                        }
                    });
                }
            });
            if (opens.length) earliest = Math.min(...opens);
            if (closes.length) latest = Math.max(...closes);
        }
        // clamp to reasonable bounds
        return { startHour: Math.max(0, earliest), endHour: Math.min(23, latest) };
    }, [branches]);

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
    }, [selectedDay, ordersByHour, hours, startHour]);

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
                <>
                    <div className="flex gap-1.5 mb-3 flex-wrap">
                        {allDays.map(d => (
                            <button key={d} type="button" onClick={() => setSelectedDay(d)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold font-body transition-all cursor-pointer ${selectedDay === d ? 'bg-primary text-white' : 'bg-neutral-light text-neutral-gray hover:text-text-dark'}`}>
                                {d}
                            </button>
                        ))}
                    </div>
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
                </>
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

function TopItemsCard({ items, title, allowSortToggle = false }: { items?: Array<{ id?: number; name: string; units: number; rev: number; trend?: number }>; title: string; allowSortToggle?: boolean }) {
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
                                        <span className="text-xs font-semibold font-body text-text-dark truncate">{item.name}</span>
                                        <span className="text-[10px] font-body text-neutral-gray shrink-0">×{item.units}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <span className="text-xs font-bold font-body text-primary">{formatGHS(item.rev)}</span>
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

function CustomerInsights({ topCustomers, deliveryPickup, paymentMethods }: { 
    topCustomers?: Array<{ name?: string; orders_count?: number; total_spend?: number; user?: { name?: string }; }>; 
    deliveryPickup?: { delivery_pct: number; pickup_pct: number };
    paymentMethods?: Array<{ label: string; pct: number }>;
}) {
    const deliveryPct = deliveryPickup?.delivery_pct ?? 0;
    const pickupPct = deliveryPickup?.pickup_pct ?? 0;
    const circumference = 2 * Math.PI * 28;
    const delDash = (deliveryPct / 100) * circumference;

    const paymentData = paymentMethods || [];
    const paymentColors = ['#e49925', '#c8a87a', '#8b7f70'];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Top 10 customers */}
            <Card>
                <SectionTitle title="Top 10 Customers by Orders" />
                {!topCustomers || topCustomers.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-neutral-gray text-sm">
                        No customer data available
                    </div>
                ) : (
                    <div className="flex flex-col gap-0">
                        {topCustomers.slice(0, 10).map((c, i) => {
                            const name = (c as { user?: { name?: string }; name?: string }).user?.name ?? (c as { name?: string }).name ?? '—';
                            const orders = (c as { orders_count?: number }).orders_count ?? 0;
                            const spend = (c as { total_spend?: number }).total_spend ?? 0;
                            return (
                                <div key={name + i} className={`flex items-center gap-3 py-2.5 ${i < 9 ? 'border-b border-[#f0e8d8]' : ''}`}>
                                    <span className="text-neutral-gray/50 text-[10px] font-bold font-body w-4 shrink-0">{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-text-dark text-xs font-semibold font-body truncate">{name}</p>
                                        <p className="text-neutral-gray text-[10px] font-body">{orders} orders</p>
                                    </div>
                                    {spend > 0 && <span className="text-primary text-xs font-bold font-body shrink-0">{formatGHS(spend)}</span>}
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
            <SectionTitle title="Repeat vs New Customers" sub="Based on customer lifetime data" />
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
                                <div className="w-full rounded-sm bg-primary/70 hover:bg-primary transition-colors" style={{ height: h, minHeight: 3 }} />
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

function AvgItemsPerOrder() {
    const HARDCODED = [
        { label: '1 item', pct: 22 },
        { label: '2 items', pct: 38 },
        { label: '3 items', pct: 25 },
        { label: '4+ items', pct: 15 },
    ];
    return (
        <Card>
            <div className="mb-4">
                <p className="text-text-dark text-sm font-bold font-body">Avg. Items per Order</p>
                <p className="text-[10px] font-body mt-0.5 text-warning font-semibold">UI only · Connect backend to activate</p>
            </div>
            <p className="text-3xl font-bold text-primary font-body mb-4">2.4</p>
            <div className="flex flex-col gap-2">
                {HARDCODED.map(row => (
                    <div key={row.label}>
                        <div className="flex justify-between mb-0.5">
                            <span className="text-xs font-body text-text-dark">{row.label}</span>
                            <span className="text-xs font-bold font-body text-text-dark">{row.pct}%</span>
                        </div>
                        <div className="h-1 bg-neutral-gray/15 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-primary/60" style={{ width: `${row.pct}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

// ─── Discount Usage (UI-only) ─────────────────────────────────────────────────

function DiscountUsage() {
    const HARDCODED = [
        { label: 'CEDIBITES10', used: 48, savings: 240 },
        { label: 'WELCOME20', used: 31, savings: 310 },
        { label: 'FREESHIP', used: 19, savings: 95 },
    ];
    return (
        <Card>
            <div className="mb-4">
                <p className="text-text-dark text-sm font-bold font-body">Discount Usage</p>
                <p className="text-[10px] font-body mt-0.5 text-warning font-semibold">UI only · Connect backend to activate</p>
            </div>
            <div className="flex flex-col gap-0">
                {HARDCODED.map((d, i) => (
                    <div key={d.label} className={`flex items-center justify-between py-2.5 ${i < HARDCODED.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}>
                        <div>
                            <p className="text-xs font-semibold font-body text-text-dark font-mono">{d.label}</p>
                            <p className="text-[10px] font-body text-neutral-gray">{d.used} uses</p>
                        </div>
                        <span className="text-xs font-bold font-body text-primary">-{formatGHS(d.savings)}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
}

// ─── Cancellation Reasons (UI-only) ──────────────────────────────────────────

function CancellationReasons() {
    const HARDCODED = [
        { label: 'Customer changed mind', pct: 40 },
        { label: 'Long wait time', pct: 28 },
        { label: 'Item unavailable', pct: 18 },
        { label: 'Duplicate order', pct: 9 },
        { label: 'Other', pct: 5 },
    ];
    return (
        <Card>
            <div className="mb-4">
                <p className="text-text-dark text-sm font-bold font-body">Cancellation Reasons</p>
                <p className="text-[10px] font-body mt-0.5 text-warning font-semibold">UI only · Connect backend to activate</p>
            </div>
            <div className="flex flex-col gap-2.5">
                {HARDCODED.map(row => (
                    <div key={row.label}>
                        <div className="flex justify-between mb-0.5">
                            <span className="text-xs font-body text-text-dark">{row.label}</span>
                            <span className="text-xs font-bold font-body text-text-dark">{row.pct}%</span>
                        </div>
                        <div className="h-1 bg-neutral-gray/15 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-error/60" style={{ width: `${row.pct}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PERIODS: { key: Period; label: string }[] = [
    { key: 'today',     label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'week',      label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: '30d',   label: 'Last 30 Days' },
    { key: '90d',   label: 'Last 90 Days' },
    { key: 'custom', label: 'Custom' },
];

export default function AdminAnalyticsPage() {
    const exportRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();
    const [period, setPeriod] = useState<Period>('week');
    const [isExporting, setIsExporting] = useState(false);
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
    
    // Additional analytics hooks
    const { data: orderSources } = useOrderSourceAnalytics(period, branchId, customRange);
    const { data: topItems } = useTopItemsAnalytics(period, branchId, 10, customRange);
    const { data: bottomItems } = useBottomItemsAnalytics(period, branchId, 3, customRange);
    const { data: categoryRevenue } = useCategoryRevenueAnalytics(period, branchId, customRange);
    const { data: branchPerformance } = useBranchPerformanceAnalytics(period, branchId, customRange);
    const { data: deliveryPickup } = useDeliveryPickupAnalytics(period, branchId, customRange);
    const { data: paymentMethods } = usePaymentMethodAnalytics(period, branchId, customRange);

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
                <button
                    type="button"
                    onClick={() => void handleExportPdf()}
                    disabled={isExporting}
                    data-export-ignore
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-medium font-body hover:border-primary/40 transition-colors cursor-pointer shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <DownloadSimpleIcon size={15} weight="bold" className="text-primary" />
                    {isExporting ? 'Exporting…' : 'Export PDF'}
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
            {period === 'custom' && (
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <input
                        type="date"
                        value={customDateFrom}
                        onChange={(event) => setCustomDateFrom(event.target.value)}
                        className="px-3 py-2 rounded-xl border border-[#f0e8d8] bg-neutral-card text-sm font-body text-text-dark focus:outline-none focus:border-primary/40"
                    />
                    <input
                        type="date"
                        value={customDateTo}
                        onChange={(event) => setCustomDateTo(event.target.value)}
                        className="px-3 py-2 rounded-xl border border-[#f0e8d8] bg-neutral-card text-sm font-body text-text-dark focus:outline-none focus:border-primary/40"
                    />
                </div>
            )}

            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                <KpiCard icon={CurrencyCircleDollarIcon} label="Revenue" value={isLoading ? '…' : formatGHS(sales?.total_sales ?? 0)} accent />
                <KpiCard icon={ReceiptIcon} label="Orders" value={isLoading ? '…' : String(sales?.total_orders ?? orders?.total_orders ?? 0)} />
                <KpiCard icon={TrendUpIcon} label="Avg. Order" value={isLoading ? '…' : formatGHS(sales?.average_order_value ?? 0)} />
                <KpiCard icon={UsersIcon} label="New Customers" value={isLoading ? '…' : String(customers?.new_customers_30_days ?? 0)} />
                <KpiCard icon={CheckCircleIcon} label="Fulfilment" value={`${fulfilmentPct}%`} />
                <KpiCard icon={XCircleIcon} label="Cancellations" value={`${cancelledPct}%`} />
            </div>

            {/* Revenue + heatmap */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-3 mb-3">
                <RevenueChart salesByDay={sales?.sales_by_day} />
                <PeakHoursHeatmap ordersByHour={orders?.orders_by_hour} />
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

            {/* Branch performance */}
            <div className="mb-3">
                <BranchPerformanceTable branchPerformance={branchPerformance} />
            </div>

            {/* Customer insights */}
            <CustomerInsights
                topCustomers={customers?.top_customers_by_orders ?? customers?.top_customers_by_spending}
                deliveryPickup={deliveryPickup}
                paymentMethods={paymentMethods}
            />

            {/* Repeat vs new + orders by day */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <RepeatVsNewCustomers
                    totalCustomers={customers?.total_customers}
                    newCustomers={customers?.new_customers_30_days}
                />
                <OrdersByDayOfWeek salesByDay={sales?.sales_by_day} />
            </div>

            {/* Avg items / discounts / cancellations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <AvgItemsPerOrder />
                <DiscountUsage />
                <CancellationReasons />
            </div>
        </div>
    );
}
