import type { FinanceCancelledOrder, FinanceLedger } from '@/types/finance';
import { receiptName } from '../utils/receiptName.mjs';

/**
 * The Finance figures. Every number on the Finance screens and in the
 * download is worked out here, from the rows of one ledger read
 * (`useFinanceLedger`).
 *
 * Pure functions: no DOM and no machine clock. "Today" is the ledger's own
 * `today`, which the server set, so a till with a wrong clock reads the same
 * figures as every other one.
 *
 * Three rules hold everywhere below.
 *
 * - Net sales never holds the delivery fee.
 * - Change compares sales a day, never monthly totals, so a part month does
 *   not read as a fall.
 * - Totals are live and include today. Sales a day counts complete days only,
 *   and so do "so far" and the forecast, which stop at yesterday.
 */

/**
 * A day, as UTC midnight in milliseconds. Ghana is UTC all year, so a day
 * never moves with the machine's time zone. `ymd` makes one from
 * `YYYY-MM-DD` and `iso` turns it back.
 */
export type Day = number;

export const DAY = 86400000;
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DOW = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DOW3 = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** What the stored values are called on screen. A value with no entry shows as it is stored. */
export const LABEL: Record<'source' | 'type' | 'method' | 'outcome', Record<string, string>> = {
  source: { pos: 'At the till', online: 'Online', whatsapp: 'WhatsApp', manual_entry: 'Entered by hand' },
  type: { dine_in: 'Dine in', takeaway: 'Takeaway', pickup: 'Pickup', delivery: 'Delivery' },
  method: { cash: 'Cash', mobile_money: 'MoMo', card: 'Card', no_charge: 'No charge' },
  outcome: { refunded: 'Refunded', kept: 'Money kept', no_charge: 'No charge' },
};

/** The name of a line whose option was not recorded, so the dish cannot be told. */
export const UNNAMED_LINE = 'Dish not recorded';
const NO_CATEGORY = 'Uncategorised';

/** The sums for a branch over a set of days: one day, one month, any range. */
export interface Sums {
  /** Days the branch was open in the range, today included. */
  days: number;
  /** 1 when the range holds today, which is not over yet. Otherwise 0. */
  partDays: number;
  /** Paid orders. */
  orders: number;
  gross: number;
  discount: number;
  serviceCharge: number;
  /** Net sales: `total_amount - delivery_fee`. */
  net: number;
  deliveryFee: number;
  /** Net sales taken in cash, by MoMo and by card. Any other method counts in `net` alone. */
  cash: number;
  momo: number;
  card: number;
  cashOrders: number;
  momoOrders: number;
  cardOrders: number;
  /** Orders cancelled after payment, by what became of the money. None of them is in `net`. */
  refundedOrders: number;
  refundedAmount: number;
  keptOrders: number;
  keptAmount: number;
  noChargeOrders: number;
  noChargeAmount: number;
  /** Today's net sales, when the range holds today. Left out of every sales a day figure. */
  partNet: number;
  /** Net sales by where the order came from, and by how it was served. */
  bySource: Record<string, number>;
  byType: Record<string, number>;
  ordersBySource: Record<string, number>;
  ordersByType: Record<string, number>;
}

type GroupKey = 'bySource' | 'byType' | 'ordersBySource' | 'ordersByType';
type SumKey = Exclude<keyof Sums, GroupKey | 'days' | 'partDays'>;

const SUMS: SumKey[] = [
  'orders', 'gross', 'discount', 'serviceCharge', 'net', 'deliveryFee',
  'cash', 'momo', 'card', 'cashOrders', 'momoOrders', 'cardOrders',
  'refundedOrders', 'refundedAmount', 'keptOrders', 'keptAmount', 'noChargeOrders', 'noChargeAmount',
  'partNet',
];
const GROUPS: GroupKey[] = ['bySource', 'byType', 'ordersBySource', 'ordersByType'];

