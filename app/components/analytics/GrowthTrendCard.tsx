'use client';

import { useMemo, useState } from 'react';
import { TrendUpIcon, ArrowUpIcon, ArrowDownIcon } from '@phosphor-icons/react';
import { formatPrice } from '@/types/order';
import type { RevenueTrend } from '@/lib/api/services/analytics.service';
import LineChart, { trendToPoints, type LineSeries } from './LineChart';

const SERIES: LineSeries[] = [
    { key: 'revenue', label: 'Revenue',   color: '#e49925', format: (v) => formatPrice(v) },
    { key: 'orders',  label: 'Orders',    color: '#6c833f', format: (v) => `${Math.round(v)} order${Math.round(v) !== 1 ? 's' : ''}` },
    { key: 'aov',     label: 'Avg. Order', color: '#c8a87a', format: (v) => formatPrice(v) },
];

interface GrowthTrendCardProps {
    trend?: RevenueTrend;
    title?: string;
    height?: number;
}

/**
 * Growth-trajectory card. Renders a line chart (Revenue / Orders / AOV toggle)
 * for multi-point ranges and a simple bar view for very short ranges, plus
 * best/slowest-period callouts. Shared by the partner dashboard & analytics.
 */
export default function GrowthTrendCard({ trend, title = 'Growth Trajectory', height = 240 }: GrowthTrendCardProps) {
    const [activeKey, setActiveKey] = useState('revenue');
    const series = trend?.series ?? [];
    const bucket = trend?.bucket ?? 'day';

    const points = useMemo(() => trendToPoints(series, bucket), [series, bucket]);
    const total = useMemo(() => series.reduce((a, b) => a + b.revenue, 0), [series]);

    // Best / slowest non-zero revenue period (for the callout chips).
    const { best, worst } = useMemo(() => {
        const withRev = points
            .map((p, i) => ({ p, rev: p.values.revenue, i }))
            .filter(x => x.rev > 0);
        if (withRev.length === 0) return { best: null, worst: null };
        const best = withRev.reduce((a, b) => (b.rev > a.rev ? b : a));
        const worst = withRev.reduce((a, b) => (b.rev < a.rev ? b : a));
        return { best, worst: worst.i === best.i ? null : worst };
    }, [points]);

    const isShort = points.length < 3;
    const maxRev = useMemo(() => Math.max(...points.map(p => p.values.revenue), 1), [points]);

    return (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <p className="text-text-dark text-sm font-bold font-body flex items-center gap-1.5">
                        <TrendUpIcon size={15} weight="fill" className="text-primary" />
                        {title}
                    </p>
                    <p className="text-neutral-gray text-xs font-body mt-0.5 capitalize">
                        {bucket}ly · {series.length} {series.length === 1 ? 'period' : 'periods'}
                    </p>
                </div>
                <p className="text-primary text-sm font-bold font-body">{formatPrice(total)}</p>
            </div>

            {points.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-neutral-gray text-sm font-body">No revenue in this period</div>
            ) : isShort ? (
                // Bar view for today / very short ranges.
                <div className="flex items-end gap-3 justify-center" style={{ height }}>
                    {points.map((pt, i) => {
                        const h = Math.round((pt.values.revenue / maxRev) * (height - 50)) || 4;
                        return (
                            <div key={i} className="flex flex-col items-center gap-2">
                                <span className="text-[11px] font-bold font-body text-text-dark">{formatPrice(pt.values.revenue)}</span>
                                <div className="w-16 rounded-lg bg-primary/70" style={{ height: Math.max(h, 4) }} />
                                <span className="text-[10px] text-neutral-gray font-body">{pt.label}</span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <LineChart
                    points={points}
                    series={SERIES}
                    activeKey={activeKey}
                    onActiveKeyChange={setActiveKey}
                    highlightExtremes
                    height={height}
                />
            )}

            {/* Best / slowest callout */}
            {best && (
                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-[#f0e8d8]">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/10 text-secondary text-[11px] font-semibold font-body">
                        <ArrowUpIcon size={12} weight="bold" />
                        Best: {best.p.fullLabel} · {formatPrice(best.rev)}
                    </span>
                    {worst && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-error/10 text-error text-[11px] font-semibold font-body">
                            <ArrowDownIcon size={12} weight="bold" />
                            Slowest: {worst.p.fullLabel} · {formatPrice(worst.rev)}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
