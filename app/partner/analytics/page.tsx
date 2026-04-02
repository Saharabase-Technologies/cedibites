'use client';

import { useState, useMemo } from 'react';
import {
    CalendarIcon,
    ChartBarIcon,
    CurrencyCircleDollarIcon,
    ReceiptIcon,
    TrendUpIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    SpinnerIcon,
} from '@phosphor-icons/react';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import {
    useAnalytics,
    useOrderSourceAnalytics,
    useTopItemsAnalytics,
    useBottomItemsAnalytics,
    useCategoryRevenueAnalytics,
    useDeliveryPickupAnalytics,
    usePaymentMethodAnalytics,
    type AnalyticsPeriod,
} from '@/lib/api/hooks/useAnalytics';
import { useBranchesApi } from '@/lib/api/hooks/useBranchesApi';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = Exclude<AnalyticsPeriod, 'custom'>;

const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SOURCE_COLORS = ['#e49925', '#6c833f', '#c8a87a', '#1976d2', '#e91e63', '#3f51b5'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGHS(v: number) {
    return `₵${v.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent = false, icon: Icon }: {
    label: string; value: string; sub?: string; accent?: boolean; icon: React.ElementType;
}) {
    return (
        <div className={`rounded-2xl px-5 py-4 flex flex-col gap-2 ${accent ? 'bg-primary' : 'bg-neutral-card border border-[#f0e8d8]'}`}>
            <div className="flex items-center gap-2">
                <Icon size={13} weight="fill" className={accent ? 'text-white/70' : 'text-neutral-gray'} />
                <span className={`text-[10px] font-bold font-body uppercase tracking-widest ${accent ? 'text-white/80' : 'text-neutral-gray'}`}>{label}</span>
            </div>
            <p className={`text-2xl font-bold font-body leading-none ${accent ? 'text-white' : 'text-text-dark'}`}>{value}</p>
            {sub && <p className={`text-xs font-body ${accent ? 'text-white/70' : 'text-neutral-gray'}`}>{sub}</p>}
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

// ─── Revenue chart (from API sales_by_day) ───────────────────────────────────

function RevenueChart({ salesByDay, branchName }: { salesByDay?: Array<{ date: string; total: number; orders: number }>; branchName: string }) {
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
    const weekTotal = values.reduce((a, b) => a + b, 0);
    const labels = salesByDay?.length ? dayLabels : DAYS;

    return (
        <Card>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                    <SectionTitle title={`Daily Revenue — ${branchName}`} sub={salesByDay?.length ? `${salesByDay.length}-day view` : '7-day view'} />
                    <p className="text-primary text-sm font-bold font-body -mt-2">{formatGHS(weekTotal)} this period</p>
                </div>
            </div>
            {!salesByDay?.length ? (
                <div className="flex items-center justify-center h-32 text-neutral-gray text-sm">No revenue data available</div>
            ) : (
                <div className="flex items-end gap-2 h-36">
                    {labels.map((day, di) => {
                        const val = values[di] ?? 0;
                        const orders = orderCounts[di] ?? 0;
                        const h = Math.round((val / maxVal) * 112) || 4;
                        const isHovered = hoveredIdx === di;
                        return (
                            <div key={`${day}-${di}`} className="flex-1 flex flex-col items-center gap-1 relative group"
                                onMouseEnter={() => setHoveredIdx(di)} onMouseLeave={() => setHoveredIdx(null)}>
                                {isHovered && val > 0 && (
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 bg-text-dark text-white rounded-lg px-2.5 py-1.5 text-[10px] font-body whitespace-nowrap shadow-lg pointer-events-none">
                                        <p className="font-bold">{formatGHS(val)}</p>
                                        <p className="text-white/70">{orders} order{orders !== 1 ? 's' : ''}</p>
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-text-dark" />
                                    </div>
                                )}
                                <div
                                    className={`w-full rounded-sm transition-all duration-200 flex items-end justify-center pb-0.5 ${isHovered ? 'bg-primary' : 'bg-primary/70'}`}
                                    style={{ height: Math.max(h, 4), minHeight: 4 }}
                                >
                                    {val > 0 && h >= 20 && (
                                        <span className="text-[8px] font-bold text-white leading-none select-none">
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

    return (
        <Card>
            <SectionTitle title="Peak Hours Heatmap" sub="Orders by hour — darker = busier" />
            {!hasData ? (
                <div className="flex items-center justify-center h-32 text-neutral-gray text-sm">No peak hours data available</div>
            ) : (
                <div className="flex gap-1 items-end">
                    {hours.map((h, i) => (
                        <div key={h} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full rounded-sm flex items-center justify-center"
                                style={{ height: 44, background: cellBg(data[i]), transition: 'background 0.3s ease' }}>
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
                <div className="flex items-center justify-center h-32 text-neutral-gray text-sm">No order source data available</div>
            ) : (
                <div className="flex flex-col md:flex-row gap-5 items-start">
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
                                        strokeLinecap="butt" />
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

// ─── Top / slow items ─────────────────────────────────────────────────────────

function TopItemsCard({ items, title }: { items?: Array<{ id?: number; name: string; size_label?: string; units: number; rev: number; trend?: number }>; title: string }) {
    const itemList = items || [];
    const maxRev = itemList.length > 0 ? Math.max(...itemList.map(i => i.rev), 1) : 1;
    return (
        <Card>
            <SectionTitle title={title} />
            {itemList.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-neutral-gray text-sm">No items data available</div>
            ) : (
                <div className="flex flex-col gap-3">
                    {itemList.map((item, i) => (
                        <div key={item.id || `${item.name}-${i}`}>
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[10px] font-bold font-body text-neutral-gray/50 w-4 shrink-0">{i + 1}</span>
                                    <span className="text-xs font-semibold font-body text-text-dark truncate">
                                        {getOrderItemLineLabel({ name: item.name, sizeLabel: item.size_label })}
                                    </span>
                                    <span className="text-[10px] font-body text-neutral-gray">×{item.units}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <span className="text-xs font-bold font-body text-primary">{formatGHS(item.rev)}</span>
                                    {item.trend !== undefined && (
                                        <div className="flex items-center gap-0.5">
                                            {item.trend > 0
                                                ? <ArrowUpIcon size={10} className="text-secondary" />
                                                : <ArrowDownIcon size={10} className="text-error" />}
                                            <span className={`text-[10px] font-body ${item.trend > 0 ? 'text-secondary' : 'text-error'}`}>
                                                {Math.abs(item.trend)}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="h-1 bg-neutral-gray/15 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${(item.rev / maxRev) * 100}%`, background: i === 0 ? '#e49925' : '#c8a87a', transition: 'width 0.4s ease' }} />
                            </div>
                        </div>
                    ))}
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
                <div className="flex items-center justify-center h-32 text-neutral-gray text-sm">No category revenue data available</div>
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

