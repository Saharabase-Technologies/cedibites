'use client';

import { useId } from 'react';
import { SeriesKey } from '../charts';
import { AXIS_TEXT } from '../charts/scale';
import { isPart, pace, perDay, type PaceRow } from '@/lib/finance/figures';
import { amt, dayAndMonth, ghs, ghs0, int, listAnd, monthName, monthShort } from '@/lib/finance/format';
import { ChangePill } from '../ChangePill';
import { ChartNote } from '../ChartPanel';
import { useFinance } from '../FinanceProvider';
import { BranchName, FigureTable } from '../parts';

/**
 * This month so far, against the same days of the month before, with where
 * the month lands if the days left sell like the days so far. Ported from the
 * review page's `drawPace`.
 *
 * It always shows the month the last complete day falls in, whatever months
 * the page has chosen. It follows the page's branch and channel filters.
 */

/** One branch's bar: the month so far, the forecast after it, and a mark at the whole month before (D16). */
function PaceBar({ row, colour, name, scale, before }: { row: PaceRow; colour: string; name: string; scale: number; before: string }) {
  const soFar = Math.max(0, (row.soFar.net / scale) * 100);
  const rest = Math.max(0, ((row.forecast - row.soFar.net) / scale) * 100);
  const mark = Math.min(100, (row.monthBefore.net / scale) * 100);
  const words = `${name}: ${ghs(row.soFar.net)} so far, forecast ${ghs0(row.forecast)}, all of ${monthName(before)} ${ghs0(row.monthBefore.net)}.`;
  return (
    <div className="flex flex-col gap-2">
      <BranchName name={name} colour={row.branch ? colour : undefined} strong />
      <div role="img" aria-label={words} className="relative h-6 rounded-md bg-neutral-light">
        <div className="absolute inset-y-0 left-0 rounded-l-md" style={{ width: `${soFar}%`, background: colour }} />
        <div className="absolute inset-y-0 rounded-r-md opacity-40" style={{ left: `${soFar}%`, width: `${rest}%`, background: colour }} />
        {row.monthBefore.net > 0 && (
          <div className="absolute -inset-y-1 w-0.5 rounded-full bg-text-dark" style={{ left: `calc(${mark}% - 1px)` }} />
        )}
      </div>
      <ul aria-hidden className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-body text-text-dark tabular-nums">
        <li className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: colour }} />
          So far {ghs(row.soFar.net)}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm opacity-40" style={{ background: colour }} />
          Forecast {ghs0(row.forecast)}
        </li>
        {row.monthBefore.net > 0 && (
          <li className="inline-flex items-center gap-1.5">
            <span className="w-0.5 h-3.5 rounded-full bg-text-dark" />
            All of {monthName(before)} {ghs0(row.monthBefore.net)}
            <ChangePill value={row.vsMonthBefore} />
          </li>
        )}
      </ul>
    </div>
  );
}

export function PacePanel() {
  const { book, filters, colours } = useFinance();
  const titleId = useId();
  const pc = pace(book, filters);
  const { month, monthBefore: before } = pc;

  const rows = pc.rows.length > 1 ? [...pc.rows, pc.all] : pc.rows;
  const scale = Math.max(1, ...rows.map(r => Math.max(r.forecast, r.monthBefore.net)));
  const colourOf = (r: PaceRow) => (r.branch ? colours[r.branch.id] : AXIS_TEXT);
  const nameOf = (r: PaceRow) => (r.branch ? r.branch.name : 'All branches');

  /* A branch that opened in the month before has a short month to measure against. Its forecast reads as growth. */
  const opened = pc.rows.flatMap(r => (r.branch && isPart(r.monthBefore, before) ? [r.branch] : []));
  const short = (r: PaceRow) => !!r.branch && opened.includes(r.branch);

  const whole = pc.daysLeft === 0;
  const title = whole ? `All of ${monthName(month)}` : `${monthName(month)} so far`;

  return (
    <section aria-labelledby={titleId} className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4 md:p-5 flex flex-col gap-4 min-w-0">
      <div>
        <h2 id={titleId} className="text-lg font-semibold font-body text-text-dark">{title}</h2>
        <p className="text-sm font-body text-neutral-gray mt-1">
          1 to {pc.daysIn} {monthName(month)}, against the same days of {monthName(before)}.
          {!whole && ` The forecast is where ${monthName(month)} lands if the ${pc.daysLeft} days left sell like the days so far.`}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm font-body text-neutral-gray">No branch was open in {monthName(month)}.</p>
      ) : (
        <>
          <div className="flex flex-col gap-5">
            {rows.map(r => (
              <PaceBar key={r.branch ? r.branch.id : 'all'} row={r} colour={colourOf(r)} name={nameOf(r)} scale={scale} before={before} />
            ))}
          </div>

          <FigureTable
            rows={rows}
            rowKey={r => (r.branch ? r.branch.id : 'all')}
            stackOnPhone
            columns={[
              { key: 'branch', header: 'Branch', cell: r => <BranchName name={nameOf(r)} colour={r.branch ? colourOf(r) : undefined} strong={!r.branch} /> },
              { key: 'days', header: 'Days so far', align: 'right', cell: r => int(r.soFar.days) },
              { key: 'soFar', header: 'Sales so far', align: 'right', cell: r => amt(r.soFar.net) },
              { key: 'same', header: `Same days of ${monthShort(before)}`, align: 'right', cell: r => amt(r.sameDays.net) },
              { key: 'change', header: 'Change', align: 'right', cell: r => <ChangePill value={r.change} /> },
              { key: 'day', header: 'Sales a day', align: 'right', cell: r => { const v = perDay(r.soFar); return v == null ? '' : amt(v); } },
              { key: 'forecast', header: `Forecast for ${monthShort(month)}`, align: 'right', cell: r => <span className="font-bold">{amt(r.forecast)}</span> },
              { key: 'before', header: `All of ${monthShort(before)}`, align: 'right', cell: r => amt(r.monthBefore.net) },
              {
                key: 'vs',
                header: `Forecast against ${monthShort(before)}`,
                align: 'right',
                cell: r => (
                  <span className="inline-flex items-center gap-1.5">
                    {short(r) && <><SeriesKey colour={AXIS_TEXT} hollow /><span className="sr-only">Part month. </span></>}
                    <ChangePill value={r.vsMonthBefore} />
                  </span>
                ),
              },
            ]}
          />

          <ChartNote>
            Change compares sales a day. Amounts in Ghana cedis.
            {opened.length > 0 && ` A hollow dot marks a part month. ${listAnd(opened.map(b => `${b.name} opened on ${dayAndMonth(b.openDay)}`))}. ${opened.length === 1 ? 'Its forecast' : 'Their forecasts'} against ${monthName(before)} ${opened.length === 1 ? 'reads' : 'read'} as growth.`}
            {' '}This section always shows {monthName(month)}, whatever months are chosen above.
          </ChartNote>
        </>
      )}
    </section>
  );
}
