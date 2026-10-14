'use client';

import { useState } from 'react';
import { SegmentedTabs } from '@/app/inventory/_components';
import { CategoryLineChart, ChartLegend, ColumnChart, TipRow, TipRows, TipTitle, type BandSeries } from '../charts';
import { isPart, perDay, since, type Sums } from '@/lib/finance/figures';
import { amt, compact, ghs, int, monthLabel, plural } from '@/lib/finance/format';
import { ChartNote, ChartPanel, ControlGroup, useChartFilter } from '../ChartPanel';
import { useFinance } from '../FinanceProvider';
import { Figure, FigureTable } from '../parts';

/**
 * Months since opening: each branch from its own first month, so their starts
 * sit side by side (D15). The chart says Month 1, 2, 3. Each table cell also
 * names the real month. Ported from the review page's `drawSince`.
 *
 * It always starts at each opening, whatever months the page has chosen.
 */

type Measure = 'net' | 'orders' | 'aov' | 'day';
type Kind = 'lines' | 'bars';

const MEASURES: Record<Measure, {
  show: string;
  title: string;
  get: (a: Sums) => number | null;
  format: (v: number) => string;
  tipFormat: (v: number) => string;
  axis: (v: number) => string;
  /** A total for the month, so a short month reads low and is drawn hollow. */
  counts: boolean;
}> = {
  net: { show: 'Net sales', title: 'Net sales by month since opening', get: a => (a.days ? a.net : null), format: amt, tipFormat: ghs, axis: compact, counts: true },
  orders: { show: 'Orders', title: 'Orders by month since opening', get: a => (a.days ? a.orders : null), format: int, tipFormat: int, axis: compact, counts: true },
  aov: { show: 'Average order', title: 'Average order by month since opening', get: a => (a.orders ? a.net / a.orders : null), format: amt, tipFormat: ghs, axis: int, counts: false },
  day: { show: 'Sales a day', title: 'Sales a day by month since opening', get: perDay, format: amt, tipFormat: ghs, axis: compact, counts: false },
};

const SHOW = (['net', 'orders', 'aov', 'day'] as Measure[]).map(value => ({ value, label: MEASURES[value].show }));
const KINDS = [{ value: 'lines' as const, label: 'Lines' }, { value: 'bars' as const, label: 'Bars' }];

export function SincePanel() {
  const { book, colours } = useFinance();
  const filter = useChartFilter();
  const [measure, setMeasure] = useState<Measure>('day');
  const [kind, setKind] = useState<Kind>('lines');

  const me = MEASURES[measure];
  const list = since(book, filter.figures.filters);
  const n = Math.max(0, ...list.map(x => x.months.length));
  const steps = Array.from({ length: n }, (_, i) => i);
  const part = (x: (typeof list)[number], i: number) => {
    const e = x.months[i];
    return !!e && me.counts && isPart(e.sums, e.month);
  };

  const series: BandSeries[] = list.map(x => ({
    name: x.branch.name,
    colour: colours[x.branch.id],
    values: steps.map(i => (x.months[i] ? me.get(x.months[i].sums) : null)),
    faded: steps.map(i => part(x, i)),
    hollow: steps.map(i => part(x, i)),
  }));
  const anyPart = list.some(x => steps.some(i => part(x, i)));
  const categories = steps.map(i => `Month ${i + 1}`);
  const tip = (i: number) => (
    <>
      <TipTitle>Month {i + 1}</TipTitle>
      <TipRows>
        {list.map(x => {
          const e = x.months[i];
          if (!e) return <TipRow key={x.branch.id} colour={colours[x.branch.id]} name={x.branch.name} value="Not yet" />;
          const v = me.get(e.sums);
          return (
            <TipRow
              key={x.branch.id}
              colour={colours[x.branch.id]}
              hollow={part(x, i)}
              name={x.branch.name}
              value={v == null ? 'None' : me.tipFormat(v)}
              extra={`${monthLabel(e.month)}, ${plural(e.sums.days, 'day')}`}
            />
          );
        })}
      </TipRows>
    </>
  );

  const controls = (
    <>
      <ControlGroup caption="Show">
        <SegmentedTabs options={SHOW} value={measure} onChange={setMeasure} />
      </ControlGroup>
      <ControlGroup caption="Chart">
        <SegmentedTabs options={KINDS} value={kind} onChange={setKind} />
      </ControlGroup>
    </>
  );

  return (
    <ChartPanel
      title={me.title}
      sub="Month 1 is the month of each branch's first sale."
      controls={controls}
      filter={filter}
    >
      <ChartLegend items={list.map(x => ({ name: x.branch.name, colour: colours[x.branch.id] }))} partMonth={kind === 'lines' && anyPart} />
      {kind === 'lines'
        ? <CategoryLineChart label={me.title} categories={categories} series={series} height={280} axisFormat={me.axis} tip={tip} />
        : <ColumnChart label={me.title} categories={categories} series={series} height={280} axisFormat={me.axis} tip={tip} />}

      <FigureTable
        rows={steps}
        rowKey={i => i}
        columns={[
          { key: 'month', header: 'Month', cell: i => <span className="font-medium whitespace-nowrap">Month {i + 1}</span> },
          ...list.map(x => ({
            key: String(x.branch.id),
            header: x.branch.name,
            align: 'right' as const,
            cell: (i: number) => {
              const e = x.months[i];
              if (!e) return <span className="text-neutral-gray">Not yet</span>;
              const v = me.get(e.sums);
              const days = isPart(e.sums, e.month) ? `, ${plural(e.sums.days, 'day')}` : '';
              return <Figure value={v == null ? '' : me.format(v)} under={monthLabel(e.month) + days} />;
            },
          })),
        ]}
      />

      <ChartNote>
        {anyPart && `${kind === 'lines' ? 'Hollow dots' : 'Lighter bars'} are part months. Choose Sales a day to compare them fairly. `}
        This section always starts at each opening, whatever months are chosen above.
      </ChartNote>
    </ChartPanel>
  );
}
