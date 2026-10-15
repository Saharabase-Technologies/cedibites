'use client';

import type { DataTableColumn } from '@/app/inventory/_components';
import { takingsCsv } from '@/lib/finance/csv';
import { fileName, saveFile } from '@/lib/finance/download';
import { LABEL, lost, takingsRows, type Sums, type TakingsRow } from '@/lib/finance/figures';
import { amt, int, rowDate } from '@/lib/finance/format';
import { ChartPanel } from '../ChartPanel';
import { useFinance } from '../FinanceProvider';
import { BranchName, CsvButton, Figure, FigureTable } from '../parts';

/**
 * Daily takings: every day each chosen branch was open, one branch and day to
 * a row, newest first. Ported from the review page's `drawDailyLedger`. Its
 * CSV button saves the same rows.
 */

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
    <ChartPanel
      title="Daily takings"
      sub="Every day each branch was open. Amounts in Ghana cedis."
      controls={<CsvButton disabled={!rows.length} onClick={() => saveFile(fileName(book, res, 'daily takings', 'csv'), takingsCsv(res))} />}
    >
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
