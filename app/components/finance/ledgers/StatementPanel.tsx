'use client';

import type { ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/app/inventory/_components';
import { DAY, iso, LABEL, lost, monthEnd, monthStart, openFrom, perDay, type Day, type Figures, type Sums } from '@/lib/finance/figures';
import { amt, int, monthLabel, rowDate } from '@/lib/finance/format';
import { ChartPanel } from '../ChartPanel';
import { useFinance } from '../FinanceProvider';
import { Figure, FigureTable, monthNote } from '../parts';

/**
 * Monthly statement: the chosen branches together, one month to a row, every
 * figure the month holds. A month opens to show its days. Ported from the
 * review page's `drawStatement`.
 *
 * Comparing across the columns is its point, so on a phone it stays a table
 * and scrolls sideways with the month held in place.
 */

const withCount = (amount: number, orders: number): ReactNode => (
  <span className="whitespace-nowrap">
    {amt(amount)}
    {orders > 0 && <span className="text-neutral-gray"> ({int(orders)})</span>}
  </span>
);

interface Measure {
  key: string;
  header: string;
  /** What the column sorts by. */
  value: (a: Sums) => number;
  cell: (a: Sums) => ReactNode;
}

const MEASURES: Measure[] = [
  { key: 'days', header: 'Days open', value: a => a.days, cell: a => int(a.days) },
  { key: 'orders', header: 'Paid orders', value: a => a.orders, cell: a => int(a.orders) },
  { key: 'gross', header: 'Gross sales', value: a => a.gross, cell: a => amt(a.gross) },
  { key: 'discount', header: 'Discounts', value: a => a.discount, cell: a => amt(a.discount) },
  { key: 'serviceCharge', header: 'Service charge', value: a => a.serviceCharge, cell: a => amt(a.serviceCharge) },
  { key: 'net', header: 'Net sales', value: a => a.net, cell: a => <span className="font-bold">{amt(a.net)}</span> },
  { key: 'perDay', header: 'Sales a day', value: a => perDay(a) ?? -1, cell: a => { const v = perDay(a); return v == null ? '' : amt(v); } },
  { key: 'deliveryFee', header: 'Delivery fees to riders', value: a => a.deliveryFee, cell: a => amt(a.deliveryFee) },
  { key: 'cash', header: LABEL.method.cash, value: a => a.cash, cell: a => amt(a.cash) },
  { key: 'momo', header: LABEL.method.mobile_money, value: a => a.momo, cell: a => amt(a.momo) },
  { key: 'card', header: LABEL.method.card, value: a => a.card, cell: a => amt(a.card) },
  { key: 'refunded', header: 'Cancelled and refunded', value: a => a.refundedAmount, cell: a => withCount(a.refundedAmount, a.refundedOrders) },
  { key: 'kept', header: 'Cancelled, money kept', value: a => a.keptAmount, cell: a => withCount(a.keptAmount, a.keptOrders) },
];

export function StatementPanel() {
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
    ...MEASURES.map(f => ({
      key: f.key,
      header: f.header,
      align: 'right' as const,
      sortValue: (m: string) => f.value(res.total[m]),
      cell: (m: string) => f.cell(res.total[m]),
      foot: f.cell(res.grand),
    })),
  ];

  return (
    <ChartPanel
      title="Monthly statement"
      sub="Amounts in Ghana cedis. Counts in brackets are orders. Open a month to see its days."
    >
      <FigureTable
        rows={months}
        rowKey={m => m}
        columns={columns}
        defaultSortKey="month"
        stickyFirst
        expandedContent={m => <MonthDays month={m} />}
        empty="No month in these filters has an open day."
      />
    </ChartPanel>
  );
}

/** One day of a month, all the chosen branches together. */
interface DayRow {
  day: Day;
  orders: number;
  cash: number;
  momo: number;
  card: number;
  net: number;
  deliveryFee: number;
  lost: number;
}

/** Every day in the month that one of the chosen branches was open. */
function daysOf(res: Figures, from: Day, to: Day): DayRow[] {
  const out: DayRow[] = [];
  for (let t = from; t <= to; t += DAY) {
    const row: DayRow = { day: t, orders: 0, cash: 0, momo: 0, card: 0, net: 0, deliveryFee: 0, lost: 0 };
    for (const b of res.branches) {
      const a = t >= b.openDay ? res.days[b.id][iso(t)] : undefined;
      if (!a) continue;
      row.orders += a.orders; row.cash += a.cash; row.momo += a.momo; row.card += a.card;
      row.net += a.net; row.deliveryFee += a.deliveryFee; row.lost += lost(a);
    }
    out.push(row);
  }
  return out;
}

const DAY_COLUMNS: [keyof Omit<DayRow, 'day'>, string, (v: number) => string][] = [
  ['orders', 'Paid orders', int],
  ['cash', LABEL.method.cash, amt],
  ['momo', LABEL.method.mobile_money, amt],
  ['card', LABEL.method.card, amt],
  ['net', 'Net sales', amt],
  ['deliveryFee', 'Delivery fees', amt],
  ['lost', 'Cancelled after payment', int],
];

/** The days of one month, built only when the month is opened. */
function MonthDays({ month }: { month: string }) {
  const { book, figures: res } = useFinance();
  const from = Math.max(monthStart(month), openFrom(res.branches));
  const to = Math.min(monthEnd(month), book.end);
  const rows = daysOf(res, from, to);

  return (
    <div className="tabular-nums">
      <DataTable
        framed={false}
        data={rows}
        rowKey={r => r.day}
        pageSize={Math.max(1, rows.length)}
        defaultSortKey="day"
        columns={[
          {
            key: 'day',
            header: 'Day',
            sortValue: r => r.day,
            cell: r => <Figure value={rowDate(r.day)} under={r.day === book.today ? 'So far' : undefined} />,
          },
          ...DAY_COLUMNS.map(([key, header, format]) => ({
            key,
            header,
            align: 'right' as const,
            sortValue: (r: DayRow) => r[key],
            cell: (r: DayRow) => (key === 'net' ? <span className="font-bold">{format(r[key])}</span> : format(r[key])),
          })),
        ]}
      />
    </div>
  );
}
