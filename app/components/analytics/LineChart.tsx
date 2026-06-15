'use client';

import { useMemo, useState } from 'react';
import type { TrendBucket } from '@/lib/api/services/analytics.service';
import type { AnalyticsPeriod } from '@/lib/api/hooks/useAnalytics';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface LinePoint {
    /** Short x-axis label (sub-sampled when crowded). */
    label: string;
    /** Full label for the tooltip. */
    fullLabel: string;
    /** One numeric value per series key. */
    values: Record<string, number>;
}

export interface LineSeries {
    key: string;
    label: string;
    color: string;
    format: (v: number) => string;
}

interface LineChartProps {
    points: LinePoint[];
    series: LineSeries[];
    height?: number;
    /** Which series start active (default: all). One must always stay on. */
    defaultActiveKeys?: string[];
    /**
     * When true, all series share one global y-scale (for like-for-like
     * comparison, e.g. revenue vs revenue). Default false: each series is
     * normalised to its own max (good for mixed metrics like ₵ vs counts).
     */
    sharedScale?: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Year-aware trend → points helper (root fix for repeated/unclear labels) ─────

/**
 * Convert a revenue-trend series into chart points with clear, period-aware
 * x-axis labels:
 *   • week / last week (≤8 daily points) → weekday names (Mon, Tue…)
 *   • a single calendar month            → day-of-month numbers (1, 2, 3…)
 *   • a multi-month daily range (30d)     → dated labels (16 May, 21 May…)
 *   • month buckets (90d / long ranges)   → month names (Apr, May…)
 */
export function trendToPoints(
    series: Array<{ period: string; revenue: number; orders: number }>,
    bucket: TrendBucket,
    period?: AnalyticsPeriod,
): LinePoint[] {
    const dayDates = bucket === 'day'
        ? series.map(s => new Date(s.period + 'T00:00:00'))
        : [];
    const sameMonth = bucket === 'day'
        && dayDates.length > 0
        && new Set(dayDates.map(d => `${d.getFullYear()}-${d.getMonth()}`)).size === 1;
    const weekdayStyle = bucket === 'day' && (period === 'week' || period === 'last_week' || series.length <= 8);

    const years = new Set(series.map(s => (bucket === 'week' ? s.period.split('-W')[0] : s.period.split('-')[0])));
    const multiYear = years.size > 1;

    return series.map(({ period: p, revenue, orders }, i) => {
        const aov = orders > 0 ? revenue / orders : 0;
        let label = p;
        let fullLabel = p;

        if (bucket === 'hour') {
            const [datePart, hourPart] = p.split('T');
            const h = parseInt(hourPart ?? '0', 10);
            const hr12 = h % 12 === 0 ? 12 : h % 12;
            const ampm = h < 12 ? 'AM' : 'PM';
            label = `${hr12} ${ampm}`;
            const d = new Date(datePart + 'T00:00:00');
            fullLabel = Number.isNaN(d.getTime()) ? label : `${hr12}:00 ${ampm} · ${d.getDate()} ${MONTHS[d.getMonth()]}`;
        } else if (bucket === 'month') {
            const [y, m] = p.split('-');
            const name = MONTHS[parseInt(m, 10) - 1] ?? m;
            label = multiYear ? `${name} '${y.slice(2)}` : name;
            fullLabel = `${name} ${y}`;
        } else if (bucket === 'week') {
            const d = new Date(p.split('-W')[0] + 'T00:00:00');
            label = Number.isNaN(d.getTime()) ? p : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
            fullLabel = `Week ${p.split('-W')[1] ?? ''}, ${p.split('-W')[0]}`;
        } else {
            const d = dayDates[i];
            if (!Number.isNaN(d.getTime())) {
                if (weekdayStyle) label = WEEKDAYS[d.getDay()];
                else if (sameMonth) label = String(d.getDate());
                else label = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
                fullLabel = `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
            }
        }

        return { label, fullLabel, values: { revenue, orders, aov } };
    });
}

// ─── Geometry ───────────────────────────────────────────────────────────────────

const VB_W = 1000;
const PAD = { top: 14, right: 12, bottom: 8, left: 12 };
const MAX_TICKS = 7;

// ─── Component ──────────────────────────────────────────────────────────────────

export default function LineChart({ points, series, height = 240, defaultActiveKeys, sharedScale = false }: LineChartProps) {
    const [active, setActive] = useState<Set<string>>(
        () => new Set(defaultActiveKeys ?? series.map(s => s.key)),
    );
    const [hovered, setHovered] = useState<number | null>(null);

    const activeSeries = series.filter(s => active.has(s.key));
    const single = activeSeries.length === 1;

    const toggle = (key: string) => {
        setActive(prev => {
            const next = new Set(prev);
            if (next.has(key)) { if (next.size > 1) next.delete(key); }
            else next.add(key);
            return next;
        });
    };

    const n = points.length;
    const plotTop = PAD.top;
    const plotBottom = height - PAD.bottom;
    const plotH = plotBottom - plotTop;
    const plotLeft = PAD.left;
    const plotW = VB_W - PAD.right - plotLeft;

    const xFor = (i: number) => (n <= 1 ? plotLeft + plotW / 2 : plotLeft + (i / (n - 1)) * plotW);
    const xPct = (i: number) => (n <= 1 ? 50 : (xFor(i) / VB_W) * 100);

    // Each series is normalised to its OWN max so all are visible together,
    // regardless of magnitude (₵ vs order counts). Tooltip shows real values.
    const maxByKey = useMemo(() => {
        const m: Record<string, number> = {};
        if (sharedScale) {
            const globalMax = Math.max(...series.flatMap(s => points.map(p => p.values[s.key] ?? 0)), 1);
            for (const s of series) m[s.key] = globalMax;
        } else {
            for (const s of series) m[s.key] = Math.max(...points.map(p => p.values[s.key] ?? 0), 1);
        }
        return m;
    }, [series, points, sharedScale]);

    const yFor = (key: string, v: number) => plotBottom - (v / maxByKey[key]) * plotH;
    const yPct = (key: string, v: number) => (yFor(key, v) / height) * 100;

    const pathFor = (key: string) =>
        points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(key, p.values[key] ?? 0).toFixed(1)}`).join(' ');

    const areaFor = (key: string) =>
        `${pathFor(key)} L${xFor(n - 1).toFixed(1)},${plotBottom} L${xFor(0).toFixed(1)},${plotBottom} Z`;

    const tickStep = Math.max(1, Math.ceil(n / MAX_TICKS));
    const visibleTicks = points.map((_, i) => i).filter(i => i % tickStep === 0 || i === n - 1);

    if (n === 0) {
        return <div className="flex items-center justify-center text-neutral-gray text-sm font-body" style={{ height }}>No data in this period</div>;
    }

    return (
        <div>
            {/* Series legend / toggles */}
            {series.length > 1 && (
                <div className="flex gap-1.5 mb-3 flex-wrap">
                    {series.map(s => {
                        const on = active.has(s.key);
                        return (
                            <button
                                key={s.key}
                                type="button"
                                onClick={() => toggle(s.key)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold font-body transition-all cursor-pointer border ${
                                    on ? 'bg-neutral-light border-[#f0e8d8] text-text-dark' : 'border-transparent text-neutral-gray/70 hover:text-neutral-gray'
                                }`}
                            >
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: on ? s.color : '#cdbfa9' }} />
                                {s.label}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="relative" style={{ height }}>
                <svg viewBox={`0 0 ${VB_W} ${height}`} preserveAspectRatio="none" width="100%" height={height} className="block">
                    <defs>
                        {activeSeries.map(s => (
                            <linearGradient key={s.key} id={`lc-fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={s.color} stopOpacity="0.16" />
                                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                            </linearGradient>
                        ))}
                    </defs>
                    {single && <path d={areaFor(activeSeries[0].key)} fill={`url(#lc-fill-${activeSeries[0].key})`} />}
                    {activeSeries.map(s => (
                        <path key={s.key} d={pathFor(s.key)} fill="none" stroke={s.color} strokeWidth={2.5}
                            strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    ))}
                    {hovered !== null && (
                        <line x1={xFor(hovered)} y1={plotTop - 6} x2={xFor(hovered)} y2={plotBottom}
                            stroke="#8b7f70" strokeOpacity="0.35" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                    )}
                </svg>

                {/* HTML overlay: dots, tooltip, hover targets (no SVG-scaling distortion) */}
                <div className="absolute inset-0">
                    {hovered !== null && activeSeries.map(s => (
                        <span key={s.key}
                            className="absolute w-2.5 h-2.5 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 shadow"
                            style={{ left: `${xPct(hovered)}%`, top: `${yPct(s.key, points[hovered].values[s.key] ?? 0)}%`, background: s.color }} />
                    ))}

                    {hovered !== null && (
                        <div
                            className="absolute z-10 -translate-x-1/2 -translate-y-full bg-text-dark text-white rounded-lg px-2.5 py-1.5 text-[10px] font-body whitespace-nowrap shadow-lg pointer-events-none"
                            style={{ left: `${Math.min(88, Math.max(12, xPct(hovered)))}%`, top: '34%' }}
                        >
                            <p className="font-bold mb-0.5">{points[hovered].fullLabel}</p>
                            {activeSeries.map(s => (
                                <p key={s.key} className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                                    <span className="text-white/70">{s.label}:</span>
                                    <span className="font-semibold">{s.format(points[hovered].values[s.key] ?? 0)}</span>
                                </p>
                            ))}
                        </div>
                    )}

                    <div className="absolute inset-0 flex">
                        {points.map((_, i) => (
                            <div key={i} className="flex-1 h-full"
                                onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} onTouchStart={() => setHovered(i)} />
                        ))}
                    </div>
                </div>
            </div>

            {/* X-axis labels */}
            <div className="relative mt-1.5 h-4">
                {visibleTicks.map(i => (
                    <span key={i} className="absolute text-[10px] text-neutral-gray font-body -translate-x-1/2 whitespace-nowrap"
                        style={{ left: `${Math.min(96, Math.max(4, xPct(i)))}%` }}>
                        {points[i].label}
                    </span>
                ))}
            </div>
        </div>
    );
}
