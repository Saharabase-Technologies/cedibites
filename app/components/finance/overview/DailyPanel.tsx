'use client';

import { useMemo, useState } from 'react';
import { SegmentedTabs } from '@/app/inventory/_components';
import { ChartLegend, TimeLineChart, TipHead, TipNote, TipRow, TipRows, TipTitle, type TimeSeries } from '../charts';
import { DAY, dailySeries, type DailyPoint, type Day } from '@/lib/finance/figures';
import { compact, ghs, rangeText, weekdayDate } from '@/lib/finance/format';
import { ChartPanel, ControlGroup, useChartFilter } from '../ChartPanel';
import { useFinance } from '../FinanceProvider';

/**
 * Daily sales: the seven day average or each day, over the last 7, 30 or 90
 * days or all of them. Drag across to zoom. Ported from the review page's
 * `drawDaily`.
 */

type Line = 'average' | 'day';

const LINES: { value: Line; label: string }[] = [
  { value: 'average', label: '7 day average' },
  { value: 'day', label: 'Each day' },
];

const PERIODS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: 'all', label: 'All' },
];

export function DailyPanel() {
  const { book, colours } = useFinance();
  const filter = useChartFilter();
  const res = filter.figures;
  const [line, setLine] = useState<Line>('average');
  const [period, setPeriod] = useState('all');
  const [zoom, setZoom] = useState<[Day, Day] | null>(null);

  /* A zoom the filters have narrowed to less than a day is let go. */
  const zoomFrom = zoom ? Math.max(res.start, zoom[0]) : 0;
  const zoomTo = zoom ? Math.min(res.end, zoom[1]) : 0;
  const zoomed = zoom != null && zoomTo - zoomFrom >= DAY;
  const from = zoomed ? zoomFrom : period === 'all' ? res.start : Math.max(res.start, res.end - (Number(period) - 1) * DAY);
  const to = zoomed ? zoomTo : res.end;

  const byBranch = useMemo(
    () => res.branches.map(b => ({ branch: b, points: dailySeries(book, res, b) })),
    [book, res],
  );

  const shown = byBranch.map(({ branch, points }) => ({
    branch,
    days: new Map<Day, DailyPoint>(points.filter(p => p.day >= from && p.day <= to).map(p => [p.day, p])),
  }));

  /* The chart wants a value at every point: today has no seven day average yet, so it is left off that line. */
  const series: TimeSeries[] = shown.map(({ branch, days }) => ({
    name: branch.name,
    colour: colours[branch.id],
    points: [...days.values()].flatMap(p => {
      const value = line === 'average' ? p.average : p.net;
      return value == null ? [] : [{ day: p.day, value }];
    }),
  }));

  const tip = (day: Day) => {
    const today = shown.some(s => s.days.get(day)?.part);
    return (
      <>
        <TipTitle>{weekdayDate(day)}</TipTitle>
        <TipRows>
          <TipHead value="That day" extra="7 day avg" />
          {shown.map(({ branch, days }) => {
            const p = days.get(day);
            return p
              ? <TipRow key={branch.id} colour={colours[branch.id]} name={branch.name} value={ghs(p.net)} extra={p.average == null ? null : compact(p.average)} />
              : <TipRow key={branch.id} colour={colours[branch.id]} name={branch.name} value="Not open" />;
          })}
        </TipRows>
        {today && <TipNote>Today is not over yet.</TipNote>}
      </>
    );
  };

  const title = line === 'average' ? 'Seven day average of net sales' : 'Net sales each day';

  return (
    <ChartPanel
      title={title}
      sub={`${rangeText(from, to)}. Drag across the chart to zoom in.`}
      filter={filter}
      controls={(
        <>
          <ControlGroup caption="Show">
            <SegmentedTabs options={LINES} value={line} onChange={setLine} />
          </ControlGroup>
          <ControlGroup caption="Period">
            <SegmentedTabs
              options={PERIODS}
              value={zoomed ? '' : period}
              onChange={v => { setZoom(null); setPeriod(v); }}
            />
            {(zoomed || period !== 'all') && (
              <button
                type="button"
                onClick={() => { setZoom(null); setPeriod('all'); }}
                className="min-h-11 px-3.5 rounded-xl border border-[#e3ddd0] bg-neutral-card text-sm font-medium font-body text-text-dark hover:border-neutral-gray/50 transition-colors cursor-pointer"
              >
                Zoom out
              </button>
            )}
          </ControlGroup>
        </>
      )}
    >
      <ChartLegend items={res.branches.map(b => ({ name: b.name, colour: colours[b.id] }))} />
      <TimeLineChart
        label={title}
        series={series}
        from={from}
        to={to}
        months={book.months}
        height={260}
        axisFormat={compact}
        tip={tip}
        onZoom={(a, b) => setZoom([a, b])}
      />
    </ChartPanel>
  );
}
