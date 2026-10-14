'use client';

import { useState } from 'react';
import { SegmentedTabs, TextInput } from '@/app/inventory/_components';
import { ColumnChart, TipNote, TipRow, TipRows, TipTitle } from '../charts';
import { change, iso, perDay, periodPresets, periods, ymd, type Day, type PeriodRanges, type Sums } from '@/lib/finance/figures';
import { amt, compact, ghs, int, monthName, plural, rangeText, signedPct } from '@/lib/finance/format';
import { ChangePill } from '../ChangePill';
import { ChartNote, ChartPanel, ControlGroup, useChartFilter } from '../ChartPanel';
import { useFinance } from '../FinanceProvider';
import { BranchName, Figure, FigureTable } from '../parts';

/**
 * Period against period: any two spans of days, branch by branch. One table
 * with the branches as rows, then paired bars. Ported from the review page's
 * `drawPeriod`.
 */

type Preset = 'mtd' | 'full' | 'custom';
type Measure = 'net' | 'orders' | 'aov' | 'day';

const MEASURES: Record<Measure, {
  show: string;
  get: (a: Sums) => number | null;
  format: (v: number) => string;
  tipFormat: (v: number) => string;
  axis: (v: number) => string;
  /** In cedis, so the sub line says so. */
  money: boolean;
}> = {
  net: { show: 'Net sales', get: a => a.net, format: amt, tipFormat: ghs, axis: compact, money: true },
  orders: { show: 'Orders', get: a => a.orders, format: int, tipFormat: int, axis: compact, money: false },
  aov: { show: 'Average order', get: a => (a.orders ? a.net / a.orders : null), format: amt, tipFormat: ghs, axis: int, money: true },
  day: { show: 'Sales a day', get: perDay, format: amt, tipFormat: ghs, axis: compact, money: true },
};

const SHOW = (Object.keys(MEASURES) as Measure[]).map(value => ({ value, label: MEASURES[value].show }));

/** The change from the earlier period. Sales a day goes through `change`, which leaves today out (D7). */
const changeOf = (measure: Measure, a: Sums, b: Sums): number | null => {
  if (measure === 'day') return change(a, b);
  const x = MEASURES[measure].get(a), y = MEASURES[measure].get(b);
  return x != null && y ? x / y - 1 : null;
};


type Picked = { a0: Day; a1: Day; b0: Day; b1: Day };