/** Which sales count: a source, a type and a payment method, each of them or `'all'`. */
export interface ChannelFilters {
  /** `'all'` or one branch id. */
  branch: 'all' | number | string;
  source: string;
  type: string;
  method: string;
}

/** The channel filters with a span of months, each `YYYY-MM`. */
export interface FigureFilters extends ChannelFilters {
  from: string;
  to: string;
}

/** A branch that has sold. Its opening day is the day of its first paid order. */
export interface BookBranch {
  id: number;
  name: string;
  /** `YYYY-MM-DD`. */
  opened: string;
  openDay: Day;
}

/** What a line on an order is called, with its menu category. */
export interface ItemLine {
  name: string;
  category: string;
}

/** Branch id, then `YYYY-MM-DD`, then that day's sums. A day with no sale has no entry. */
export type DayMap = Record<number, Record<string, Sums>>;

/**
 * A ledger made ready for figures. Build it once for each ledger read, with
 * `openBook`, and hand it to every function below.
 */
export interface FinanceBook {
  ledger: FinanceLedger;
  /** Branches that have sold, in the endpoint's order. A branch that never sold has no figures and is left out. */
  branches: BookBranch[];
  /** Every month from the first sale to `end`, each `YYYY-MM`. */
  months: string[];
  /** The server's date. */
  today: Day;
  /** The last day counted. It never passes `today`. */
  end: Day;
  /** The last complete day: `end`, or yesterday when `end` is today. */
  lastFull: Day;
  /** Each distinct name and category sold. Items are counted by their place in this list. */
  lines: ItemLine[];
  /** Option id to its place in `lines`. */
  lineOf: Map<number, number>;
  /** One day map for each set of channel filters asked for so far. */
  dayMaps: Map<string, DayMap>;
}

export const ymd = (s: string): Day => {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
export const iso = (t: Day): string => new Date(t).toISOString().slice(0, 10);
export const monthOf = (t: Day): string => iso(t).slice(0, 7);
export const monthStart = (m: string): Day => ymd(m + '-01');
export const monthEnd = (m: string): Day => {
  const [y, mo] = m.split('-').map(Number);
  return Date.UTC(y, mo, 0);
};
export const monthDays = (m: string): number => Math.round((monthEnd(m) - monthStart(m)) / DAY) + 1;
export const monthBefore = (m: string): string => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 2, 1)).toISOString().slice(0, 7);
};
const monthAfter = (m: string): string => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 7);
};
/** Days from `a` to `b`, both counted. 0 when `b` comes first. */
export const span = (a: Day, b: Day): number => (b < a ? 0 : Math.round((b - a) / DAY) + 1);
/** The day the earliest of these branches opened. */
export const openFrom = (branches: BookBranch[]): Day => Math.min(...branches.map(b => b.openDay));
/** Days in month `m` on which at least one of these branches was open. */
export const daysOpen = (book: FinanceBook, branches: BookBranch[], m: string): number =>
  span(Math.max(monthStart(m), openFrom(branches)), Math.min(monthEnd(m), book.end));

const blank = (): Sums => ({
  days: 0, partDays: 0,
  orders: 0, gross: 0, discount: 0, serviceCharge: 0, net: 0, deliveryFee: 0,
  cash: 0, momo: 0, card: 0, cashOrders: 0, momoOrders: 0, cardOrders: 0,
  refundedOrders: 0, refundedAmount: 0, keptOrders: 0, keptAmount: 0, noChargeOrders: 0, noChargeAmount: 0,
  partNet: 0,
  bySource: {}, byType: {}, ordersBySource: {}, ordersByType: {},
});
/** Adds every sum of `a` into `t`. The day counts are left to the caller: branches open on the same day share it. */
const addInto = (t: Sums, a: Sums): void => {
  for (const k of SUMS) t[k] += a[k];
  for (const g of GROUPS) for (const k in a[g]) t[g][k] = (t[g][k] || 0) + a[g][k];
};

