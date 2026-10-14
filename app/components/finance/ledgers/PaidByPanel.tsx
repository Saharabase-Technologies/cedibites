'use client';

import type { DataTableColumn } from '@/app/inventory/_components';
import { LABEL, type Sums } from '@/lib/finance/figures';
import { amt, monthLabel, pct } from '@/lib/finance/format';
import { ChartNote, ChartPanel } from '../ChartPanel';
import { useFinance } from '../FinanceProvider';
import { Figure, FigureTable, monthNote } from '../parts';

/**
 * How customers paid: each month's net sales by payment method, with each
 * method's share. Ported from the review page's `drawPay`.
 */

const METHODS: ['cash' | 'momo' | 'card', string][] = [
  ['cash', LABEL.method.cash],
  ['momo', LABEL.method.mobile_money],
  ['card', LABEL.method.card],
];

const share = (part: number, a: Sums): number => (a.net ? part / a.net : 0);

export function PaidByPanel() {
  const { book, figures: res } = useFinance();
  const months = res.months.filter(m => res.total[m].days > 0);

  const columns: DataTableColumn<string>[] = [
    {
      key: 'month',
      header: 'Month',
      sortValue: m => m,
      cell: m => <span className="font-medium"><Figure value={monthLabel(m)} under={monthNote(book, res, m)} /></span>,
      foot: 'Total',
    },
    ...METHODS.flatMap(([key, label]) => [
      {
        key,
        header: label,
        align: 'right' as const,
        sortValue: (m: string) => res.total[m][key],
        cell: (m: string) => amt(res.total[m][key]),
        foot: amt(res.grand[key]),
      },
      {
        key: `${key}Share`,
        header: `${label} share`,
        align: 'right' as const,
        sortValue: (m: string) => share(res.total[m][key], res.total[m]),
        cell: (m: string) => <span className="text-neutral-gray">{pct(share(res.total[m][key], res.total[m]))}</span>,
        foot: pct(share(res.grand[key], res.grand)),
      },
    ]),
    {
      key: 'net',
      header: 'Net sales',
      align: 'right',
      sortValue: m => res.total[m].net,
      cell: m => <span className="font-bold">{amt(res.total[m].net)}</span>,
      foot: amt(res.grand.net),
    },
  ];

  return (
    <ChartPanel title="How customers paid" sub="Net sales by payment method, in Ghana cedis.">
      <FigureTable
        rows={months}
        rowKey={m => m}
        columns={columns}
        defaultSortKey="month"
        stackOnPhone
        empty="No month in these filters has an open day."
      />
      <ChartNote>An order paid in two parts counts whole under its first payment.</ChartNote>
    </ChartPanel>
  );
}
