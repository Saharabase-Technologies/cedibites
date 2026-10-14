'use client';

import { useCallback, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { pct } from '@/lib/finance/format';
import { ChartTip, useTipDismiss, type TipAt } from './ChartTip';
import { AXIS_TEXT, chartHeight } from './scale';
import { useChartWidth } from './useChartWidth';

/**
 * A ring cut into each part's share of the whole. The owner asked for it in
 * place of the review page's bars to 100, which were hard to read.
 *
 * Each slice carries its share and its name beside it, so nobody has to match
 * a colour to a legend. Slices are parted by a gap of the card's own colour.
 *
 * The chart is one stop for the Tab key. The left and right arrows walk the
 * slices.
 */

export interface DonutSlice {
  name: string;
  colour: string;
  value: number;
}

/** Room beside the ring for a name, and above and below it for two lines of text. */
const SIDE = 84;
const ENDS = 30;
const SMALLEST = 40;
/** How much of the radius is hole. */
const HOLE = 0.6;
/** A slice thinner than this has no room for a label. Its share is in the readout and the table. */
const LABEL_FROM = 0.04;
const LABEL_OUT = 12;
const LINE = 14;

export function DonutChart({
  label,
  slices,
  height: baseHeight = 240,
  tip,
}: {
  /** What the chart shows, for a screen reader. */
  label: string;
  /** In the order they are drawn, clockwise from the top. A part with nothing in it is left out. */
  slices: DonutSlice[];
  /** The height on a laptop. A narrow chart is drawn a little shorter. */
  height?: number;
  /** The readout for one slice, by its place in `slices`. */
  tip: (i: number) => ReactNode;
}) {
  const { ref, box, width } = useChartWidth<HTMLDivElement>();
  const [active, setActive] = useState<{ i: number; at: TipAt } | null>(null);
  const hide = useCallback(() => setActive(null), []);
  useTipDismiss(box, active !== null, hide);

  const total = slices.reduce((sum, s) => sum + (s.value > 0 ? s.value : 0), 0);

  /* The box is always there, so its width is known by the time there is something to draw. */
  if (!(total > 0)) {
    return (
      <div ref={ref} className="w-full min-w-0">
        <p className="py-8 text-center text-sm font-body text-neutral-gray">No paid orders match these filters.</p>
      </div>
    );
  }

  const height = chartHeight(width, baseHeight);
  const cx = width / 2, cy = height / 2;
  const outer = Math.max(SMALLEST, Math.min((width - 2 * SIDE) / 2, (height - 2 * ENDS) / 2));
  const inner = outer * HOLE;
  /** A point on a circle, with the angle measured clockwise from the top. */
  const point = (radius: number, angle: number): [number, number] => [cx + radius * Math.sin(angle), cy - radius * Math.cos(angle)];

  /* Where each slice starts, as a part of the whole turn. */
  const starts: number[] = [];
  slices.reduce((turned, slice) => { starts.push(turned); return turned + (slice.value > 0 ? slice.value / total : 0); }, 0);

  const parts = slices.map((slice, i) => ({ slice, i })).filter(p => p.slice.value > 0).map(({ slice, i }) => {
    const share = slice.value / total;
    const from = starts[i] * 2 * Math.PI;
    const to = (starts[i] + share) * 2 * Math.PI;
    const middle = (from + to) / 2;
    const [ox0, oy0] = point(outer, from), [ox1, oy1] = point(outer, to);
    const [ix0, iy0] = point(inner, from), [ix1, iy1] = point(inner, to);
    const large = to - from > Math.PI ? 1 : 0;
    const path = `M${ox0},${oy0}A${outer},${outer} 0 ${large} 1 ${ox1},${oy1}L${ix1},${iy1}A${inner},${inner} 0 ${large} 0 ${ix0},${iy0}Z`;
    const [lx, ly] = point(outer + LABEL_OUT, middle);
    const side = Math.sin(middle), up = Math.cos(middle);
    return {
      slice, i, share, path, lx,
      /* Two lines of text: above the ring at the top, below it at the foot, level with it at the sides. */
      ly: ly + (up > 0.5 ? -LINE : up < -0.5 ? LINE - 4 : 0),
      anchor: side > 0.25 ? 'start' as const : side < -0.25 ? 'end' as const : 'middle' as const,
    };
  });
  /* An arc cannot run a whole turn, so a lone slice is drawn as a ring. */
  const whole = parts.length === 1;

  const shown = active && parts.some(p => p.i === active.i) ? active : null;

  const over = (i: number) => (e: PointerEvent<SVGElement>) => setActive({ i, at: { x: e.clientX, y: e.clientY } });

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const svg = e.currentTarget.querySelector('svg');
      if (!svg) return;
      e.preventDefault();
      const forward = e.key === 'ArrowRight';
      const at = shown ? parts.findIndex(p => p.i === shown.i) : forward ? -1 : parts.length;
      const next = parts[(at + (forward ? 1 : -1) + parts.length) % parts.length];
      const box = svg.getBoundingClientRect();
      setActive({ i: next.i, at: { x: box.left + (next.lx / width) * box.width, y: box.top + (next.ly / height) * box.height } });
    } else if (e.key === 'Escape') hide();
  };

  return (
    <div
      ref={ref}
      role="group"
      aria-label={`${label}. The left and right arrow keys read each slice.`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onBlur={hide}
      className="relative w-full min-w-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brown"
      style={{ minHeight: width ? undefined : baseHeight }}
    >
      {width > 0 && (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          role="img"
          aria-label={label}
          className="block w-full h-auto overflow-visible touch-pan-y select-none font-body text-xs"
          onPointerLeave={e => { if (e.pointerType === 'mouse') hide(); }}
        >
          {parts.map(p => {
            const dimmed = shown && shown.i !== p.i ? 0.45 : undefined;
            return whole
              ? <circle key={p.i} cx={cx} cy={cy} r={(outer + inner) / 2} fill="none" stroke={p.slice.colour} strokeWidth={outer - inner} onPointerMove={over(p.i)} onPointerDown={over(p.i)} />
              : <path key={p.i} className="stroke-neutral-card" d={p.path} fill={p.slice.colour} fillOpacity={dimmed} strokeWidth={2} onPointerMove={over(p.i)} onPointerDown={over(p.i)} />;
          })}
          {parts.map(p => (p.share >= LABEL_FROM ? (
            <text key={p.i} x={p.lx} y={p.ly} textAnchor={p.anchor}>
              <tspan className="fill-text-dark font-semibold tabular-nums">{pct(p.share)}</tspan>
              <tspan x={p.lx} dy={LINE} fill={AXIS_TEXT}>{p.slice.name}</tspan>
            </text>
          ) : null))}
        </svg>
      )}
      <ChartTip at={shown ? shown.at : null}>{shown ? tip(shown.i) : null}</ChartTip>
    </div>
  );
}