/** Net sales a day, over complete days only. Null when there is no complete day. */
export const perDay = (a: Sums | null | undefined): number | null => {
  if (!a) return null;
  const full = a.days - a.partDays;
  return full > 0 ? (a.net - a.partNet) / full : null;
};
/** The change in sales a day from `previous` to `current`, as a fraction. */
export const change = (current: Sums, previous: Sums): number | null => {
  const a = perDay(current), b = perDay(previous);
  return a != null && b ? a / b - 1 : null;
};
/** A month with under nine tenths of its days counted. */
export const isPart = (a: Sums, m: string): boolean => a.days > 0 && a.days < monthDays(m) * 0.9;
/** Orders cancelled after payment. */
export const lost = (a: Sums): number => a.refundedOrders + a.keptOrders + a.noChargeOrders;

export const pickBranches = (book: FinanceBook, branch: ChannelFilters['branch']): BookBranch[] =>
  (branch === 'all' ? book.branches : book.branches.filter(b => String(b.id) === String(branch)));

const matcher = (f: ChannelFilters) => (source: string, type: string, method: string): boolean =>
  (f.source === 'all' || source === f.source) && (f.type === 'all' || type === f.type) && (f.method === 'all' || method === f.method);

/**
 * Makes a ledger ready for figures.
 *
 * Hand it the whole ledger, read with no `from`. A day the endpoint left out
 * would read here as a day the branch was open and sold nothing.
 *
 * `end` is the last day to count, `YYYY-MM-DD`. Left out, it is today, since
 * the figures are live. Pass it when the ledger was read with a `to`, or to
 * see the figures as they stood on an earlier day.
 *
 * Only the sales and the cancelled orders are cut at `end`. Item rows come by
 * the month, so `compute` and `itemTable` count every line of the month `end`
 * falls in. To cut the items at a day, read the ledger with that day as `to`.
 */
export function openBook(ledger: FinanceLedger, options: { end?: string } = {}): FinanceBook {
  const today = ymd(ledger.today);
  const end = options.end ? Math.min(ymd(options.end), today) : today;
  const lastFull = Math.min(end, today - DAY);

  const branches: BookBranch[] = [];
  for (const b of ledger.branches) {
    if (b.first_sale) branches.push({ id: b.id, name: b.name, opened: b.first_sale, openDay: ymd(b.first_sale) });
  }

  const months: string[] = [];
  if (branches.length) {
    const last = monthOf(end);
    for (let m = monthOf(openFrom(branches)); m <= last; m = monthAfter(m)) months.push(m);
  }

  /* Lines that come out with the same name and category are one line. */
  const lines: ItemLine[] = [];
  const lineOf = new Map<number, number>();
  const seen = new Map<string, number>();
  for (const row of ledger.items) {
    const optionId = row[5];
    if (lineOf.has(optionId)) continue;
    const option = ledger.options[String(optionId)];
    const name = (option && receiptName(option.item, option.display_name || option.label)) || UNNAMED_LINE;
    const category = (option && option.category) || NO_CATEGORY;
    const key = category + '\u0000' + name;
    let line = seen.get(key);
    if (line === undefined) {
      line = lines.length;
      lines.push({ name, category });
      seen.set(key, line);
    }
    lineOf.set(optionId, line);
  }

  return { ledger, branches, months, today, end, lastFull, lines, lineOf, dayMaps: new Map() };
}

