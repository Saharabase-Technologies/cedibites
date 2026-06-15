'use client';

import { useMemo } from 'react';
import { TrendUpIcon, ArrowUpIcon, ArrowDownIcon } from '@phosphor-icons/react';
import { formatPrice } from '@/types/order';
import type { RevenueTrend } from '@/lib/api/services/analytics.service';
import type { AnalyticsPeriod } from '@/lib/api/hooks/useAnalytics';
import LineChart, { trendToPoints, type LineSeries, type LinePoint } from './LineChart';

const SERIES: LineSeries[] = [
    { key: 'revenue', label: 'Revenue',     color: '#e49925', format: (v) => formatPrice(v) },
    { key: 'orders',  label: 'Orders',      color: '#6c833f', format: (v) => `${Math.round(v).toLocaleString('en-GH')} order${Math.round(v) !== 1 ? 's' : ''}` },
    { key: 'aov',     label: 'Avg. Order',  color: '#1976d2', format: (v) => formatPrice(v) },
    { key: 'ma',      label: 'Trend (avg)', color: '#8b7f70', format: (v) => formatPrice(v) },
];

const DEFAULT_ACTIVE = ['revenue', 'orders', 'aov'];

interface GrowthTrendCardProps {
    trend?: RevenueTrend;
    period?: AnalyticsPeriod;
    title?: string;
    height?: number;
}

/**
 * Growth-trajectory card. Overlays Revenue / Orders / Avg-Order-Value as three
 * toggleable lines (each normalised to its own scale so all are visible), with a
 * date-span caption, best/slowest-period callouts, and a bar view for very short
 * ranges. Shared by the partner dashboard & analytics, and platform admin.
 */
export default function GrowthTrendCard({ trend, period, title = 'Growth Trajectory', height = 240 }: GrowthTrendCardProps) {
    const series = trend?.series ?? [];
    const bucket = trend?.bucket ?? 'day';

    const points = useMemo(() => {
        const pts = trendToPoints(series, bucket, period);
        // Trailing moving-average of revenue → a smoothed "trend" line.
        const win = Math.max(3, Math.round(pts.length / 8));
        return pts.map((p, i): LinePoint => {
            const from = Math.max(0, i - win + 1);
            const slice = pts.slice(from, i + 1);
            const ma = slice.reduce((a, b) => a + b.values.revenue, 0) / slice.length;
            return { ...p, values: { ...p.values, ma } };
        });
    }, [series, bucket, period]);
    const total = useMemo(() => series.reduce((a, b) => a + b.revenue, 0), [series]);

    const spanCaption = useMemo(() => {
        if (points.length === 0) return '';
        if (points.length === 1) return points[0].fullLabel;
        return `${points[0].fullLabel} – ${points[points.length - 1].fullLabel}`;
    }, [points]);

    // Best / slowest non-zero revenue period (callout chips).
    const { best, worst } = useMemo(() => {
        const withRev = points.map((p, i) => ({ p, rev: p.values.revenue, i })).filter(x => x.rev > 0);
        if (withRev.length === 0) return { best: null, worst: null };
        const best = withRev.reduce((a, b) => (b.rev > a.rev ? b : a));
        const worst = withRev.reduce((a, b) => (b.rev < a.rev ? b : a));
        return { best, worst: worst.i === best.i ? null : worst };
    }, [points]);

    const isShort = points.length < 3;
    const maxRev = useMemo(() => Math.max(...points.map(p => p.values.revenue), 1), [points]);

    return (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4 gap-3">
                <div className="min-w-0">
                    <p className="text-text-dark text-sm font-bold font-body flex items-center gap-1.5">
                        <TrendUpIcon size={15} weight="fill" className="text-primary" />
                        {title}
                    </p>
                    {spanCaption && <p className="text-neutral-gray text-xs font-body mt-0.5 truncate">{spanCaption}</p>}
                </div>
                <div className="text-right shrink-0">
                    <p className="text-primary text-sm font-bold font-body">{formatPrice(total)}</p>
                    <p className="text-neutral-gray text-[10px] font-body">total revenue</p>
                </div>
            </div>

            {points.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-neutral-gray text-sm font-body">No revenue in this period</div>
            ) : isShort ? (
                <div className="flex items-end gap-4 justify-center" style={{ height }}>
                    {points.map((pt, i) => {
                        const h = Math.round((pt.values.revenue / maxRev) * (height - 56)) || 4;
                        return (
                            <div key={i} className="flex flex-col items-center gap-2">
                                <span className="text-sm font-bold font-body text-text-dark">{formatPrice(pt.values.revenue)}</span>
                                <div className="w-20 rounded-lg bg-primary/70" style={{ height: Math.max(h, 4) }} />
                                <span className="text-[11px] text-neutral-gray font-semibold font-body">{pt.label}</span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <LineChart points={points} series={SERIES} defaultActiveKeys={DEFAULT_ACTIVE} height={height} />
            )}

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
