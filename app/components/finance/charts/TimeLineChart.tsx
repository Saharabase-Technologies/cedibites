'use client';

import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { DAY, monthStart, type Day } from '@/lib/finance/figures';
import { dayShort, monthShort } from '@/lib/finance/format';
import { ChartTip, useTipDismiss, type TipAt } from './ChartTip';
import { AXIS, AXIS_TEXT, CROSSHAIR, GRID, chartHeight, niceTicks, type Margin } from './scale';
import { useChartWidth } from './useChartWidth';

/**
 * Lines over days. Ported from the review page.
 *
 * A hairline follows the pointer and snaps to the nearest day, so a reader
 * aims at a date and never at a line. Dragging across the plot picks a span
 * of days to zoom into.
 *
 * The chart is one stop for the Tab key. The left and right arrows move the
 * hairline a day at a time.
 */

export interface TimeSeries {
  name: string;
  colour: string;
  /** In day order. A day with no point leaves the series out of that day's readout. */
  points: { day: Day; value: number }[];
}

const MARGIN: Margin = { left: 46, right: 12, top: 10, bottom: 26 };
const DOT = 4;
/** A drag shorter than this is a click. */
const DRAG_START = 8;
/** The least room between two labels on the day axis. */
const LABEL_GAP = 40;

