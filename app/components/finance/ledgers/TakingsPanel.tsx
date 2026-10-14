'use client';

import type { DataTableColumn } from '@/app/inventory/_components';
import { DAY, iso, LABEL, lost, type BookBranch, type Day, type Figures, type Sums } from '@/lib/finance/figures';
import { amt, int, rowDate } from '@/lib/finance/format';
import { ChartPanel } from '../ChartPanel';
import { useFinance } from '../FinanceProvider';
import { BranchName, Figure, FigureTable } from '../parts';

/**
 * Daily takings: every day each chosen branch was open, one branch and day to
 * a row, newest first. Ported from the review page's `drawDailyLedger`. Its
 * CSV comes with the download, in Phase 6.
 */

interface TakingsRow {
  day: Day;
  branch: BookBranch;
  /** The branch's place among the chosen ones, to keep a day's rows in order. */
  place: number;
  /** Null on a day the branch was open and sold nothing. */
  sums: Sums | null;
}

function takingsRows(res: Figures): TakingsRow[] {
  const out: TakingsRow[] = [];
  res.branches.forEach((branch, place) => {
    for (let t = Math.max(res.start, branch.openDay); t <= res.end; t += DAY) {
      out.push({ day: t, branch, place, sums: res.days[branch.id][iso(t)] ?? null });
    }
  });
  return out;
}

const FIGURES: [string, string, (a: Sums) => number, (v: number) => string][] = [
  ['orders', 'Paid orders', a => a.orders, int],
  ['cash', LABEL.method.cash, a => a.cash, amt],
  ['momo', LABEL.method.mobile_money, a => a.momo, amt],
  ['card', LABEL.method.card, a => a.card, amt],
  ['net', 'Net sales', a => a.net, amt],
  ['deliveryFee', 'Delivery fees', a => a.deliveryFee, amt],
];

export function TakingsPanel() {
  const { book, figures: res, colours } = useFinance();
  const rows = takingsRows(res);
  const read = (r: TakingsRow, get: (a: Sums) => number) => (r.sums ? get(r.sums) : 0);

  const columns: DataTableColumn<TakingsRow>[] = [
    {
      key: 'day',
      header: 'Date',
      sortValue: r => r.day + r.place,
      cell: r => <Figure value={rowDate(r.day)} under={r.day === book.today ? 'So far' : undefined} />,
    },
    ...(res.branches.length > 1 ? [{
      key: 'branch',
      header: 'Branch',
      sortValue: (r: TakingsRow) => r.branch.name,
      cell: (r: TakingsRow) => <BranchName name={r.branch.name} colour={colours[r.branch.id]} />,
    }] : []),
    ...FIGURES.map(([key, header, get, format]) => ({
      key,
      header,
      align: 'right' as const,
      sortValue: (r: TakingsRow) => read(r, get),
      cell: (r: TakingsRow) => (key === 'net' ? <span className="font-bold">{format(read(r, get))}</span> : format(read(r, get))),
    })),
    {
      key: 'lost',
      header: 'Cancelled after payment',
      align: 'right',
      sortValue: r => read(r, lost),
      cell: r => <span className={read(r, lost) ? undefined : 'text-neutral-gray'}>{int(read(r, lost))}</span>,
    },
  ];

  return (
    <ChartPanel title="Daily takings" sub="Every day each branch was open. Amounts in Ghana cedis.">
      <FigureTable
        rows={rows}
        rowKey={r => `${r.branch.id}-${r.day}`}
        columns={columns}
        pageSize={15}
        defaultSortKey="day"
        defaultSortDir="desc"
        stackOnPhone
        empty="No branch was open in these filters."
      />
    </ChartPanel>
  );
}
