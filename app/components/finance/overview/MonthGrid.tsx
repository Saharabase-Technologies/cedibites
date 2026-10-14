'use client';

import { useId } from 'react';
import { CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react';
import { TONE } from '@/app/inventory/_components/status-tokens';
import { SeriesKey } from '../charts';
import { change, iso, monthBefore, monthDays, monthEnd, monthStart, perDay, sumRange, type BookBranch, type Sums } from '@/lib/finance/figures';
import { amt, int, monthLabel, monthShort, signedPct } from '@/lib/finance/format';
import { useFinance } from '../FinanceProvider';

/**
 * Month by month, branch by branch (D14). For each branch: net sales,
 * orders, sales a day and the change in sales a day from the month before.
 * Totals at the foot.
 *
 * Comparing across the columns is the point, so on a phone the grid scrolls
 * sideways with the month held in place.
 */

const COLUMNS = ['Net sales', 'Orders', 'Sales a day', 'Change'];

/** Change in sales a day as a pill: up, down or flat (D7). */
function ChangePill({ value }: { value: number | null }) {
  if (value == null || !isFinite(value)) return null;
  const tone = value > 0.0005 ? TONE.done : value < -0.0005 ? TONE.problem : TONE.neutral;
  const Icon = value > 0.0005 ? CaretUpIcon : value < -0.0005 ? CaretDownIcon : null;
  const words = value > 0.0005 ? 'Up' : value < -0.0005 ? 'Down' : 'Flat';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${tone.bg} ${tone.text}`}>
      {Icon && <Icon size={11} weight="fill" aria-hidden />}
      <span className="sr-only">{words} </span>
      {signedPct(value).replace(/^[+-]/, '')}
    </span>
  );
}

const th = 'text-[10px] font-bold uppercase tracking-wider text-neutral-gray py-3 px-4 whitespace-nowrap';
const stick = 'sticky left-0 z-[1] bg-neutral-card';

export function MonthGrid() {
  const { book, figures: res, colours } = useFinance();
  const titleId = useId();

  /* The month before the first one shown, so its change is not left blank. */
  const previous = (b: BookBranch, m: string): Sums => {
    const before = monthBefore(m);
    return res.cell[b.id][before] ?? sumRange(book, res.days, b, monthStart(before), monthEnd(before));
  };

  /* A short month says which days it holds: `27 to 31 Mar`. */
  const monthNote = (m: string): string => {
    const t = res.total[m];
    if (!t || !t.days || t.days >= monthDays(m)) return '';
    const from = Math.max(monthStart(m), Math.min(...res.branches.map(b => b.openDay)));
    const to = Math.min(monthEnd(m), book.end);
    return `${Number(iso(from).slice(8))} to ${Number(iso(to).slice(8))} ${monthShort(m)}`;
  };

  return (
    <section aria-labelledby={titleId} className="bg-neutral-card border border-[#f0e8d8] rounded-2xl flex flex-col min-w-0">
      <div className="p-4 md:p-5 pb-3 md:pb-3">
        <h2 id={titleId} className="text-lg font-semibold font-body text-text-dark">Month by month, branch by branch</h2>
        <p className="text-sm font-body text-neutral-gray mt-1">
          Amounts in Ghana cedis. Change compares sales a day with the month before.
        </p>
      </div>
      <div className="overflow-x-auto min-w-0">
        <table className="w-full text-sm font-body tabular-nums">
          <thead>
            <tr>
              <th rowSpan={2} scope="col" className={`${th} ${stick} text-left align-bottom border-b border-[#f0e8d8]`}>Month</th>
              {res.branches.map(b => (
                <th key={b.id} colSpan={COLUMNS.length} scope="colgroup" className="py-2 px-4 text-xs font-semibold text-text-dark text-center whitespace-nowrap border-b border-[#f0e8d8]">
                  <span className="inline-flex items-center gap-1.5">
                    <SeriesKey colour={colours[b.id]} />
                    {b.name}
                  </span>
                </th>
              ))}
            </tr>
            <tr className="border-b border-[#f0e8d8]">
              {res.branches.map(b => COLUMNS.map((c, i) => (
                <th key={`${b.id}-${c}`} scope="col" className={`${th} text-right ${i === 0 ? 'pl-8' : ''}`}>{c}</th>
              )))}
            </tr>
          </thead>
          <tbody>
            {res.months.map(m => {
              const note = monthNote(m);
              return (
                <tr key={m} className="border-b border-[#f0e8d8]">
                  <th scope="row" className={`${stick} py-3 px-4 text-left font-medium text-text-dark whitespace-nowrap`}>
                    {monthLabel(m)}
                    {note && <span className="block text-xs font-normal text-neutral-gray">{note}</span>}
                  </th>
                  {res.branches.map(b => {
                    const a = res.cell[b.id][m];
                    if (!a.days) {
                      return (
                        <td key={b.id} colSpan={COLUMNS.length} className="py-3 px-4 text-center text-neutral-gray">
                          Not open yet
                        </td>
                      );
                    }
                    const pd = perDay(a);
                    return [
                      <td key={`${b.id}-net`} className="py-3 pr-4 pl-8 text-right font-semibold text-text-dark whitespace-nowrap">{amt(a.net)}</td>,
                      <td key={`${b.id}-orders`} className="py-3 px-4 text-right text-text-dark whitespace-nowrap">{int(a.orders)}</td>,
                      <td key={`${b.id}-day`} className="py-3 px-4 text-right text-text-dark whitespace-nowrap">{pd == null ? '' : amt(pd)}</td>,
                      <td key={`${b.id}-change`} className="py-3 px-4 text-right whitespace-nowrap"><ChangePill value={change(a, previous(b, m))} /></td>,
                    ];
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-neutral-light">
              <th scope="row" className="sticky left-0 z-[1] bg-neutral-light py-3 px-4 text-left font-bold text-text-dark">Total</th>
              {res.branches.map(b => {
                const t = res.branchTotal[b.id];
                const pd = perDay(t);
                return [
                  <td key={`${b.id}-net`} className="py-3 pr-4 pl-8 text-right font-bold text-text-dark whitespace-nowrap">{amt(t.net)}</td>,
                  <td key={`${b.id}-orders`} className="py-3 px-4 text-right font-bold text-text-dark whitespace-nowrap">{int(t.orders)}</td>,
                  <td key={`${b.id}-day`} className="py-3 px-4 text-right font-bold text-text-dark whitespace-nowrap">{pd == null ? '' : amt(pd)}</td>,
                  <td key={`${b.id}-change`} className="py-3 px-4" />,
                ];
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