// ─── Customer insights ────────────────────────────────────────────────────────

function CustomerInsights({ topCustomers, deliveryPickup, paymentMethods }: {
    topCustomers?: Array<{ name?: string; orders_count?: number; total_spend?: number; user?: { name?: string }; }>;
    deliveryPickup?: { delivery_pct: number; pickup_pct: number };
    paymentMethods?: Array<{ label: string; pct: number }>;
}) {
    const deliveryPct = deliveryPickup?.delivery_pct ?? 0;
    const pickupPct   = deliveryPickup?.pickup_pct ?? 0;
    const circumference = 2 * Math.PI * 28;
    const delDash = (deliveryPct / 100) * circumference;

    const paymentData = paymentMethods || [];
    const paymentColors = ['#e49925', '#c8a87a', '#6c833f', '#1976d2', '#8b7f70'];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Top 10 customers */}
            <Card>
                <SectionTitle title="Top 10 Customers by Orders" />
                {!topCustomers || topCustomers.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-neutral-gray text-sm">No customer data available</div>
                ) : (
                    <div className="flex flex-col gap-0">
                        {topCustomers.slice(0, 10).map((c, i) => {
                            const name = c.user?.name ?? c.name ?? '—';
                            const orders = c.orders_count ?? 0;
                            const spend = c.total_spend ?? 0;
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
                        <div className="flex items-center justify-center h-20 text-neutral-gray text-sm">No delivery/pickup data available</div>
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

                {/* Payment methods */}
                <Card>
                    <SectionTitle title="Payment Methods" />
                    {paymentData.length === 0 ? (
                        <div className="flex items-center justify-center h-20 text-neutral-gray text-sm">No payment method data available</div>
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

// ─── Period config ────────────────────────────────────────────────────────────

const PERIODS: { key: Period; label: string }[] = [
    { key: 'today',     label: 'Today'        },
    { key: 'yesterday', label: 'Yesterday'    },
    { key: 'week',      label: 'This Week'    },
    { key: 'month',     label: 'This Month'   },
    { key: '30d',       label: 'Last 30 Days' },
    { key: '90d',       label: 'Last 90 Days' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartnerAnalyticsPage() {
    const { staffUser } = useStaffAuth();
    const branchName = staffUser?.branches[0]?.name ?? '';
    const branchId = staffUser?.branches[0]?.id ? Number(staffUser.branches[0].id) : undefined;

    const [period, setPeriod] = useState<Period>('today');

    const { sales, orders, customers, isLoading } = useAnalytics(period, branchId);
    const { data: orderSources } = useOrderSourceAnalytics(period, branchId);
    const { data: topItems } = useTopItemsAnalytics(period, branchId, 5);
    const { data: bottomItems } = useBottomItemsAnalytics(period, branchId, 3);
    const { data: categoryRevenue } = useCategoryRevenueAnalytics(period, branchId);
    const { data: deliveryPickup } = useDeliveryPickupAnalytics(period, branchId);
    const { data: paymentMethods } = usePaymentMethodAnalytics(period, branchId);

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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <SpinnerIcon size={32} className="text-primary animate-spin" />
            </div>
        );
    }

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

            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                <KpiCard icon={CurrencyCircleDollarIcon} label="Revenue" value={formatGHS(sales?.total_sales ?? 0)} accent />
                <KpiCard icon={ReceiptIcon} label="Orders" value={String(sales?.total_orders ?? orders?.total_orders ?? 0)} />
                <KpiCard icon={TrendUpIcon} label="Avg. Order" value={formatGHS(sales?.average_order_value ?? 0)} />
                <KpiCard icon={CheckCircleIcon} label="Fulfilment" value={`${fulfilmentPct}%`} />
                <KpiCard icon={XCircleIcon} label="Cancellations" value={`${cancelledPct}%`}
                    sub={(() => { const n = orders?.orders_by_status?.['cancelled'] ?? 0; return n > 0 ? `${n} order${n !== 1 ? 's' : ''} cancelled` : undefined; })()}
                />
                <KpiCard icon={CurrencyCircleDollarIcon} label="Avg Items/Order" value={String(sales?.avg_items_per_order ?? '—')} />
            </div>

            {/* Revenue chart + heatmap */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-3 mb-3">
                <RevenueChart salesByDay={sales?.sales_by_day} branchName={branchName} />
                <PeakHoursHeatmap ordersByHour={orders?.orders_by_hour} />
            </div>

            {/* Source + category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <OrderSourceChart orderSources={orderSources} />
                <CategoryRevenue categoryRevenue={categoryRevenue} />
            </div>

            {/* Top items + slow movers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <TopItemsCard items={topItems?.slice(0, 5)} title="Top 5 Items by Revenue" />
                <TopItemsCard items={bottomItems} title="Slow Movers" />
            </div>

            {/* Customer insights */}
            <CustomerInsights
                topCustomers={customers?.top_customers_by_orders ?? customers?.top_customers_by_spending}
                deliveryPickup={deliveryPickup}
                paymentMethods={paymentMethods}
            />
        </div>
    );
}