/** One map for each set of channel filters: branch, then day, then the day's sums. */
export function dayMap(book: FinanceBook, source: string, type: string, method: string): DayMap {
  const key = source + '|' + type + '|' + method;
  const made = book.dayMaps.get(key);
  if (made) return made;
  const ok = matcher({ branch: 'all', source, type, method });
  const days: DayMap = {};
  for (const b of book.branches) days[b.id] = {};
  const at = (branch: number, day: string): Sums | null => {
    const ofBranch = days[branch];
    return ofBranch ? ofBranch[day] || (ofBranch[day] = blank()) : null;
  };
  for (const [day, branch, s, t, p, orders, gross, discount, serviceCharge, net, deliveryFee] of book.ledger.sales) {
    if (!ok(s, t, p)) continue;
    const a = at(branch, day);
    if (!a) continue;
    a.orders += orders; a.gross += gross; a.discount += discount; a.serviceCharge += serviceCharge; a.net += net; a.deliveryFee += deliveryFee;
    if (p === 'cash') { a.cash += net; a.cashOrders += orders; }
    else if (p === 'mobile_money') { a.momo += net; a.momoOrders += orders; }
    else if (p === 'card') { a.card += net; a.cardOrders += orders; }
    a.bySource[s] = (a.bySource[s] || 0) + net; a.ordersBySource[s] = (a.ordersBySource[s] || 0) + orders;
    a.byType[t] = (a.byType[t] || 0) + net; a.ordersByType[t] = (a.ordersByType[t] || 0) + orders;
  }
  for (const c of book.ledger.cancelled) {
    if (!ok(c.source, c.type, c.method)) continue;
    const a = at(c.branch_id, c.placed_at.slice(0, 10));
    if (!a) continue;
    if (c.outcome === 'refunded') { a.refundedOrders += 1; a.refundedAmount += c.amount; }
    else if (c.outcome === 'kept') { a.keptOrders += 1; a.keptAmount += c.amount; }
    else if (c.outcome === 'no_charge') { a.noChargeOrders += 1; a.noChargeAmount += c.amount; }
  }
  book.dayMaps.set(key, days);
  return days;
}

/** A branch's sums from `from` to `to`, counting only the days it was open, up to the book's end. */
export function sumRange(book: FinanceBook, days: DayMap, branch: BookBranch, from: Day, to: Day): Sums {
  const a = blank();
  for (let t = Math.max(from, branch.openDay), e = Math.min(to, book.end); t <= e; t += DAY) {
    const x = days[branch.id][iso(t)];
    if (x) addInto(a, x);
    a.days++;
    if (t === book.today) {
      a.partDays++;
      if (x) a.partNet += x.net;
    }
  }
  return a;
}

/** Several branches as one. `days` is the days any of them was open, not the sum of each one's. */
function sumBranches(list: Sums[], days: number): Sums {
  const t = blank();
  for (const a of list) addInto(t, a);
  t.days = days;
  t.partDays = list.some(a => a.partDays > 0) ? 1 : 0;
  return t;
}

export interface ItemSum {
  quantity: number;
  sales: number;
}

/** A line's sales at one branch, with each month's share. */
export interface ItemMonths extends ItemSum {
  by: Record<string, ItemSum>;
}

/** A line's sales across branches, with each branch's share. `line` is its place in the book's `lines`. */
export interface ItemRow extends ItemSum, ItemLine {
  line: number;
  by: Record<number, ItemSum>;
}

export interface Figures {
  filters: FigureFilters;
  branches: BookBranch[];
  months: string[];
  /** Branch id, then month. */
  cell: Record<number, Record<string, Sums>>;
  /** Month, all chosen branches together. */
  total: Record<string, Sums>;
  /** Branch id, all chosen months together. */
  branchTotal: Record<number, Sums>;
  grand: Sums;
  days: DayMap;
  /** The first and last day the chosen months cover. */
  start: Day;
  end: Day;
  /** Branch id, then line, then month. */
  items: Record<number, Record<number, ItemMonths>>;
}

