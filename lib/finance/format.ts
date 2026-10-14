import { DOW, DOW3, MON, MONTH, ymd, type Day } from './figures';

/**
 * How the Finance figures are written out. The screens and the download both
 * use these, so a number reads the same on the page and on paper.
 *
 * Every date is read in UTC. Ghana is UTC all year, so a date never moves
 * with the machine's time zone.
 */

type Amount = number | null | undefined;

const round2 = (v: number): number => Math.round((v + Number.EPSILON) * 100) / 100;
const nf2 = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf1 = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });

/** An amount with two decimals and no currency, `1,250.00`. For a column whose heading names the currency. */
export const amt = (v: Amount): string => nf2.format(round2(v ?? 0) || 0);
/** An amount in cedis, `GHS 1,250.00`. */
export const ghs = (v: Amount): string => 'GHS ' + amt(v);
/** An amount in whole cedis, `GHS 1,250`. */
export const ghs0 = (v: Amount): string => 'GHS ' + nf0.format(Math.round(v ?? 0) || 0);
/** A whole number, `1,250`. */
export const int = (v: Amount): string => nf0.format(Math.round(v ?? 0) || 0);
/** A number with one decimal, `12.5`. For a count a day. */
export const one = (v: Amount): string => nf1.format(v ?? 0);
/** A share as a percentage, `12.5%`. Empty when there is none to show. */
export const pct = (v: Amount): string => (v == null || !isFinite(v) ? '' : nf1.format(v * 100) + '%');
/** A change as a percentage with its sign, `+12.5%`. */
export const signedPct = (v: number): string =>
  (v > 0.0005 ? '+' : v < -0.0005 ? '-' : '') + nf1.format(Math.abs(v * 100)) + '%';
/** A short figure for a chart's axis: `950`, `1.2k`, `12k`, `1.5m`. */
export const compact = (v: number): string =>
  v >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'm'
    : v >= 1000 ? (v / 1000).toFixed(v >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'k'
      : nf0.format(v);

/** The day, the month from 0, the year, and the weekday with Monday as 0. */
const dayParts = (t: Day): [number, number, number, number] => {
  const d = new Date(t);
  return [d.getUTCDate(), d.getUTCMonth(), d.getUTCFullYear(), (d.getUTCDay() + 6) % 7];
};

/** `14 October 2026`. */
export const longDate = (t: Day): string => { const [d, m, y] = dayParts(t); return `${d} ${MONTH[m]} ${y}`; };
/** `14 Oct 2026`. */
export const shortDate = (t: Day): string => { const [d, m, y] = dayParts(t); return `${d} ${MON[m]} ${y}`; };
/** `14 Oct`, for a chart's axis. */
export const dayShort = (t: Day): string => { const [d, m] = dayParts(t); return `${d} ${MON[m]}`; };
/** `14 October`. */
export const dayAndMonth = (t: Day): string => { const [d, m] = dayParts(t); return `${d} ${MONTH[m]}`; };
/** `Wednesday 14 October 2026`. */
export const weekdayDate = (t: Day): string => { const [d, m, y, w] = dayParts(t); return `${DOW[w]} ${d} ${MONTH[m]} ${y}`; };
/** `Wed 14 Oct 2026`, for a row in a table. */
export const rowDate = (t: Day): string => { const [d, m, y, w] = dayParts(t); return `${DOW3[w]} ${d} ${MON[m]} ${y}`; };

/** When an order was placed, from the server's `YYYY-MM-DD HH:mm`: `14 Oct 2026 at 14:28`. */
export const placedText = (s: string): string =>
  shortDate(ymd(s.slice(0, 10))) + (s.length >= 16 ? ` at ${s.slice(11, 16)}` : '');

/** A month, `YYYY-MM`, as `Oct`. */
export const monthShort = (m: string): string => MON[+m.slice(5) - 1];
/** A month as `Oct 2026`. */
export const monthLabel = (m: string): string => `${monthShort(m)} ${m.slice(0, 4)}`;
/** A month as `October 2026`. */
export const monthLong = (m: string): string => `${MONTH[+m.slice(5) - 1]} ${m.slice(0, 4)}`;
/** A month as `October`. */
export const monthName = (m: string): string => MONTH[+m.slice(5) - 1];

/** Two days as one span, saying the month and the year once where they are shared. */
export const rangeText = (from: Day, to: Day): string => {
  const [d0, m0, y0] = dayParts(from), [d1, m1, y1] = dayParts(to);
  if (from === to) return longDate(from);
  if (y0 !== y1) return `${longDate(from)} to ${longDate(to)}`;
  return m0 === m1 ? `${d0} to ${d1} ${MONTH[m1]} ${y1}` : `${d0} ${MONTH[m0]} to ${d1} ${MONTH[m1]} ${y1}`;
};

/** `Ashaiman, Lakeside and East Legon`. */
export const listAnd = (names: string[]): string =>
  (names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]);

/** `1 order`, `12 orders`. */
export const plural = (n: number, one: string, many?: string): string => `${int(n)} ${n === 1 ? one : many || one + 's'}`;

/**
 * When the server read the figures, from the ledger's `read_at`:
 * `14 October 2026 at 00:14`. Empty when the stamp cannot be read.
 */
export const readAtText = (readAt: string): string => {
  const t = Date.parse(readAt);
  if (Number.isNaN(t)) return '';
  const d = new Date(t);
  const two = (n: number): string => String(n).padStart(2, '0');
  return `${longDate(t)} at ${two(d.getUTCHours())}:${two(d.getUTCMinutes())}`;
};
