'use client';

import { useState, type ReactNode } from 'react';
import { SegmentedTabs } from '@/app/inventory/_components';
import { CategoryLineChart, ChartLegend, ColumnChart, TipRow, TipRows, TipTitle, TipTotal, type BandSeries } from '../charts';
import { DAY, iso, isPart, monthDays, monthEnd, monthStart, perDay, type BookBranch, type Day, type Sums } from '@/lib/finance/figures';
import { compact, ghs, int, monthLong, monthShort, partReasons, weekdayDate } from '@/lib/finance/format';
import { ChartNote, ChartPanel, ControlGroup, useChartFilter } from '../ChartPanel';
import { useFinance } from '../FinanceProvider';

/**
 * Net sales by month, one line or set of columns for each branch. Click a
 * month to see its days. Ported from the review page's `drawMonth`.
 */

type Measure = 'net' | 'orders' | 'aov' | 'day';
type Kind = 'lines' | 'bars' | 'stacked';

const MEASURES: Record<Measure, {
  show: string;
  title: string;
  dayTitle: string;
  sub: string;
  get: (a: Sums) => number | null;
  format: (v: number) => string;
  axis: (v: number) => string;
  /** The branches add up to a total that means something. */
  adds: boolean;
}> = {
  net: {
    show: 'Net sales', title: 'Net sales by month', dayTitle: 'Net sales by day',
    sub: 'In Ghana cedis.',
    get: a => (a.days ? a.net : null), format: ghs, axis: compact, adds: true,
  },
  orders: {
    show: 'Orders', title: 'Orders by month', dayTitle: 'Orders by day',
    sub: 'Paid orders, not counting cancelled ones.',
    get: a => (a.days ? a.orders : null), format: int, axis: compact, adds: true,
  },
  aov: {
    show: 'Average order', title: 'Average order by month', dayTitle: 'Average order by day',
    sub: 'Net sales divided by paid orders, in Ghana cedis.',
    get: a => (a.orders ? a.net / a.orders : null), format: ghs, axis: int, adds: false,
  },
  day: {
    show: 'Sales a day', title: 'Sales a day by month', dayTitle: 'Net sales by day',
    sub: 'Net sales divided by the days each branch was open. Part months compare fairly here.',
    get: perDay, format: ghs, axis: compact, adds: true,
  },
};

const SHOW = (Object.keys(MEASURES) as Measure[]).map(value => ({ value, label: MEASURES[value].show }));