/** The chosen branches over the chosen months: the grid, its totals and what sold. */
export function compute(book: FinanceBook, filters: FigureFilters): Figures {
  const branches = pickBranches(book, filters.branch);
  const days = dayMap(book, filters.source, filters.type, filters.method);
  const months = book.months.filter(m => m >= filters.from && m <= filters.to);
  const cell: Figures['cell'] = {};
  for (const b of branches) {
    cell[b.id] = {};
    for (const m of months) cell[b.id][m] = sumRange(book, days, b, monthStart(m), monthEnd(m));
  }
  const total: Figures['total'] = {};
  for (const m of months) total[m] = sumBranches(branches.map(b => cell[b.id][m]), daysOpen(book, branches, m));
  const branchTotal: Figures['branchTotal'] = {};
  for (const b of branches) {
    const t = blank();
    for (const m of months) { addInto(t, cell[b.id][m]); t.days += cell[b.id][m].days; t.partDays += cell[b.id][m].partDays; }
    branchTotal[b.id] = t;
  }
  const grand = blank();
  for (const m of months) { addInto(grand, total[m]); grand.days += total[m].days; grand.partDays += total[m].partDays; }
  /* With no month or no branch chosen there is no first day. `start` falls back to the book's end, so a screen can still format it. */
  const start = months.length && branches.length ? Math.max(monthStart(months[0]), openFrom(branches)) : book.end;
  const end = months.length ? Math.min(monthEnd(months[months.length - 1]), book.end) : book.end;

  /* Items: branch, then line, then month. */
  const ids = new Set(branches.map(b => b.id));
  const ok = matcher(filters);
  const items: Figures['items'] = {};
  for (const [m, b, s, t, p, optionId, quantity, sales] of book.ledger.items) {
    if (!ids.has(b) || m < filters.from || m > filters.to || !ok(s, t, p)) continue;
    const line = book.lineOf.get(optionId) as number;
    const ofBranch = (items[b] = items[b] || {});
    const it = (ofBranch[line] = ofBranch[line] || { quantity: 0, sales: 0, by: {} });
    it.quantity += quantity; it.sales += sales;
    const x = (it.by[m] = it.by[m] || { quantity: 0, sales: 0 });
    x.quantity += quantity; x.sales += sales;
  }
  return { filters: { ...filters }, branches, months, cell, total, branchTotal, grand, days, start, end, items };
}

/**
 * The orders cancelled after payment that `res` counts: at its branches, on a
 * day each one was open in its span, through its channel filters. A list made
 * from this always agrees with the counts in `res`. An order placed before its
 * branch's first sale, or at a branch that never sold, is in neither.
 */
export function cancelledIn(book: FinanceBook, res: Figures): FinanceCancelledOrder[] {
  const ok = matcher(res.filters);
  const from = new Map(res.branches.map(b => [b.id, Math.max(res.start, b.openDay)]));
  return book.ledger.cancelled.filter(c => {
    const first = from.get(c.branch_id);
    if (first === undefined || !ok(c.source, c.type, c.method)) return false;
    const t = ymd(c.placed_at.slice(0, 10));
    return t >= first && t <= res.end;
  });
}

/** Average net sales for each day of the week, Monday first, over complete days. */
export function weekday(book: FinanceBook, res: Figures, branch: BookBranch): { average: number | null; days: number }[] {
  const sum = new Array<number>(7).fill(0), count = new Array<number>(7).fill(0);
  for (let t = Math.max(res.start, branch.openDay), e = Math.min(res.end, book.lastFull); t <= e; t += DAY) {
    const i = (new Date(t).getUTCDay() + 6) % 7;
    const x = res.days[branch.id][iso(t)];
    count[i]++; sum[i] += x ? x.net : 0;
  }
  return sum.map((v, i) => ({ average: count[i] ? v / count[i] : null, days: count[i] }));
}

export interface DailyPoint {
  day: Day;
  net: number;
  orders: number;
  /** The average of the last seven complete days. Null on a day that is not over. */
  average: number | null;
  /** True for today, whose sales are still coming in. */
  part: boolean;
}

