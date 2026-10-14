'use client';

import { useCallback, useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { ChartTip, useTipDismiss, type TipAt } from './ChartTip';
import { AXIS, AXIS_TEXT, GRID, chartHeight, labelStep, niceTicks, type Margin } from './scale';
import { useChartWidth } from './useChartWidth';

/**
 * The frame of a chart over named points: months, the days of a month, the
 * days of the week. It draws the axes, finds the point under the pointer and
 * shows its readout. `ColumnChart` and `CategoryLineChart` draw their marks
 * inside it.
 *
 * The chart is one stop for the Tab key. The left and right arrows walk the
 * points, and Enter opens one where the chart allows it.
 */

/** Where things sit, handed to whoever draws the marks. */
export interface BandGeometry {
  width: number;
  height: number;
  margin: Margin;
  innerHeight: number;
  /** The width of one category's slot. */
  band: number;
  /** The left edge of a category's slot. */
  left: (i: number) => number;
  /** How far down a value sits. */
  y: (value: number) => number;
  /** Where zero sits. */
  baseline: number;
  ticks: number[];
  /** Every `step`th category is labelled. */
  step: number;
}

export interface BandPlotProps {
  /** What the chart shows, for a screen reader. */
  label: string;
  categories: string[];
  /** The highest value the marks reach. */
  max: number;
  /** The height on a laptop. A narrow chart is drawn a little shorter. */
  height: number;
  margin: Margin;
  axisFormat: (value: number) => string;
  /** The least room a category label needs, in pixels. */
  minLabel?: number;
  /** Draws the zero line over the marks, for columns that stand on it. */
  baselineOnTop?: boolean;
  /** The readout for one category. */
  tip: (i: number) => ReactNode;
  /** Makes each category a thing to click. */
  onPick?: (i: number) => void;
  /** Draws the marks. */
  children: (geometry: BandGeometry) => ReactNode;
}

/** How far the hover band reaches above the plot, and how round its corners are. */
const BAND_LIFT = 6;

export function BandPlot({
  label,
  categories,
  max,
  height: baseHeight,
  margin,
  axisFormat,
  minLabel = 32,
  baselineOnTop,
  tip,
  onPick,
  children,
}: BandPlotProps) {
  const { ref, box, width } = useChartWidth<HTMLDivElement>();
  const [active, setActive] = useState<{ i: number; at: TipAt } | null>(null);
  const hide = useCallback(() => setActive(null), []);
  useTipDismiss(box, active !== null, hide);

  const n = categories.length;
  const geometry = useMemo<BandGeometry | null>(() => {
    if (!width || !n || !(max > 0)) return null;
    const height = chartHeight(width, baseHeight);
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const ticks = niceTicks(max);
    const top = ticks[ticks.length - 1];
    const band = innerWidth / n;
    const y = (value: number) => margin.top + innerHeight - (value / top) * innerHeight;
    return {
      width, height, margin, innerHeight, band, ticks,
      left: i => margin.left + i * band,
      y,
      baseline: y(0),
      step: labelStep(band, minLabel),
    };
  }, [width, n, max, baseHeight, margin, minLabel]);

  const marks = useMemo(() => (geometry ? children(geometry) : null), [children, geometry]);

  const g = geometry;
  const empty = !n || !(max > 0);
  /* A readout left open while the filters changed may point past the last category. */
  const shown = active && active.i < n && !empty ? active : null;
  /** A value's height, on the half pixel, so a one pixel rule stays crisp. */
  const line = (value: number) => (g ? Math.round(g.y(value)) + 0.5 : 0);

  /** The category under the pointer, or -1. */
  const bandAt = (e: MouseEvent<SVGSVGElement>): number => {
    if (!g) return -1;
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * g.width;
    const i = Math.floor((x - g.margin.left) / g.band);
    return i >= 0 && i < n ? i : -1;
  };
  const show = (e: MouseEvent<SVGSVGElement>) => {
    const i = bandAt(e);
    setActive(i < 0 ? null : { i, at: { x: e.clientX, y: e.clientY } });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!g) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const svg = e.currentTarget.querySelector('svg');
      if (!svg) return;
      e.preventDefault();
      const forward = e.key === 'ArrowRight';
      const from = shown ? shown.i : forward ? -1 : n;
      const i = Math.min(n - 1, Math.max(0, from + (forward ? 1 : -1)));
      const box = svg.getBoundingClientRect();
      setActive({
        i,
        at: { x: box.left + ((g.left(i) + g.band / 2) / g.width) * box.width, y: box.top + (g.margin.top / g.height) * box.height },
      });
    } else if ((e.key === 'Enter' || e.key === ' ') && shown && onPick) {
      e.preventDefault();
      hide();
      onPick(shown.i);
    } else if (e.key === 'Escape') hide();
  };

  /* The box is always there, so its width is known by the time there is something to draw. */
  if (empty) {
    return (
      <div ref={ref} className="w-full min-w-0">
        <p className="py-8 text-center text-sm font-body text-neutral-gray">No paid orders match these filters.</p>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="group"
      aria-label={`${label}. The left and right arrow keys read each point.`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onBlur={hide}
      className="relative w-full min-w-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brown"
      style={{ minHeight: g ? undefined : baseHeight }}
    >
      {g && (
        <svg
          viewBox={`0 0 ${g.width} ${g.height}`}
          width={g.width}
          height={g.height}
          role="img"
          aria-label={label}
          className={`block w-full h-auto overflow-visible touch-pan-y select-none font-body text-xs ${onPick ? 'cursor-pointer' : ''}`}
          onPointerMove={show}
          onPointerDown={e => { if (e.pointerType !== 'mouse') show(e); }}
          onPointerLeave={e => { if (e.pointerType === 'mouse') hide(); }}
          onClick={onPick ? e => { const i = bandAt(e); if (i >= 0) { hide(); onPick(i); } } : undefined}
        >
          {shown && (
            <rect
              className="fill-neutral-light"
              x={g.left(shown.i) + 1}
              y={g.margin.top - BAND_LIFT}
              width={Math.max(0, g.band - 2)}
              height={g.innerHeight + BAND_LIFT}
              rx={BAND_LIFT}
            />
          )}
          {g.ticks.map(value => (
            <g key={value}>
              {(value > 0 || !baselineOnTop) && (
                <line x1={g.margin.left} x2={g.width - g.margin.right} y1={line(value)} y2={line(value)} stroke={value > 0 ? GRID : AXIS} />
              )}
              <text className="tabular-nums" x={g.margin.left - 8} y={line(value) + 4} textAnchor="end" fill={AXIS_TEXT}>
                {axisFormat(value)}
              </text>
            </g>
          ))}
          {marks}
          {baselineOnTop && <line x1={g.margin.left} x2={g.width - g.margin.right} y1={line(0)} y2={line(0)} stroke={AXIS} />}
          {categories.map((category, i) => (i % g.step === 0 ? (
            <text key={i} x={g.left(i) + g.band / 2} y={g.height - 7} textAnchor="middle" fill={AXIS_TEXT}>{category}</text>
          ) : null))}
        </svg>
      )}
      <ChartTip at={shown ? shown.at : null}>{shown ? tip(shown.i) : null}</ChartTip>
    </div>
  );
}