export function MonthPanel() {
  const { book, colours } = useFinance();
  const filter = useChartFilter();
  const res = filter.figures;
  const [measure, setMeasure] = useState<Measure>('net');
  const [picked, setKind] = useState<Kind>('lines');
  const [drillTo, setDrill] = useState<string | null>(null);

  const me = MEASURES[measure];
  const canStack = me.adds && res.branches.length > 1;
  const kind: Kind = picked === 'stacked' && !canStack ? 'bars' : picked;
  /* A month the filters have taken away goes back to all months. */
  const drill = drillTo && res.months.includes(drillTo) ? drillTo : null;
  const counts = measure === 'net' || measure === 'orders';
  const reasons = counts && !drill ? partReasons(book, res) : [];
  const legend = res.branches.map(b => ({ name: b.name, colour: colours[b.id] }));

  const kinds = [
    { value: 'lines' as const, label: 'Lines' },
    { value: 'bars' as const, label: 'Bars' },
    ...(canStack ? [{ value: 'stacked' as const, label: 'Stacked' }] : []),
  ];

  const controls = (
    <>
      <ControlGroup caption="Show">
        <SegmentedTabs options={SHOW} value={measure} onChange={setMeasure} />
      </ControlGroup>
      <ControlGroup caption="Chart">
        <SegmentedTabs options={kinds} value={kind} onChange={setKind} />
      </ControlGroup>
    </>
  );

  let chart: ReactNode;
  if (!drill) {
    const part = (b: BookBranch, m: string) => counts && isPart(res.cell[b.id][m], m);
    const series: BandSeries[] = res.branches.map(b => ({
      name: b.name,
      colour: colours[b.id],
      values: res.months.map(m => me.get(res.cell[b.id][m])),
      faded: res.months.map(m => part(b, m)),
      hollow: res.months.map(m => part(b, m)),
    }));
    const tip = (i: number) => {
      const m = res.months[i];
      const open = res.branches.filter(b => res.cell[b.id][m].days > 0);
      const added = open.reduce((sum, b) => sum + (me.get(res.cell[b.id][m]) || 0), 0);
      const total = measure === 'day' ? perDay(res.total[m]) : added;
      return (
        <>
          <TipTitle>{monthLong(m)}</TipTitle>
          <TipRows>
            {res.branches.map(b => {
              const a = res.cell[b.id][m];
              if (!a.days) return <TipRow key={b.id} colour={colours[b.id]} name={b.name} value="Not open yet" />;
              const v = me.get(a);
              return (
                <TipRow
                  key={b.id}
                  colour={colours[b.id]}
                  hollow={part(b, m)}
                  name={b.name}
                  value={v == null ? 'None' : me.format(v)}
                  extra={`${a.days} of ${monthDays(m)} days`}
                />
              );
            })}
            {me.adds && open.length > 0 && res.branches.length > 1 && (
              <TipTotal name="All branches" value={total == null ? 'None' : me.format(total)} extra={`${res.total[m].days} days`} />
            )}
          </TipRows>
        </>
      );
    };
    const pick = (i: number) => setDrill(res.months[i]);
    const categories = res.months.map(monthShort);
    chart = kind === 'lines'
      ? <CategoryLineChart label={me.title} categories={categories} series={series} height={300} axisFormat={me.axis} tip={tip} onPick={pick} />
      : (
        <ColumnChart
          label={me.title}
          categories={categories}
          series={series}
          mode={kind === 'stacked' ? 'stacked' : 'grouped'}
          height={300}
          axisFormat={me.axis}
          totalFormat={measure === 'orders' ? int : compact}
          tip={tip}
          onPick={pick}
        />
      );
  } else {
    const days: Day[] = [];
    for (let t = monthStart(drill), last = Math.min(monthEnd(drill), book.end); t <= last; t += DAY) days.push(t);
    const dayValue = (b: BookBranch, t: Day): number | null => {
      if (t < b.openDay) return null;
      const x = res.days[b.id][iso(t)];
      if (measure === 'orders') return x ? x.orders : 0;
      if (measure === 'aov') return x && x.orders ? x.net / x.orders : null;
      return x ? x.net : 0;
    };
    const series: BandSeries[] = res.branches.map(b => ({ name: b.name, colour: colours[b.id], values: days.map(t => dayValue(b, t)) }));
    const format = measure === 'orders' ? int : ghs;
    const tip = (i: number) => {
      const t = days[i];
      const total = res.branches.reduce((sum, b) => sum + (dayValue(b, t) || 0), 0);
      return (
        <>
          <TipTitle>{weekdayDate(t)}</TipTitle>
          <TipRows>
            {res.branches.map(b => {
              const v = dayValue(b, t);
              return <TipRow key={b.id} colour={colours[b.id]} name={b.name} value={t < b.openDay ? 'Not open yet' : v == null ? 'None' : format(v)} />;
            })}
            {me.adds && res.branches.length > 1 && <TipTotal name="All branches" value={format(total)} />}
          </TipRows>
        </>
      );
    };
    const categories = days.map(t => String(Number(iso(t).slice(8))));
    const title = `${me.dayTitle} in ${monthLong(drill)}`;
    chart = kind === 'lines'
      ? <CategoryLineChart label={title} categories={categories} series={series} height={300} axisFormat={me.axis} minLabel={22} tip={tip} />
      : (
        <ColumnChart
          label={title}
          categories={categories}
          series={series}
          mode={kind === 'stacked' ? 'stacked' : 'grouped'}
          height={300}
          axisFormat={me.axis}
          minLabel={22}
          tip={tip}
        />
      );
  }

  return (
    <ChartPanel
      title={drill ? `${me.dayTitle} in ${monthLong(drill)}` : me.title}
      sub={drill ? undefined : `${me.sub} Choose a month to see its days.`}
      controls={controls}
      filter={filter}
    >
      {drill && (
        <div>
          <button
            type="button"
            onClick={() => setDrill(null)}
            className="min-h-11 px-1 text-sm font-semibold font-body text-text-dark underline underline-offset-4 cursor-pointer"
          >
            Back to all months
          </button>
        </div>
      )}
      <ChartLegend items={legend} partMonth={kind === 'lines' && reasons.length > 0} />
      {chart}
      {reasons.length > 0 && (
        <ChartNote>
          {kind === 'lines' ? 'Hollow dots' : 'Lighter bars'} are part months. {reasons.join(' ')} Choose Sales a day to compare them fairly.
        </ChartNote>
      )}
    </ChartPanel>
  );
}
