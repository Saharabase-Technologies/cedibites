import type { FinanceCancelledOrder } from '@/types/finance';
import { iso, LABEL, lost, perDay, takingsRows, type Figures, type Sums } from './figures';

/**
 * The Finance CSVs: sales by month from the download sheet, and the Daily
 * takings and Cancelled after payment lists from their own buttons.
 *
 * A cell holds a plain number, with no currency and no thousands comma, so a
 * spreadsheet can add a column up. A date is `YYYY-MM-DD`, which every
 * spreadsheet reads as a date.
 */

type Cell = string | number;

/** An amount with two decimals and nothing else: `1250.00`. */
const money = (v: number): string => (Math.round((v + Number.EPSILON) * 100) / 100).toFixed(2);

/**
 * Text from the ledger, such as a reason a cashier typed. A spreadsheet runs
 * a cell that starts with `=`, `+`, `-` or `@` as a formula, so such a cell
 * gets an apostrophe in front and is read as text.
 */
const text = (s: string): string => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s);

/** Lines as CSV: CRLF between lines, and a cell in quotes when it holds a comma, a quote or a line break. */
export function toCsv(lines: Cell[][]): string {
  return lines.map(line => line.map(v => {
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\r\n') + '\r\n';
}

/** The byte order mark. It tells Excel the file is UTF-8, so a name with an accent opens as written. */
const BOM = String.fromCharCode(0xfeff);

const csvFile = (lines: Cell[][]): Blob => new Blob([BOM + toCsv(lines)], { type: 'text/csv;charset=utf-8' });

const SALES_HEAD = [
  'Branch', 'Month', 'Days open', 'Paid orders', 'Gross sales', 'Discounts', 'Service charge', 'Kept by Bolt', 'Net sales', 'Sales a day',
  'Delivery fees to riders', LABEL.method.cash, LABEL.method.mobile_money, LABEL.method.card,
  'Cancelled and refunded (orders)', 'Cancelled and refunded (GHS)', 'Cancelled, money kept (orders)', 'Cancelled, money kept (GHS)',
  'Cancelled, no charge (orders)', 'Cancelled, no charge (GHS)',
];

/**
 * Sales by month: a row for each branch and month it was open, then All
 * branches when more than one is chosen. Ported from the review page's
 * `pageCsv`. Sales a day leaves today out, as on screen (Q12).
 */
export function salesByMonthCsv(res: Figures): Blob {
  const row = (name: string, m: string, a: Sums): Cell[] => {
    const day = perDay(a);
    return [
      text(name), m, a.days, a.orders, money(a.gross), money(a.discount), money(a.serviceCharge), money(a.platformCut), money(a.net),
      day == null ? '' : money(day), money(a.deliveryFee), money(a.cash), money(a.momo), money(a.card),
      a.refundedOrders, money(a.refundedAmount), a.keptOrders, money(a.keptAmount), a.noChargeOrders, money(a.noChargeAmount),
    ];
  };
  const lines: Cell[][] = [SALES_HEAD];
  for (const b of res.branches) {
    for (const m of res.months) {
      const a = res.cell[b.id][m];
      if (a.days) lines.push(row(b.name, m, a));
    }
  }
  if (res.branches.length > 1) {
    for (const m of res.months) {
      const a = res.total[m];
      if (a.days) lines.push(row('All branches', m, a));
    }
  }
  return csvFile(lines);
}

const TAKINGS_HEAD = [
  'Date', 'Branch', 'Paid orders', LABEL.method.cash, LABEL.method.mobile_money, LABEL.method.card, 'Net sales', 'Delivery fees',
  'Cancelled after payment (orders)',
];

/** Daily takings: the rows the screen shows, newest day first. A day the branch sold nothing reads as zeros. */
export function takingsCsv(res: Figures): Blob {
  const rows = takingsRows(res).sort((a, b) => b.day - a.day || a.place - b.place);
  return csvFile([TAKINGS_HEAD, ...rows.map(({ day, branch, sums }): Cell[] => {
    const a = sums;
    return [
      iso(day), text(branch.name), a ? a.orders : 0, money(a ? a.cash : 0), money(a ? a.momo : 0), money(a ? a.card : 0),
      money(a ? a.net : 0), money(a ? a.deliveryFee : 0), a ? lost(a) : 0,
    ];
  })]);
}

const CANCELLED_HEAD = ['Order', 'Placed', 'Branch', 'Channel', 'Paid by', 'Amount', 'What happened', 'Reason given'];

/** Cancelled after payment: the orders given, newest first. Placed reads `YYYY-MM-DD HH:mm`, as the server recorded it. */
export function cancelledCsv(res: Figures, orders: FinanceCancelledOrder[]): Blob {
  const branchOf = new Map(res.branches.map(b => [b.id, b.name]));
  const rows = [...orders].sort((a, b) => b.placed_at.localeCompare(a.placed_at));
  return csvFile([CANCELLED_HEAD, ...rows.map((c): Cell[] => [
    text(c.order_number), c.placed_at, text(branchOf.get(c.branch_id) ?? ''), LABEL.source[c.source] || c.source,
    LABEL.method[c.method] || c.method, money(c.amount), LABEL.outcome[c.outcome] || c.outcome, text(c.reason),
  ])]);
}