export function PeriodPanel() {
  const { book, colours } = useFinance();
  const filter = useChartFilter();
  const [preset, setPreset] = useState<Preset>('mtd');
  const [measure, setMeasure] = useState<Measure>('net');
  const [picked, setPicked] = useState<Picked | null>(null);

  const { mtd, full, month } = periodPresets(book);
  /* Pick dates starts from the month so far, until a date is changed. */
  const dates: Picked = picked ?? { a0: mtd.A[0], a1: mtd.A[1], b0: mtd.B[0], b1: mtd.B[1] };
  const R: PeriodRanges = preset === 'mtd' ? mtd : preset === 'full' ? full : {
    A: [Math.min(dates.a0, dates.a1), Math.max(dates.a0, dates.a1)],
    B: [Math.min(dates.b0, dates.b1), Math.max(dates.b0, dates.b1)],
  };

  const me = MEASURES[measure];
  const P = periods(book, filter.figures.filters, R.A, R.B);
  const aT = rangeText(R.A[0], R.A[1]), bT = rangeText(R.B[0], R.B[1]);
  const first = Math.min(...book.branches.map(b => b.openDay));

  const setDate = (key: keyof Picked, value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    const t = Math.min(Math.max(ymd(value), first), book.end);
    setPicked({ ...dates, [key]: t });
  };
  const dateField = (key: keyof Picked, label: string) => (
    <label className="flex flex-col gap-1 text-sm font-body text-neutral-gray">
      {label}
      <TextInput
        type="date"
        min={iso(first)}
        max={iso(book.end)}
        value={iso(dates[key])}
        onChange={e => setDate(key, e.target.value)}
        className="min-h-11 tabular-nums"
      />
    </label>
  );

  type Row = { key: string; name: string; colour?: string; a: Sums; b: Sums; all?: boolean };
  const rows: Row[] = P.rows.map(r => ({ key: String(r.branch.id), name: r.branch.name, colour: colours[r.branch.id], a: r.a, b: r.b }));
  if (rows.length > 1) rows.push({ key: 'all', name: 'All branches', a: P.all.a, b: P.all.b, all: true });
  const cell = (a: Sums) => {
    const v = me.get(a);
    return v == null ? '' : me.format(v);
  };

  const controls = (
    <>
      <ControlGroup caption="Period">
        <SegmentedTabs
          options={[
            { value: 'mtd' as const, label: `${monthName(month)} so far` },
            { value: 'full' as const, label: 'Last full month' },
            { value: 'custom' as const, label: 'Pick dates' },
          ]}
          value={preset}
          onChange={setPreset}
        />
      </ControlGroup>
      <ControlGroup caption="Show">
        <SegmentedTabs options={SHOW} value={measure} onChange={setMeasure} />
      </ControlGroup>
    </>
  );

  return (
    <ChartPanel
      title={`${me.show}, period against period`}
      sub={`${aT}, against ${bT}.${me.money ? ' Amounts in Ghana cedis.' : ''}`}
      controls={controls}
      filter={filter}
    >
      {preset === 'custom' && (
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <fieldset className="flex flex-wrap items-end gap-3">
            <legend className="text-sm font-semibold font-body text-text-dark mb-1">This period</legend>
            {dateField('a0', 'From')}
            {dateField('a1', 'To')}
          </fieldset>
          <fieldset className="flex flex-wrap items-end gap-3">
            <legend className="text-sm font-semibold font-body text-text-dark mb-1">Earlier period</legend>
            {dateField('b0', 'From')}
            {dateField('b1', 'To')}
          </fieldset>
        </div>
      )}

      {P.rows.length === 0 ? (
        <p className="py-8 text-center text-sm font-body text-neutral-gray">No branch was open in these periods.</p>
      ) : (
        <>
          <FigureTable
            rows={rows}
            rowKey={r => r.key}
            columns={[
              { key: 'branch', header: 'Branch', cell: r => <BranchName name={r.name} colour={r.colour} strong={r.all} /> },
              { key: 'a', header: 'This period', align: 'right', cell: r => <Figure value={cell(r.a)} under={plural(r.a.days, 'day')} strong={r.all} /> },
              { key: 'b', header: 'Earlier period', align: 'right', cell: r => <Figure value={cell(r.b)} under={plural(r.b.days, 'day')} strong={r.all} /> },
              { key: 'change', header: 'Change', align: 'right', cell: r => <ChangePill value={changeOf(measure, r.a, r.b)} /> },
            ]}
          />
          <ColumnChart
            label={`${me.show}, ${aT} against ${bT}`}
            categories={P.rows.map(r => r.branch.name)}
            series={[
              {
                name: bT,
                colour: colours[P.rows[0].branch.id],
                colours: P.rows.map(r => colours[r.branch.id]),
                faded: P.rows.map(() => true),
                values: P.rows.map(r => me.get(r.b)),
              },
              {
                name: aT,
                colour: colours[P.rows[0].branch.id],
                colours: P.rows.map(r => colours[r.branch.id]),
                values: P.rows.map(r => me.get(r.a)),
              },
            ]}
            height={240}
            axisFormat={me.axis}
            tip={i => {
              const r = P.rows[i];
              const c = changeOf(measure, r.a, r.b);
              const value = (a: Sums) => { const v = me.get(a); return v == null ? 'None' : me.tipFormat(v); };
              return (
                <>
                  <TipTitle>{r.branch.name}</TipTitle>
                  <TipRows>
                    <TipRow colour={colours[r.branch.id]} name={aT} value={value(r.a)} extra={plural(r.a.days, 'day')} />
                    <TipRow colour={colours[r.branch.id]} hollow name={bT} value={value(r.b)} extra={plural(r.b.days, 'day')} />
                  </TipRows>
                  <TipNote>{c == null ? 'No change to show.' : `Change ${signedPct(c)}.`}</TipNote>
                </>
              );
            }}
          />
          <ChartNote>The lighter bar is {bT}. The solid bar is {aT}.</ChartNote>
        </>
      )}
    </ChartPanel>
  );
}
