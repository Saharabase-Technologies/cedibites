'use client';

import { useCallback, type ReactNode } from 'react';
import { BandPlot, type BandGeometry } from './BandPlot';
import { columnPath, type BandSeries, type Margin } from './scale';

/**
 * Columns over named points, side by side or stacked. Ported from the review
 * page.
 *
 * A column is never wider than 24 units. Columns that touch are parted by a
 * gap of the card's own colour, never by an outline.
 */

const GROUPED: Margin = { left: 46, right: 6, top: 10, bottom: 26 };
/** Stacked columns carry their total on top, which needs the room. */
const STACKED: Margin = { left: 46, right: 6, top: 22, bottom: 26 };

const GAP = 2;
const RADIUS = 4;
const MAX_GROUPED = 24;
const MAX_STACKED = 28;

const drawn = (value: number | null): number => (value != null && value > 0 ? value : 0);

export function ColumnChart({
  label,
  categories,
  series,
  mode = 'grouped',
  height,
  axisFormat,
  totalFormat,
  minLabel,
  tip,
  onPick,
}: {
  /** What the chart shows, for a screen reader. */
  label: string;
  categories: string[];
  series: BandSeries[];
  mode?: 'grouped' | 'stacked';
  height: number;
  axisFormat: (value: number) => string;
  /** Writes the total over each stacked column. Left out, no total is written. */
  totalFormat?: (value: number) => string;
  minLabel?: number;
  tip: (i: number) => ReactNode;
  onPick?: (i: number) => void;
}) {
  const stacked = mode === 'stacked';

  let max = 0;
  categories.forEach((_, i) => {
    if (stacked) max = Math.max(max, series.reduce((sum, s) => sum + drawn(s.values[i]), 0));
    else for (const s of series) max = Math.max(max, drawn(s.values[i]));
  });

  const marks = useCallback((g: BandGeometry) => {
    const out: ReactNode[] = [];
    if (stacked) {
      const width = Math.min(MAX_STACKED, g.band * 0.6);
      categories.forEach((_, i) => {
        const x = g.left(i) + (g.band - width) / 2;
        const parts = series.filter(s => drawn(s.values[i]) > 0);
        let sum = 0;
        parts.forEach((s, at) => {
          const value = drawn(s.values[i]);
          const last = at === parts.length - 1;
          /* Half the gap comes off each side of a join, so the gap is the same width up the stack. */
          const foot = g.y(sum) - (at ? GAP / 2 : 0);
          const head = g.y(sum + value) + (last ? 0 : GAP / 2);
          const opacity = s.faded?.[i] ? 0.45 : undefined;
          if (foot - head > 0) {
            out.push(last
              ? <path key={`${i}-${s.name}`} d={columnPath(x, foot, width, foot - head, RADIUS)} fill={s.colour} fillOpacity={opacity} />
              : <rect key={`${i}-${s.name}`} x={x} y={head} width={width} height={foot - head} fill={s.colour} fillOpacity={opacity} />);
          }
          sum += value;
        });
        if (totalFormat && sum > 0 && i % g.step === 0) {
          out.push(
            <text key={`${i}-total`} className="fill-text-dark font-semibold tabular-nums" x={x + width / 2} y={g.y(sum) - 7} textAnchor="middle">
              {totalFormat(sum)}
            </text>,
          );
        }
      });
      return out;
    }

    const k = series.length;
    const width = Math.max(2, Math.min(MAX_GROUPED, (g.band * 0.8 - (k - 1) * GAP) / k));
    const group = k * width + (k - 1) * GAP;
    categories.forEach((_, i) => {
      const x0 = g.left(i) + (g.band - group) / 2;
      series.forEach((s, j) => {
        const value = drawn(s.values[i]);
        if (!value) return;
        out.push(
          <path
            key={`${i}-${s.name}`}
            d={columnPath(x0 + j * (width + GAP), g.baseline, width, g.baseline - g.y(value), Math.min(RADIUS, width / 2))}
            fill={s.colours ? s.colours[i] : s.colour}
            fillOpacity={s.faded?.[i] ? 0.42 : undefined}
          />,
        );
      });
    });
    return out;
  }, [categories, series, stacked, totalFormat]);

  return (
    <BandPlot
      label={label}
      categories={categories}
      max={max}
      height={height}
      margin={stacked ? STACKED : GROUPED}
      axisFormat={axisFormat}
      minLabel={minLabel}
      baselineOnTop
      tip={tip}
      onPick={onPick}
    >
      {marks}
    </BandPlot>
  );
}