export function TimeLineChart({
  label,
  series,
  from,
  to,
  months,
  height: baseHeight,
  axisFormat,
  tip,
  onZoom,
}: {
  /** What the chart shows, for a screen reader. */
  label: string;
  series: TimeSeries[];
  /** The first and last day on the axis. */
  from: Day;
  to: Day;
  /** The book's months, for the axis labels of a long span. */
  months: string[];
  /** The height on a laptop. A narrow chart is drawn a little shorter. */
  height: number;
  axisFormat: (value: number) => string;
  /** The readout for one day. */
  tip: (day: Day) => ReactNode;
  /** Called with the first and last day of a span dragged across the plot. */
  onZoom?: (from: Day, to: Day) => void;
}) {
  const { ref, box, width } = useChartWidth<HTMLDivElement>();
  const [hover, setHover] = useState<{ day: Day; at: TipAt } | null>(null);
  const [selection, setSelection] = useState<[number, number] | null>(null);
  const drag = useRef<{ x0: number; moved: boolean } | null>(null);
  const hide = useCallback(() => setHover(null), []);
  useTipDismiss(box, hover !== null, hide);

  let max = 0;
  for (const s of series) for (const p of s.points) max = Math.max(max, p.value);
  const empty = !(max > 0);

  const valueOn = useMemo(() => series.map(s => new Map(s.points.map(p => [p.day, p.value]))), [series]);

  const g = useMemo(() => {
    if (!width || empty) return null;
    const height = chartHeight(width, baseHeight);
    const innerWidth = width - MARGIN.left - MARGIN.right;
    const innerHeight = height - MARGIN.top - MARGIN.bottom;
    const ticks = niceTicks(max);
    const top = ticks[ticks.length - 1];
    const y = (value: number) => MARGIN.top + innerHeight - (value / top) * innerHeight;
    const x = (day: Day) => MARGIN.left + (to === from ? innerWidth / 2 : ((day - from) / (to - from)) * innerWidth);
    /** The day nearest a point across the plot. */
    const dayAt = (px: number): Day => {
      const within = Math.min(Math.max(px, MARGIN.left), MARGIN.left + innerWidth) - MARGIN.left;
      return from + Math.round((within / innerWidth) * ((to - from) / DAY)) * DAY;
    };
    return { width, height, innerWidth, innerHeight, ticks, x, y, dayAt, baseline: y(0) };
  }, [width, empty, baseHeight, max, from, to]);

  /* Everything that does not move with the pointer, drawn once for each set of figures. */
  const plot = useMemo(() => {
    if (!g) return null;
    const line = (value: number) => Math.round(g.y(value)) + 0.5;
    const days = (to - from) / DAY;
    /* A long span is labelled by the month. A short one by the day, every week, every third day or every day. */
    const wanted: [Day, string][] = [];
    if (days > 45) {
      for (const m of months) { const t = monthStart(m); if (t >= from && t <= to) wanted.push([t, monthShort(m)]); }
    } else {
      const every = days > 20 ? 7 : days > 9 ? 3 : 1;
      for (let t = from; t <= to; t += every * DAY) wanted.push([t, dayShort(t)]);
    }
    /* A label that would touch the one before it, or run off the end, is left out. */
    const labels: { day: Day; text: string; x: number }[] = [];
    for (const [day, text] of wanted) {
      const x = g.x(day);
      const last = labels.length ? labels[labels.length - 1].x : -Infinity;
      if (x - last >= LABEL_GAP && x <= g.width - MARGIN.right - 10) labels.push({ day, text, x });
    }
    return (
      <>
        {g.ticks.map(value => (
          <g key={value}>
            <line x1={MARGIN.left} x2={g.width - MARGIN.right} y1={line(value)} y2={line(value)} stroke={value > 0 ? GRID : AXIS} />
            <text className="tabular-nums" x={MARGIN.left - 8} y={line(value) + 4} textAnchor="end" fill={AXIS_TEXT}>{axisFormat(value)}</text>
          </g>
        ))}
        {labels.map(({ day, text, x }) => (
          <g key={day}>
            <line x1={x} x2={x} y1={g.baseline} y2={g.baseline + 4} stroke={AXIS} />
            <text x={x} y={g.height - 7} textAnchor={x < MARGIN.left + 14 ? 'start' : 'middle'} fill={AXIS_TEXT}>{text}</text>
          </g>
        ))}
        {series.map(s => {
          if (!s.points.length) return null;
          const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${g.x(p.day).toFixed(1)},${g.y(p.value).toFixed(1)}`).join('');
          const end = s.points[s.points.length - 1];
          return (
            <g key={s.name}>
              <path d={d} fill="none" stroke={s.colour} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              <circle className="stroke-neutral-card" cx={g.x(end.day)} cy={g.y(end.value)} r={DOT} fill={s.colour} strokeWidth={2} />
            </g>
          );
        })}
      </>
    );
  }, [g, series, months, from, to, axisFormat]);

  /* The box is always there, so its width is known by the time there is something to draw. */
  if (empty) {
    return (
      <div ref={ref} className="w-full min-w-0">
        <p className="py-8 text-center text-sm font-body text-neutral-gray">No paid orders match these filters.</p>
      </div>
    );
  }

  /* A readout left open while the dates changed may point outside them. */
  const shown = hover && hover.day >= from && hover.day <= to ? hover : null;

  const across = (e: PointerEvent<SVGSVGElement>): number => {
    const box = e.currentTarget.getBoundingClientRect();
    return g ? ((e.clientX - box.left) / box.width) * g.width : 0;
  };
  const show = (e: PointerEvent<SVGSVGElement>, px: number) => {
    if (g) setHover({ day: g.dayAt(px), at: { x: e.clientX, y: e.clientY } });
  };
  const endDrag = () => { drag.current = null; setSelection(null); };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!g) return;
    const px = across(e);
    if (px < MARGIN.left || px > MARGIN.left + g.innerWidth) return;
    if (onZoom) {
      drag.current = { x0: px, moved: false };
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* A pointer that is already gone cannot be held. */ }
    }
    if (e.pointerType !== 'mouse') show(e, px);
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!g) return;
    const px = across(e);
    const d = drag.current;
    if (d) {
      if (Math.abs(px - d.x0) > DRAG_START) d.moved = true;
      if (d.moved) {
        setSelection([Math.max(MARGIN.left, Math.min(d.x0, px)), Math.min(MARGIN.left + g.innerWidth, Math.max(d.x0, px))]);
        hide();
        return;
      }
    }
    if (px < MARGIN.left - 4 || px > g.width - MARGIN.right + 4) return hide();
    show(e, px);
  };
  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    endDrag();
    if (!g || !d || !d.moved || !onZoom) return;
    const px = across(e);
    const a = g.dayAt(Math.min(d.x0, px)), b = g.dayAt(Math.max(d.x0, px));
    /* A span of under three days is a slip of the hand, not a zoom. */
    if (b - a >= 2 * DAY) onZoom(a, b);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!g) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const svg = e.currentTarget.querySelector('svg');
      if (!svg) return;
      e.preventDefault();
      const forward = e.key === 'ArrowRight';
      const start = shown ? shown.day : forward ? from - DAY : to + DAY;
      const day = Math.min(to, Math.max(from, start + (forward ? DAY : -DAY)));
      const box = svg.getBoundingClientRect();
      setHover({ day, at: { x: box.left + (g.x(day) / g.width) * box.width, y: box.top + (MARGIN.top / g.height) * box.height } });
    } else if (e.key === 'Escape') hide();
  };

  return (
    <div
      ref={ref}
      role="group"
      aria-label={`${label}. The left and right arrow keys read each day.`}
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
          className={`block w-full h-auto overflow-visible touch-pan-y select-none font-body text-xs ${onZoom ? 'cursor-crosshair' : ''}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={endDrag}
          onPointerLeave={e => { if (e.pointerType === 'mouse' && !drag.current) hide(); }}
        >
          {plot}
          {selection && (
            <rect className="fill-primary/15 stroke-primary" x={selection[0]} y={MARGIN.top} width={selection[1] - selection[0]} height={g.innerHeight} />
          )}
          {shown && (
            <>
              <line x1={g.x(shown.day)} x2={g.x(shown.day)} y1={MARGIN.top} y2={g.baseline} stroke={CROSSHAIR} />
              {series.map((s, j) => {
                const value = valueOn[j].get(shown.day);
                return value == null ? null : (
                  <circle key={s.name} className="stroke-neutral-card" cx={g.x(shown.day)} cy={g.y(value)} r={DOT + 0.5} fill={s.colour} strokeWidth={2} />
                );
              })}
            </>
          )}
        </svg>
      )}
      <ChartTip at={shown ? shown.at : null}>{shown ? tip(shown.day) : null}</ChartTip>
    </div>
  );
}
