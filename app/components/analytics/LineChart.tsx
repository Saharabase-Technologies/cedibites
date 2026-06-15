'use client';

import { useMemo, useState } from 'react';
import type { TrendBucket } from '@/lib/api/services/analytics.service';

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
    /** Controlled active-series key (for the toggle). */
    activeKey?: string;
    onActiveKeyChange?: (key: string) => void;
    /** Mark the strongest & weakest non-zero points of the active series. */
    highlightExtremes?: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Year-aware trend → points helper (root fix for repeated labels) ─────────────

/**
 * Convert a revenue-trend series into chart points with year-aware, non-repeating
 * x-axis labels. Month labels include the year only when the series spans more
 * than one calendar year (so you never see two bare "Jan"s).
 */
export function trendToPoints(
    series: Array<{ period: string; revenue: number; orders: number }>,
    bucket: TrendBucket,
): LinePoint[] {
    const yearsInRange = new Set(
        series.map(s => {
            if (bucket === 'week') return s.period.split('-W')[0];
            return s.period.split('-')[0];
        }),
    );
    const multiYear = yearsInRange.size > 1;

    return series.map(({ period, revenue, orders }) => {
        const aov = orders > 0 ? revenue / orders : 0;
        let label = period;
        let fullLabel = period;

        if (bucket === 'month') {
            const [y, m] = period.split('-');
            const name = MONTHS[parseInt(m, 10) - 1] ?? m;
            label = multiYear ? `${name} '${y.slice(2)}` : name;
            fullLabel = `${name} ${y}`;
        } else if (bucket === 'week') {
            const [y, w] = period.split('-W');
            label = multiYear ? `W${w} '${y.slice(2)}` : `W${w}`;
            fullLabel = `Week ${w}, ${y}`;
        } else {
            const d = new Date(period + 'T00:00:00');
            if (!Number.isNaN(d.getTime())) {
                label = d.toLocaleDateString('en-GH', { day: 'numeric', month: 'short' });
                fullLabel = d.toLocaleDateString('en-GH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
            }
        }

        return { label, fullLabel, values: { revenue, orders, aov } };
    });
}

// ─── Geometry ───────────────────────────────────────────────────────────────────

const VB_W = 1000;
const PAD = { top: 14, right: 10, bottom: 8, left: 10 };
const MAX_TICKS = 7;

// ─── Component ──────────────────────────────────────────────────────────────────

export default function LineChart({
    points,
    series,
    height = 240,
    activeKey,
    onActiveKeyChange,
    highlightExtremes = false,
}: LineChartProps) {
    const [internalKey, setInternalKey] = useState(series[0]?.key);
    const [hovered, setHovered] = useState<number | null>(null);

    const active = series.find(s => s.key === (activeKey ?? internalKey)) ?? series[0];
    const setActive = (k: string) => {
        if (onActiveKeyChange) onActiveKeyChange(k);
        else setInternalKey(k);
    };

    const n = points.length;
    const plotTop = PAD.top;
    const plotBottom = height - PAD.bottom;
    const plotH = plotBottom - plotTop;
    const plotLeft = PAD.left;
    const plotRight = VB_W - PAD.right;
    const plotW = plotRight - plotLeft;

    const vals = useMemo(() => points.map(p => p.values[active.key] ?? 0), [points, active.key]);
    const max = useMemo(() => Math.max(...vals, 1), [vals]);

    const xFor = (i: number) => (n <= 1 ? plotLeft + plotW / 2 : plotLeft + (i / (n - 1)) * plotW);
    const yFor = (v: number) => plotBottom - (v / max) * plotH;
    /** percentage helpers for the HTML overlay */
    const xPct = (i: number) => (n <= 1 ? 50 : (xFor(i) / VB_W) * 100);
    const yPct = (v: number) => (yFor(v) / height) * 100;

    const linePath = useMemo(() => {
        if (n === 0) return '';
        return vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(' ');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vals, n, max, height]);

    const areaPath = useMemo(() => {
        if (n === 0) return '';
        const line = vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(' ');
        return `${line} L${xFor(n - 1).toFixed(1)},${plotBottom} L${xFor(0).toFixed(1)},${plotBottom} Z`;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vals, n, max, height]);

    // Sub-sample x labels to avoid crowding/repetition.
    const tickStep = Math.max(1, Math.ceil(n / MAX_TICKS));
    const visibleTicks = points.map((_, i) => i).filter(i => i % tickStep === 0 || i === n - 1);

    // Best & worst non-zero points of the active series.
    const extremes = useMemo(() => {
        if (!highlightExtremes) return null;
        let maxI = -1, minI = -1;
        vals.forEach((v, i) => {
            if (v <= 0) return;
            if (maxI === -1 || v > vals[maxI]) maxI = i;
            if (minI === -1 || v < vals[minI]) minI = i;
        });
        return maxI === -1 ? null : { maxI, minI: minI === maxI ? -1 : minI };
    }, [vals, highlightExtremes]);

    if (n === 0) {
        return <div className="flex items-center justify-center text-neutral-gray text-sm font-body" style={{ height }}>No data in this period</div>;
    }

    return (
        <div>
            {/* Series toggle */}
            {series.length > 1 && (
                <div className="flex gap-1.5 mb-3 flex-wrap">
                    {series.map(s => {
                        const on = s.key === active.key;
                        return (
                            <button
                                key={s.key}
                                type="button"
                                onClick={() => setActive(s.key)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold font-body transition-all cursor-pointer ${
                                    on ? 'text-text-dark bg-neutral-light' : 'text-neutral-gray hover:text-text-dark'
                                }`}
                            >
                                <span className="w-2 h-2 rounded-full" style={{ background: on ? s.color : '#cdbfa9' }} />
                                {s.label}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="relative" style={{ height }}>
                <svg
                    viewBox={`0 0 ${VB_W} ${height}`}
                    preserveAspectRatio="none"
                    width="100%"
                    height={height}
                    className="block"
                >
                    <defs>
                        <linearGradient id={`lc-fill-${active.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={active.color} stopOpacity="0.18" />
                            <stop offset="100%" stopColor={active.color} stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d={areaPath} fill={`url(#lc-fill-${active.key})`} />
                    <path
                        d={linePath}
                        fill="none"
                        stroke={active.color}
                        strokeWidth={2.5}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                    />
                    {hovered !== null && (
                        <line
                            x1={xFor(hovered)} y1={plotTop - 6} x2={xFor(hovered)} y2={plotBottom}
                            stroke={active.color} strokeOpacity="0.35" strokeWidth={1} vectorEffect="non-scaling-stroke"
                        />
                    )}
                </svg>

                {/* HTML overlay: dots, markers, hover targets (no SVG-scaling distortion) */}
                <div className="absolute inset-0">
                    {/* Best / worst markers */}
                    {extremes && (
                        <>
                            <Marker x={xPct(extremes.maxI)} y={yPct(vals[extremes.maxI])} color="#6c833f" />
                            {extremes.minI >= 0 && <Marker x={xPct(extremes.minI)} y={yPct(vals[extremes.minI])} color="#d32f2f" />}
                        </>
                    )}

                    {/* Hovered dot */}
                    {hovered !== null && (
                        <span
                            className="absolute w-2.5 h-2.5 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 shadow"
                            style={{ left: `${xPct(hovered)}%`, top: `${yPct(vals[hovered])}%`, background: active.color }}
                        />
                    )}

                    {/* Tooltip */}
                    {hovered !== null && (
                        <div
                            className="absolute z-10 -translate-x-1/2 -translate-y-full bg-text-dark text-white rounded-lg px-2.5 py-1.5 text-[10px] font-body whitespace-nowrap shadow-lg pointer-events-none"
                            style={{ left: `${Math.min(92, Math.max(8, xPct(hovered)))}%`, top: `${Math.max(8, yPct(vals[hovered]) - 4)}%` }}
                        >
                            <p className="font-bold">{active.format(vals[hovered])}</p>
                            <p className="text-white/70">{points[hovered].fullLabel}</p>
                        </div>
                    )}

                    {/* Hover hit areas */}
                    <div className="absolute inset-0 flex">
                        {points.map((_, i) => (
                            <div
                                key={i}
                                className="flex-1 h-full"
                                onMouseEnter={() => setHovered(i)}
                                onMouseLeave={() => setHovered(null)}
                                onTouchStart={() => setHovered(i)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* X-axis labels */}
            <div className="relative mt-1.5 h-4">
                {visibleTicks.map(i => (
                    <span
                        key={i}
                        className="absolute text-[9px] text-neutral-gray font-body -translate-x-1/2 whitespace-nowrap"
                        style={{ left: `${Math.min(96, Math.max(4, xPct(i)))}%` }}
                    >
                        {points[i].label}
                    </span>
                ))}
            </div>
        </div>
    );
}

function Marker({ x, y, color }: { x: number; y: number; color: string }) {
    return (
        <span
            className="absolute w-2 h-2 rounded-full border border-white -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%`, background: color }}
        />
    );
}