/** Every open day for a branch, with a trailing seven day average that looks back past the window. */
export function dailySeries(book: FinanceBook, res: Figures, branch: BookBranch): DailyPoint[] {
  const points: DailyPoint[] = [], last: number[] = [];
  for (let t = branch.openDay; t <= res.end; t += DAY) {
    const x = res.days[branch.id][iso(t)];
    const net = x ? x.net : 0;
    const part = t === book.today;
    if (!part) { last.push(net); if (last.length > 7) last.shift(); }
    if (t >= res.start) {
      points.push({ day: t, net, orders: x ? x.orders : 0, average: part ? null : last.reduce((p, q) => p + q, 0) / last.length, part });
    }
  }
  return points;
}

/** The chosen month with the highest net sales. */
export function bestMonth(res: Figures): { month: string; net: number } | null {
  let best: { month: string; net: number } | null = null;
  for (const m of res.months) {
    const t = res.total[m];
    if (t.net > 0 && (!best || t.net > best.net)) best = { month: m, net: t.net };
  }
  return best;
}

export interface Periods {
  /** Each branch open in either range: `a` for the first range, `b` for the second. */
  rows: { branch: BookBranch; a: Sums; b: Sums }[];
  all: { a: Sums; b: Sums };
}

/** Any two date ranges, branch by branch. */
export function periods(book: FinanceBook, filters: ChannelFilters, A: [Day, Day], B: [Day, Day]): Periods {
  const branches = pickBranches(book, filters.branch);
  const days = dayMap(book, filters.source, filters.type, filters.method);
  const rows = branches
    .map(branch => ({ branch, a: sumRange(book, days, branch, A[0], A[1]), b: sumRange(book, days, branch, B[0], B[1]) }))
    .filter(r => r.a.days || r.b.days);
  const first = openFrom(branches);
  const a = sumBranches(rows.map(r => r.a), span(Math.max(A[0], first), Math.min(A[1], book.end)));
  const b = sumBranches(rows.map(r => r.b), span(Math.max(B[0], first), Math.min(B[1], book.end)));
  return { rows, all: { a, b } };
}

export interface PaceRow {
  /** Null on the row for all branches together. */
  branch: BookBranch | null;
  /** The month so far, up to the last complete day. */
  soFar: Sums;
  /** The same days of the month before. */
  sameDays: Sums;
  /** The whole of the month before. */
  monthBefore: Sums;
  /** So far, plus sales a day for each day left. */
  forecast: number;
  /** Sales a day so far against the same days of the month before. */
  change: number | null;
  /** The forecast against the whole of the month before. */
  vsMonthBefore: number | null;
}

export interface Pace {
  month: string;
  monthBefore: string;
  /** Complete days of the month so far, and days still to come, today among them. */
  daysIn: number;
  daysLeft: number;
  rows: PaceRow[];
  all: PaceRow;
}

/** The month the complete days end in, so far, against the same days and the whole of the month before. */
export function pace(book: FinanceBook, filters: ChannelFilters): Pace {
  const end = book.lastFull;
  const month = monthOf(end), before = monthBefore(month);
  const daysIn = Math.round((end - monthStart(month)) / DAY) + 1;
  const daysLeft = Math.round((monthEnd(month) - end) / DAY);
  const days = dayMap(book, filters.source, filters.type, filters.method);
  const sameEnd = Math.min(monthStart(before) + (daysIn - 1) * DAY, monthEnd(before));
  const withForecast = (r: Pick<PaceRow, 'branch' | 'soFar' | 'sameDays' | 'monthBefore'>): PaceRow => {
    const forecast = r.soFar.net + (perDay(r.soFar) || 0) * daysLeft;
    return { ...r, forecast, change: change(r.soFar, r.sameDays), vsMonthBefore: r.monthBefore.net ? forecast / r.monthBefore.net - 1 : null };
  };
  const rows = pickBranches(book, filters.branch).filter(b => b.openDay <= end).map(b => withForecast({
    branch: b,
    soFar: sumRange(book, days, b, monthStart(month), end),
    sameDays: sumRange(book, days, b, monthStart(before), sameEnd),
    monthBefore: sumRange(book, days, b, monthStart(before), monthEnd(before)),
  }));
  const first = openFrom(rows.map(r => r.branch as BookBranch));
  const all = withForecast({
    branch: null,
    soFar: sumBranches(rows.map(r => r.soFar), span(Math.max(monthStart(month), first), end)),
    sameDays: sumBranches(rows.map(r => r.sameDays), span(Math.max(monthStart(before), first), sameEnd)),
    monthBefore: sumBranches(rows.map(r => r.monthBefore), span(Math.max(monthStart(before), first), monthEnd(before))),
  });
  return { month, monthBefore: before, daysIn, daysLeft, rows, all };
}

