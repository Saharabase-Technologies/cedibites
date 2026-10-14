'use client';

import { useCallback, type ReactNode } from 'react';
import { BandPlot, type BandGeometry } from './BandPlot';
import type { BandSeries, Margin } from './scale';

/**
 * Lines over named points: months, the days of one month, or a branch's
 * first, second and third month. Ported from the review page.
 *
 * A hollow dot marks a part month. A null value breaks the line, for a branch
 * that was not open yet.
 */

const MARGIN: Margin = { left: 46, right: 14, top: 12, bottom: 26 };
const DOT = 4;

export function CategoryLineChart({
  label,
  categories,
  series,
  height,
  axisFormat,
  minLabel = 40,
  tip,
  onPick,
}: {
  /** What the chart shows, for a screen reader. */
  label: string;
  categories: string[];
  series: BandSeries[];
  height: number;
  axisFormat: (value: number) => string;
  minLabel?: number;
  tip: (i: number) => ReactNode;
  onPick?: (i: number) => void;
}) {
  let max = 0;
  for (const s of series) for (const value of s.values) if (value != null) max = Math.max(max, value);

  const marks = useCallback((g: BandGeometry) => series.map(s => {
    const x = (i: number) => g.left(i) + g.band / 2;
    let d = '', pen = false;
    s.values.forEach((value, i) => {
      if (value == null) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${g.y(value).toFixed(1)}`;
      pen = true;
    });
    return (
      <g key={s.name}>
        <path d={d} fill="none" stroke={s.colour} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {s.values.map((value, i) => {
          if (value == null) return null;
          /* The ring in the card's colour keeps a dot whole where it crosses another line. */
          return s.hollow?.[i]
            ? <circle key={i} className="fill-neutral-card" cx={x(i)} cy={g.y(value)} r={DOT} stroke={s.colour} strokeWidth={2} />
            : <circle key={i} className="stroke-neutral-card" cx={x(i)} cy={g.y(value)} r={DOT} fill={s.colour} strokeWidth={2} />;
        })}
      </g>
    );
  }), [series]);

  return (
    <BandPlot
      label={label}
      categories={categories}
      max={max}
      height={height}
      margin={MARGIN}
      axisFormat={axisFormat}
      minLabel={minLabel}
      tip={tip}
      onPick={onPick}
    >
      {marks}
    </BandPlot>
  );
}
