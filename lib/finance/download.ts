import { serverNow } from '@/lib/utils/serverClock';
import { cancelledIn, LABEL, monthOf, span, type FinanceBook, type Figures } from './figures';
import { listAnd, monthLabel, monthName, rangeText, shortDate } from './format';

/**
 * What the Finance download needs besides the figures: the PDF's sections,
 * the file names, and saving a file. The sheet, the PDF and the CSVs all use
 * these, so a file is named the same way wherever it is made.
 */

export type PdfSection =
  | 'summary' | 'grid' | 'stmt' | 'branches' | 'period' | 'pace' | 'since'
  | 'share' | 'bvb' | 'pay' | 'sold' | 'ledger' | 'cx';

/** Every section, in the order the PDF prints them. */
export const PDF_SECTIONS: PdfSection[] = [
  'summary', 'grid', 'stmt', 'branches', 'period', 'pace', 'since', 'share', 'bvb', 'pay', 'sold', 'ledger', 'cx',
];

/** The two long lists. A report leaves them out unless they are ticked. */
export const LONG_LISTS: PdfSection[] = ['ledger', 'cx'];
export const SHORT_REPORT: PdfSection[] = ['summary', 'grid', 'stmt'];
export const FULL_REPORT: PdfSection[] = PDF_SECTIONS.filter(k => !LONG_LISTS.includes(k));

/** The section's heading, as on screen. */
export function sectionTitle(book: FinanceBook, k: PdfSection): string {
  switch (k) {
    case 'summary': return 'Summary';
    case 'grid': return 'Month by month, branch by branch';
    case 'stmt': return 'Monthly statement';
    case 'branches': return 'A section for each branch';
    case 'period': return 'Period against period';
    case 'pace': return `${monthName(monthOf(book.lastFull))} so far and forecast`;
    case 'since': return 'Months since opening';
    case 'share': return 'Share of sales by branch';
    case 'bvb': return 'Branch against branch';
    case 'pay': return 'How customers paid';
    case 'sold': return 'What sold';
    case 'ledger': return 'Daily takings';
    case 'cx': return 'Cancelled after payment';
  }
}

/** Rows a page in the PDF's long lists. A page count from it is a guess, so it reads "about". */
export const ROWS_A_PAGE = 30;

export const aboutPages = (rows: number): string => {
  const n = Math.max(1, Math.ceil(rows / ROWS_A_PAGE));
  return `about ${n} ${n === 1 ? 'page' : 'pages'}`;
};

/** How many rows each long list holds: one for each day each branch was open, and one for each order. */
export function longListRows(book: FinanceBook, res: Figures): Record<'ledger' | 'cx', number> {
  return {
    ledger: res.branches.reduce((n, b) => n + span(Math.max(res.start, b.openDay), res.end), 0),
    cx: cancelledIn(book, res).length,
  };
}

/** The chosen branches, as a file name or a line says them. */
const whoText = (book: FinanceBook, res: Figures): string =>
  (res.branches.length === book.branches.length && res.branches.length > 1 ? 'all branches' : listAnd(res.branches.map(b => b.name)));

/** The page filters in one line: `all branches, 4 May to 14 October 2026, MoMo`. */
export function filtersText(book: FinanceBook, res: Figures): string {
  const f = res.filters;
  const bits = [whoText(book, res), rangeText(res.start, res.end)];
  if (f.source !== 'all') bits.push(LABEL.source[f.source] || f.source);
  if (f.type !== 'all') bits.push(LABEL.type[f.type] || f.type);
  if (f.method !== 'all') bits.push(LABEL.method[f.method] || f.method);
  return bits.join(', ');
}

/**
 * `CediBites sales report, all branches, May 2026 to Oct 2026, made 14 Oct 2026.pdf`.
 * The day it was made comes from the server's clock, so two downloads on
 * different days never share a name.
 */
export function fileName(book: FinanceBook, res: Figures, what: string, ext: 'pdf' | 'csv'): string {
  const a = res.months[0], b = res.months[res.months.length - 1];
  const months = a === b ? monthLabel(a) : `${monthLabel(a)} to ${monthLabel(b)}`;
  return `CediBites ${what}, ${whoText(book, res)}, ${months}, made ${shortDate(serverNow().getTime())}.${ext}`;
}

/** Hands a file to the browser to save, as an ordinary download link. */
export function saveFile(filename: string, data: Blob): void {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