/** Each branch's own first, second, third month. */
export function since(book: FinanceBook, filters: ChannelFilters): { branch: BookBranch; months: { month: string; sums: Sums }[] }[] {
  const days = dayMap(book, filters.source, filters.type, filters.method);
  return pickBranches(book, filters.branch).map(branch => {
    const months: { month: string; sums: Sums }[] = [];
    for (const m of book.months) {
      if (m < branch.opened.slice(0, 7)) continue;
      months.push({ month: m, sums: sumRange(book, days, branch, monthStart(m), monthEnd(m)) });
    }
    return { branch, months };
  });
}

export interface Versus {
  start: Day;
  end: Day;
  rows: { branch: BookBranch; sums: Sums }[];
}

/** Branches side by side. With `commonOnly`, only from the day the last of them opened. */
export function versus(book: FinanceBook, filters: ChannelFilters, ids: number[], commonOnly: boolean, from: Day, to: Day): Versus {
  const branches = book.branches.filter(b => ids.includes(b.id));
  const days = dayMap(book, filters.source, filters.type, filters.method);
  const start = commonOnly ? Math.max(from, ...branches.map(b => b.openDay)) : from;
  return { start, end: to, rows: branches.map(branch => ({ branch, sums: sumRange(book, days, branch, start, to) })) };
}

/** What sold at these branches between two months, each line with its category. */
export function itemTable(book: FinanceBook, filters: ChannelFilters, ids: number[], from: string, to: string): ItemRow[] {
  const ok = matcher(filters);
  const out: Record<number, ItemRow> = {};
  for (const [m, b, s, t, p, optionId, quantity, sales] of book.ledger.items) {
    if (!ids.includes(b) || m < from || m > to || !ok(s, t, p)) continue;
    const line = book.lineOf.get(optionId) as number;
    const r = (out[line] = out[line] || { line, ...book.lines[line], by: {}, quantity: 0, sales: 0 });
    const x = (r.by[b] = r.by[b] || { quantity: 0, sales: 0 });
    x.quantity += quantity; x.sales += sales; r.quantity += quantity; r.sales += sales;
  }
  return Object.values(out);
}

/** Two date ranges to set side by side: `A` the later, `B` the earlier. */
export interface PeriodRanges { A: [Day, Day]; B: [Day, Day] }

/**
 * The month so far against the same days of the month before, and the last
 * full month against the one before it. Both end at the last complete day
 * (D11). On the 1st, the month so far is the month before, whole (Q15).
 */
export function periodPresets(book: FinanceBook): { mtd: PeriodRanges; full: PeriodRanges; month: string } {
  const end = book.lastFull;
  const month = monthOf(end), before = monthBefore(month);
  const days = span(monthStart(month), end);
  const mtd: PeriodRanges = {
    A: [monthStart(month), end],
    B: [monthStart(before), Math.min(monthStart(before) + (days - 1) * DAY, monthEnd(before))],
  };
  const last = end === monthEnd(month) ? month : before, earlier = monthBefore(last);
  const full: PeriodRanges = { A: [monthStart(last), monthEnd(last)], B: [monthStart(earlier), monthEnd(earlier)] };
  return { mtd, full, month };
}
