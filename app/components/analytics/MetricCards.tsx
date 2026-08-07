'use client';

import { useMemo } from 'react';
import { ChartPieIcon, CheckCircleIcon, UsersThreeIcon, CalendarBlankIcon } from '@phosphor-icons/react';
import { formatPrice } from '@/types/order';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';
import type { RepeatCustomerMetrics, WeekdayHourCell } from '@/lib/api/services/analytics.service';

function Card({ title, sub, icon: Icon, children }: { title: string; sub?: string; icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5">
            <div className="mb-4">
                <p className="text-text-dark text-sm font-bold font-body flex items-center gap-1.5">
                    <Icon size={15} weight="fill" className="text-primary" />
                    {title}
                </p>
                {sub && <p className="text-neutral-gray text-xs font-body mt-0.5">{sub}</p>}
            </div>
            {children}
        </div>
    );
}

// ─── Revenue concentration ────────────────────────────────────────────────────

export function RevenueConcentrationCard({ items, totalRevenue }: {
    items?: Array<{ name: string; size_label?: string; rev: number }>;
    totalRevenue?: number;
}) {
    const list = items ?? [];
    const total = totalRevenue && totalRevenue > 0 ? totalRevenue : list.reduce((a, b) => a + b.rev, 0);
    const top5 = list.slice(0, 5);
    const top5Rev = top5.reduce((a, b) => a + b.rev, 0);
    const top5Pct = total > 0 ? Math.round((top5Rev / total) * 100) : 0;
    const topItemPct = total > 0 && list[0] ? Math.round((list[0].rev / total) * 100) : 0;

    return (
        <Card title="Revenue Concentration" sub="How dependent the business is on a few items" icon={ChartPieIcon}>
            {total === 0 ? (
                <div className="flex items-center justify-center h-24 text-neutral-gray text-sm">No revenue data available</div>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3">
                            <p className="text-2xl font-bold font-body text-primary leading-none">{top5Pct}%</p>
                            <p className="text-neutral-gray text-[11px] font-body mt-1">from top 5 items</p>
                        </div>
                        <div className="rounded-xl bg-neutral-light border border-[#f0e8d8] px-4 py-3">
                            <p className="text-2xl font-bold font-body text-text-dark leading-none">{topItemPct}%</p>
                            <p className="text-neutral-gray text-[11px] font-body mt-1">from the #1 item</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        {top5.map((it, i) => {
                            const pct = total > 0 ? (it.rev / total) * 100 : 0;
                            return (
                                <div key={it.name + (it.size_label ?? '') + i}>
                                    <div className="flex justify-between text-xs font-body mb-1">
                                        <span className="text-text-dark truncate pr-2">{i + 1}. {getOrderItemLineLabel({ name: it.name, sizeLabel: it.size_label })}</span>
                                        <span className="text-neutral-gray shrink-0">{formatPrice(it.rev)} · {Math.round(pct)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-neutral-gray/15 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: i === 0 ? '#e49925' : '#c8a87a' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </Card>
    );
}

// ─── Fulfilment outcomes ──────────────────────────────────────────────────────

export function FulfilmentFunnelCard({ ordersByStatus, totalOrders }: {
    ordersByStatus?: Record<string, number>;
    totalOrders?: number;
}) {
    const s = ordersByStatus ?? {};
    const completed = (s['completed'] ?? 0) + (s['delivered'] ?? 0);
    const cancelled = s['cancelled'] ?? 0;
    const active = Object.entries(s)
        .filter(([k]) => !['completed', 'delivered', 'cancelled'].includes(k))
        .reduce((a, [, v]) => a + v, 0);
    const total = totalOrders ?? (completed + cancelled + active);
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const rows = [
        { label: 'Completed', value: completed, color: '#6c833f' },
        { label: 'In progress', value: active, color: '#e49925' },
        { label: 'Cancelled', value: cancelled, color: '#d32f2f' },
    ];

    return (
        <Card title="Order Outcomes" sub="Where orders end up in this period" icon={CheckCircleIcon}>
            {total === 0 ? (
                <div className="flex items-center justify-center h-24 text-neutral-gray text-sm">No order data available</div>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold font-body text-secondary leading-none">{completionRate}%</span>
                        <span className="text-neutral-gray text-xs font-body">completion rate</span>
                    </div>
                    <div className="flex h-3 rounded-full overflow-hidden bg-neutral-gray/15">
                        {rows.map(r => r.value > 0 && (
                            <div key={r.label} style={{ width: `${pct(r.value)}%`, background: r.color }} />
                        ))}
                    </div>
                    <div className="flex flex-col gap-2">
                        {rows.map(r => (
                            <div key={r.label} className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-xs font-body text-text-dark">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} /> {r.label}
                                </span>
                                <span className="text-xs font-body text-neutral-gray">{r.value.toLocaleString('en-GH')} · {pct(r.value)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
}

// ─── Repeat customers ─────────────────────────────────────────────────────────

export function RepeatCustomersCard({ data }: { data?: RepeatCustomerMetrics }) {
    const active = data?.active_customers ?? 0;
    const repeat = data?.repeat_customers ?? 0;
    const fresh = data?.new_customers ?? 0;
    const repeatRate = data?.repeat_rate ?? 0;
    const cadence = data?.avg_days_between_orders;
    const repeatPct = active > 0 ? Math.round((repeat / active) * 100) : 0;
    const newPct = active > 0 ? 100 - repeatPct : 0;

    return (
        <Card title="Customer Loyalty" sub="New vs returning customers in this period" icon={UsersThreeIcon}>
            {active === 0 ? (
                <div className="flex items-center justify-center h-24 text-neutral-gray text-sm">No customer activity yet</div>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-secondary/5 border border-secondary/15 px-4 py-3">
                            <p className="text-2xl font-bold font-body text-secondary leading-none">{repeatRate}%</p>
                            <p className="text-neutral-gray text-[11px] font-body mt-1">repeat rate</p>
                        </div>
                        <div className="rounded-xl bg-neutral-light border border-[#f0e8d8] px-4 py-3">
                            <p className="text-2xl font-bold font-body text-text-dark leading-none">{cadence != null ? `${cadence}d` : '—'}</p>
                            <p className="text-neutral-gray text-[11px] font-body mt-1">avg. between orders</p>
                        </div>
                    </div>
                    <div className="flex h-3 rounded-full overflow-hidden bg-neutral-gray/15">
                        <div style={{ width: `${repeatPct}%`, background: '#6c833f' }} />
                        <div style={{ width: `${newPct}%`, background: '#e49925' }} />
                    </div>
                    <div className="flex justify-between text-xs font-body">
                        <span className="flex items-center gap-1.5 text-text-dark"><span className="w-2.5 h-2.5 rounded-full bg-secondary" /> Returning {repeat}</span>
                        <span className="flex items-center gap-1.5 text-text-dark"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> New {fresh}</span>
                    </div>
                </div>
            )}
        </Card>
    );
}

// ─── Weekday × hour heatmap ───────────────────────────────────────────────────

const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeekdayHourHeatmap({ cells }: { cells?: WeekdayHourCell[] }) {
    const { hours, matrix, max } = useMemo(() => {
        const list = cells ?? [];
        if (list.length === 0) return { hours: [] as number[], matrix: [] as number[][], max: 0 };
        const minH = Math.min(...list.map(c => c.hour));
        const maxH = Math.max(...list.map(c => c.hour));
        const hrs: number[] = [];
        for (let h = minH; h <= maxH; h++) hrs.push(h);
        const m = Array.from({ length: 7 }, () => Array(hrs.length).fill(0) as number[]);
        let mx = 0;
        for (const c of list) {
            const hi = c.hour - minH;
            if (c.dow >= 0 && c.dow < 7 && hi >= 0 && hi < hrs.length) {
                m[c.dow][hi] += c.count;
                if (m[c.dow][hi] > mx) mx = m[c.dow][hi];
            }
        }
        return { hours: hrs, matrix: m, max: mx };
    }, [cells]);

    function bg(v: number) {
        if (max === 0 || v === 0) return '#f6efe2';
        const i = v / max;
        if (i < 0.20) return '#fbe1b0';
        if (i < 0.40) return '#f4c074';
        if (i < 0.60) return '#ec9f3c';
        if (i < 0.80) return '#dd8214';
        return '#b96807';
    }

    return (
        <Card title="Busiest Times" sub="Orders by weekday & hour — darker = busier" icon={CalendarBlankIcon}>
            {hours.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-neutral-gray text-sm">No order timing data available</div>
            ) : (
                <div className="overflow-x-auto">
                    <div className="min-w-[420px]">
                        <div className="flex gap-1 mb-1 pl-9">
                            {hours.map(h => (
                                <div key={h} className="flex-1 text-center text-[8px] text-neutral-gray font-body">{h}</div>
                            ))}
                        </div>
                        {WD.map((day, di) => (
                            <div key={day} className="flex gap-1 items-center mb-1">
                                <span className="w-8 text-[9px] text-neutral-gray font-semibold font-body shrink-0">{day}</span>
                                {hours.map((h, hi) => {
                                    const v = matrix[di][hi];
                                    return (
                                        <div key={h} className="flex-1 rounded-sm flex items-center justify-center" style={{ height: 22, background: bg(v) }} title={`${day} ${h}:00 · ${v} orders`}>
                                            {v > 0 && <span className="text-[8px] font-bold font-body" style={{ color: v / max > 0.6 ? '#fff' : '#5c3d00' }}>{v}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
}
