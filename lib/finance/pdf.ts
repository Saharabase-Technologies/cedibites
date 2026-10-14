import type { jsPDF } from 'jspdf';
import type { CellHookData, CellInput, RowInput, Styles, UserOptions } from 'jspdf-autotable';
import { NO_BRANCH_COLOUR } from './branchColours';
import { PDF_SECTIONS, type PdfSection } from './download';
import { FACTORS } from './factors';
import {
  cancelledIn, change, compute, DAY, DOW, iso, isPart, lost, monthOf, pace, perDay, periodPresets, periods, since, versus, itemTable, weekday,
  bestMonth, UNNAMED_LINE, LABEL, type BookBranch, type FinanceBook, type Figures, type Sums,
} from './figures';
import {
  amt, compact, int, listAnd, longDate, monthLabel, monthLong, monthName, monthNote, monthShort, partReasons, pct, placedText, plural,
  rangeText, readAtText, rowDate, signedPct,
} from './format';
import { niceTicks } from '@/app/components/finance/charts/scale';

/**
 * The Finance PDF, ported from the review page's `buildPdf`. A4, wide pages,
 * drawn with jsPDF and autotable: vector charts, tables whose headers repeat
 * on each page, a running header and footer with "Page x of y", and the notes
 * on the last page (D5, D20).
 *
 * It reads nothing itself. The figures, the sections, the font and the time
 * it was made all come in as arguments, so a script can build one from made
 * up figures with no browser. jsPDF and autotable load only when it runs.
 *
 * The font is a Noto Sans subset that holds only the characters the review
 * page wrote. Free text from the records goes through `plain` first.
 */

export interface PdfInput {
  book: FinanceBook;
  figures: Figures;
  /** Branch id to its series colour, from `branchColours`. */
  colours: Record<number, string>;
  sections: PdfSection[];
  fonts: { regular: Uint8Array; bold: Uint8Array };
  /** When it was made, from `serverNow()`. */
  madeAt: number;
}

type RGB = [number, number, number];

const rgb = (hex: string): RGB => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const fade = (c: RGB, f: number): RGB => c.map(v => Math.round(v + (255 - v) * f)) as RGB;

const C = {
  ink: [36, 36, 36] as RGB,
  strong: [55, 43, 30] as RGB,
  muted: [111, 99, 83] as RGB,
  line: [230, 220, 200] as RGB,
  head: [245, 239, 226] as RGB,
  foot: [251, 246, 237] as RGB,
  card: [255, 251, 243] as RGB,
  gold: [228, 153, 37] as RGB,
  up: [4, 120, 87] as RGB,
  down: [190, 18, 60] as RGB,
  grid: [236, 227, 209] as RGB,
  white: [255, 255, 255] as RGB,
  /** The strongest figure in Branch against branch (D13). */
  best: rgb('#9a6410'),
};

const PW = 297, PH = 210, ML = 14, MR = 14, TOP = 22, BOT = 17, CW = PW - ML - MR;
const TITLE = 'Sales by branch, month by month';

/** Curly quotes, dashes and accents the font subset may not hold, made plain. */
const plain = (s: string): string => s
  .replace(/[\u2018\u2019]/g, '\'')
  .replace(/[\u201C\u201D]/g, '"')
  .replace(/[\u2013\u2014]/g, '-')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\x20-\x7E\n]/g, '');

const base64 = (bytes: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

const cnt = (v: number, n: number): string => (n ? `${amt(v)} (${int(n)})` : amt(v));

interface TableOptions {
  startY: number;
  head: RowInput[];
  body: RowInput[];
  foot?: RowInput[];
  fontSize?: number;
  /** Columns whose figures sit to the right. */
  numeric?: number[];
  /** Columns that hold a signed change, coloured by its sign. */
  change?: number[];
  /** Body cells, as `row,column`, that hold the strongest figure. */
  best?: Set<string>;
  margin?: { left?: number; right?: number };
  tableWidth?: number | 'auto';
  columnStyles?: Record<number, Partial<Styles>>;
}

/** Builds the PDF. Returns the document; the caller asks it for a blob. */
export async function buildPdf({ book, figures: res, colours, sections, fonts, madeAt }: PdfInput): Promise<jsPDF> {
  if (!res.branches.length) throw new Error('there are no sales to report for these filters');
  const [{ jsPDF: JsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const on = new Set(PDF_SECTIONS.filter(k => sections.includes(k)));
  const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  doc.addFileToVFS('NotoSans-Regular.ttf', base64(fonts.regular));
  doc.addFont('NotoSans-Regular.ttf', 'Noto', 'normal');
  doc.addFileToVFS('NotoSans-Bold.ttf', base64(fonts.bold));
  doc.addFont('NotoSans-Bold.ttf', 'Noto', 'bold');

  const bs = res.branches, multi = bs.length > 1, g = res.grand;
  const name = (b: BookBranch): string => plain(b.name);
  const hex = (id: number): RGB => rgb(colours[id] || NO_BRANCH_COLOUR);
  const period = rangeText(res.start, res.end);
  const readAt = readAtText(book.ledger.read_at);
  const monthText = (m: string): string => { const n = monthNote(book, res, m); return monthLabel(m) + (n ? '\n' + n : ''); };
  let y = 0, count = 0;

  const font = (size: number, style: 'normal' | 'bold' = 'normal', color: RGB = C.ink) => {
    doc.setFont('Noto', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  function table(o: TableOptions): number {
    const numeric = new Set(o.numeric || []), signed = new Set(o.change || []);
    const options: UserOptions = {
      startY: o.startY,
      head: o.head,
      body: o.body,
      foot: o.foot,
      theme: 'plain',
      margin: { left: ML, right: MR, top: TOP + 2, bottom: BOT, ...o.margin },
      tableWidth: o.tableWidth || 'auto',
      styles: { font: 'Noto', fontSize: o.fontSize || 8, textColor: C.ink, cellPadding: { top: 1.5, bottom: 1.5, left: 1.6, right: 1.6 }, lineColor: C.line, lineWidth: { bottom: 0.15 }, valign: 'middle', overflow: 'linebreak' },
      headStyles: { fillColor: C.head, textColor: C.strong, fontStyle: 'bold', lineWidth: 0, valign: 'bottom' },
      footStyles: { fillColor: C.foot, textColor: C.ink, fontStyle: 'bold', lineWidth: { top: 0.3 }, lineColor: C.strong },
      showHead: 'everyPage',
      showFoot: 'lastPage',
      rowPageBreak: 'avoid',
      columnStyles: o.columnStyles || {},
      didParseCell: (d: CellHookData) => {
        if (numeric.has(d.column.index) && !(d.cell.colSpan > 1)) d.cell.styles.halign = 'right';
        if (d.section !== 'body') return;
        const t = typeof d.cell.raw === 'string' ? d.cell.raw : '';
        if (signed.has(d.column.index)) {
          if (t.startsWith('+')) d.cell.styles.textColor = C.up;
          else if (t.startsWith('-')) d.cell.styles.textColor = C.down;
        }
        if (t === 'Not yet') d.cell.styles.textColor = C.muted;
        if (o.best?.has(`${d.row.index},${d.column.index}`)) {
          d.cell.styles.fontStyle = 'bold';
          d.cell.styles.textColor = C.best;
        }
      },
    };
    autoTable(doc, options);
    return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  }

  const notOpen = (span: number) => ({ content: 'Not open yet', colSpan: span, styles: { halign: 'center' as const, textColor: C.muted } });
  const room = (yy: number, need: number): number => {
    if (yy + need > PH - BOT) { doc.addPage(); return TOP + 6; }
    return yy;
  };

  function section(title: string, sub?: string) {
    if (count++ > 0 || y > 60) { doc.addPage(); y = TOP + 6; }
    font(14, 'bold');
    doc.text(title, ML, y);
    if (sub) {
      const wrapped = doc.splitTextToSize(sub, CW) as string[];
      font(8.5, 'normal', C.muted);
      doc.text(wrapped, ML, y + 5.5);
      y += 5.5 + 4 * (wrapped.length - 1);
    }
    y += 5;
  }

  function sub(title: string, note?: string) {
    font(10.5, 'bold');
    doc.text(title, ML, y);
    if (note) { font(8, 'normal', C.muted); doc.text(note, ML, y + 4.6); y += 4.6; }
    y += 3;
  }

  /** A legend in ink, each name after its colour, set flush right. */
  function legendRight(list: { name: string; color: RGB }[], xr: number, yy: number) {
    font(8);
    let x = xr;
    for (const it of list.slice().reverse()) {
      x -= doc.getTextWidth(it.name);
      doc.text(it.name, x, yy);
      x -= 4.2;
      doc.setFillColor(...it.color);
      doc.roundedRect(x, yy - 2.6, 2.8, 2.8, 0.6, 0.6, 'F');
      x -= 6;
    }
  }

  function axes(x: number, yy: number, w: number, ph: number, max: number): (v: number) => number {
    const ticks = niceTicks(max), top = ticks[ticks.length - 1] || 1;
    const Y = (v: number) => yy + ph - (v / top) * ph;
    doc.setLineWidth(0.15);
    for (const v of ticks) {
      doc.setDrawColor(...C.grid);
      if (v > 0) doc.line(x, Y(v), x + w, Y(v));
      font(7, 'normal', C.muted);
      doc.text(compact(v), x - 2, Y(v) + 1.2, { align: 'right' });
    }
    return Y;
  }

  interface ColumnSeries { color?: RGB; colors?: RGB[]; faded?: boolean[]; values: (number | null)[] }

  /** Thin columns on one axis, a small gap between neighbours. */
  function columns(o: { x: number; y: number; w: number; h: number; cats: string[]; series: ColumnSeries[]; maxBar?: number; labels?: (v: number) => string }) {
    const { x, w, h, cats, series } = o, yy = o.y;
    const k = series.length, n = cats.length, pl = x + 13, pw = w - 13, ph = h - 7;
    const max = Math.max(0, ...series.flatMap(s => s.values.filter((v): v is number => v != null)));
    const Y = axes(pl, yy, pw, ph, max);
    const band = pw / Math.max(1, n), gap = 0.7;
    const bw = Math.min(o.maxBar || 7, (band * 0.74 - (k - 1) * gap) / k), gw = k * bw + (k - 1) * gap;
    const every = Math.max(1, Math.ceil(9 / band));
    for (let i = 0; i < n; i++) {
      const x0 = pl + i * band + (band - gw) / 2;
      series.forEach((s, j) => {
        const v = s.values[i];
        if (v == null || !(v > 0)) return;
        const base = s.colors ? s.colors[i] : s.color || C.muted;
        doc.setFillColor(...(s.faded && s.faded[i] ? fade(base, 0.55) : base));
        const yt = Y(v);
        doc.rect(x0 + j * (bw + gap), yt, bw, Y(0) - yt, 'F');
        if (o.labels) { font(6.8, 'normal', C.muted); doc.text(o.labels(v), x0 + j * (bw + gap) + bw / 2, yt - 1.3, { align: 'center' }); }
      });
      if (i % every === 0) { font(7.5, 'normal', C.muted); doc.text(cats[i], pl + i * band + band / 2, yy + h - 1.2, { align: 'center' }); }
    }
    doc.setDrawColor(...C.strong);
    doc.setLineWidth(0.25);
    doc.line(pl, Y(0), x + w, Y(0));
  }

  function lines(o: { x: number; y: number; w: number; h: number; cats: string[]; series: { color: RGB; values: (number | null)[] }[] }) {
    const { x, w, h, cats, series } = o, yy = o.y, n = cats.length, pl = x + 13, pw = w - 13, ph = h - 7;
    const max = Math.max(0, ...series.flatMap(s => s.values.filter((v): v is number => v != null)));
    const Y = axes(pl, yy, pw, ph, max);
    const band = pw / Math.max(1, n), X = (i: number) => pl + band * i + band / 2;
    for (let i = 0; i < n; i++) { font(7.5, 'normal', C.muted); doc.text(cats[i], X(i), yy + h - 1.2, { align: 'center' }); }
    for (const s of series) {
      doc.setDrawColor(...s.color);
      doc.setLineWidth(0.5);
      let prev: [number, number] | null = null;
      s.values.forEach((v, i) => {
        if (v == null) { prev = null; return; }
        if (prev) doc.line(X(prev[0]), Y(prev[1]), X(i), Y(v));
        prev = [i, v];
      });
      doc.setFillColor(...s.color);
      s.values.forEach((v, i) => { if (v != null) doc.circle(X(i), Y(v), 0.9, 'F'); });
    }
    doc.setDrawColor(...C.strong);
    doc.setLineWidth(0.25);
    doc.line(pl, Y(0), x + w, Y(0));
  }

  /** The donut for Share of sales (D12), each slice parted from the next by a thin gap in the paper's colour. */
  function donut(cx: number, cy: number, R: number, r: number, slices: { value: number; color: RGB }[]) {
    const total = slices.reduce((s, x) => s + x.value, 0);
    if (!(total > 0)) return;
    const at = (a: number, rad: number): [number, number] => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
    let a0 = -Math.PI / 2;
    const cuts: number[] = [];
    for (const s of slices) {
      if (!(s.value > 0)) continue;
      const a1 = a0 + (s.value / total) * Math.PI * 2;
      const steps = Math.max(2, Math.ceil(((a1 - a0) / (Math.PI * 2)) * 120));
      const pts: [number, number][] = [];
      for (let i = 0; i <= steps; i++) pts.push(at(a0 + ((a1 - a0) * i) / steps, R));
      for (let i = steps; i >= 0; i--) pts.push(at(a0 + ((a1 - a0) * i) / steps, r));
      const deltas = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]);
      doc.setFillColor(...s.color);
      doc.lines(deltas, pts[0][0], pts[0][1], [1, 1], 'F', true);
      cuts.push(a0);
      a0 = a1;
    }
    if (cuts.length > 1) {
      doc.setDrawColor(...C.white);
      doc.setLineWidth(0.7);
      for (const a of cuts) { const [x1, y1] = at(a, r - 0.5), [x2, y2] = at(a, R + 0.5); doc.line(x1, y1, x2, y2); }
    }
  }

  const ST_HEAD = ['Month', 'Days open', 'Paid orders', 'Gross sales', 'Discounts', 'Service charge', 'Net sales', 'Sales a day', 'Delivery fees to riders', 'Cash', 'MoMo', 'Card', 'Cancelled and refunded', 'Cancelled, money kept'];
  const stLine = (a: Sums): string[] => [
    int(a.days), int(a.orders), amt(a.gross), amt(a.discount), amt(a.serviceCharge), amt(a.net), a.days ? amt(a.net / a.days) : '',
    amt(a.deliveryFee), amt(a.cash), amt(a.momo), amt(a.card), cnt(a.refundedAmount, a.refundedOrders), cnt(a.keptAmount, a.keptOrders),
  ];
  const stRows = (b: BookBranch | null) => res.months
    .map(m => ({ m, a: b ? res.cell[b.id][m] : res.total[m] }))
    .filter(r => r.a.days > 0);

  function statement(b: BookBranch | null, startY: number): number {
    const tot = b ? res.branchTotal[b.id] : g;
    return table({
      startY,
      fontSize: 7.2,
      head: [ST_HEAD],
      body: stRows(b).map(({ m, a }) => [monthText(m), ...stLine(a)]),
      foot: [['Total', ...stLine(tot)]],
      numeric: Array.from({ length: 13 }, (_, i) => i + 1),
      columnStyles: { 0: { cellWidth: 22 }, 6: { fontStyle: 'bold' } },
    });
  }

  /** Item sales by category and month, from the lines each branch sold. */
  function categories(ids: number[], startY: number): number {
    const months = res.months;
    const byCat = new Map<string, { by: Record<string, number>; sales: number; quantity: number }>();
    for (const id of ids) {
      for (const [line, it] of Object.entries(res.items[id] || {})) {
        const cat = plain(book.lines[Number(line)].category);
        const r = byCat.get(cat) || { by: {}, sales: 0, quantity: 0 };
        for (const [m, s] of Object.entries(it.by)) r.by[m] = (r.by[m] || 0) + s.sales;
        r.sales += it.sales;
        r.quantity += it.quantity;
        byCat.set(cat, r);
      }
    }
    const rows = [...byCat.entries()].sort((a, b) => b[1].sales - a[1].sales);
    const grand = rows.reduce((s, [, r]) => s + r.sales, 0);
    return table({
      startY,
      fontSize: 7.6,
      head: [['Category', ...months.map(monthShort), 'Total (GHS)', 'Share', 'Items sold']],
      body: rows.map(([cat, r]) => [cat, ...months.map(m => amt(r.by[m] || 0)), amt(r.sales), grand ? pct(r.sales / grand) : '', int(r.quantity)]),
      foot: [['Total', ...months.map(m => amt(rows.reduce((s, [, r]) => s + (r.by[m] || 0), 0))), amt(grand), '', int(rows.reduce((s, [, r]) => s + r.quantity, 0))]],
      numeric: Array.from({ length: months.length + 3 }, (_, i) => i + 1),
      columnStyles: { 0: { cellWidth: 30 } },
    });
  }

  /* The title block, always on page 1. */
  font(9, 'bold', C.strong);
  doc.text('CediBites', ML, 15);
  font(8.5, 'normal', C.muted);
  doc.text(`Prepared ${readAtText(new Date(madeAt).toISOString())}, Ghana time`, PW - MR, 15, { align: 'right' });
  font(20, 'bold');
  doc.text(TITLE, ML, 26);
  font(10.5, 'normal', C.muted);
  doc.text(`${listAnd(bs.map(name))}. ${period}.`, ML, 33);
  const f = res.filters;
  const bits = [
    f.source !== 'all' ? LABEL.source[f.source] || f.source : '',
    f.type !== 'all' ? LABEL.type[f.type] || f.type : '',
    f.method !== 'all' ? LABEL.method[f.method] || f.method : '',
  ].filter(Boolean).map(plain);
  doc.text(bits.length ? `Showing only ${bits.join(', ')}.` : 'All channels, order types and payments.', ML, 38.5);
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.6);
  doc.line(ML, 43, PW - MR, 43);
  y = 49;

  if (on.has('summary')) {
    count++;
    const boxes: [string, string][] = [
      ['Net sales', 'GHS ' + amt(g.net)],
      ['Paid orders', int(g.orders)],
      ['Average order', g.orders ? 'GHS ' + amt(g.net / g.orders) : 'None'],
      ['Delivery fees to riders', 'GHS ' + amt(g.deliveryFee)],
      ['Cancelled after payment', lost(g) ? plural(lost(g), 'order') : 'None'],
    ];
    const bw = (CW - 16) / 5;
    boxes.forEach(([label, value], i) => {
      const x = ML + i * (bw + 4);
      doc.setFillColor(...C.card);
      doc.setDrawColor(...C.line);
      doc.setLineWidth(0.25);
      doc.roundedRect(x, 48, bw, 19, 2, 2, 'FD');
      font(8, 'normal', C.muted);
      doc.text(label, x + 4, 54.5);
      font(12.5, 'bold');
      doc.text(value, x + 4, 62.5);
    });
    y = 76;
    font(11, 'bold');
    doc.text('Net sales each month', ML, y);
    if (multi) legendRight(bs.map(b => ({ name: name(b), color: hex(b.id) })), PW - MR, y);
    columns({
      x: ML, y: y + 4, w: CW, h: 58, cats: res.months.map(monthShort),
      series: bs.map(b => ({
        color: hex(b.id),
        values: res.months.map(m => (res.cell[b.id][m].days ? res.cell[b.id][m].net : null)),
        faded: res.months.map(m => isPart(res.cell[b.id][m], m)),
      })),
    });
    const reasons = partReasons(book, res);
    if (reasons.length) {
      font(7.8, 'normal', C.muted);
      doc.text(plain('Lighter bars are part months. ' + reasons.join(' ')), ML, y + 67);
    }
    const bestOf = (b: BookBranch): string | null => {
      let best: string | null = null;
      for (const m of res.months) {
        const a = res.cell[b.id][m];
        if (a.days && (!best || a.net > res.cell[b.id][best].net)) best = m;
      }
      return best;
    };
    const top = bestMonth(res);
    y = table({
      startY: y + 72,
      head: [['Branch', 'First sale', 'Days open', 'Net sales (GHS)', 'Share', 'Paid orders', 'Average order', 'Sales a day', 'Best month', 'Best month sales']],
      body: bs.map(b => {
        const t = res.branchTotal[b.id], m = bestOf(b);
        return [name(b), longDate(b.openDay), int(t.days), amt(t.net), g.net ? pct(t.net / g.net) : '', int(t.orders), t.orders ? amt(t.net / t.orders) : '', t.days ? amt(t.net / t.days) : '', m ? monthLong(m) : '', m ? amt(res.cell[b.id][m].net) : ''];
      }),
      foot: multi ? [['All branches', '', '', amt(g.net), '100.0%', int(g.orders), g.orders ? amt(g.net / g.orders) : '', '', top ? monthLong(top.month) : '', top ? amt(top.net) : '']] : undefined,
      numeric: [2, 3, 4, 5, 6, 7, 9],
    });
  }

  if (on.has('grid')) {
    section('Month by month, branch by branch', 'Amounts in Ghana cedis. Change compares sales a day with the month before, so a part month compares fairly.');
    const head1: RowInput = [{ content: 'Month', rowSpan: 2, styles: { valign: 'bottom' } }];
    bs.forEach(b => head1.push({ content: name(b), colSpan: 4, styles: { halign: 'center', textColor: C.ink } }));
    if (multi) head1.push({ content: 'All branches', colSpan: 2, styles: { halign: 'center', textColor: C.ink } });
    const head2: string[] = [];
    bs.forEach(() => head2.push('Net sales', 'Orders', 'Sales a day', 'Change'));
    if (multi) head2.push('Net sales', 'Orders');
    const body: RowInput[] = res.months.map((m, i) => {
      const row: RowInput = [monthText(m)];
      for (const b of bs) {
        const a = res.cell[b.id][m];
        if (!a.days) { row.push(notOpen(4)); continue; }
        const prev = i ? res.cell[b.id][res.months[i - 1]] : null;
        const c = prev && prev.days ? change(a, prev) : null;
        row.push(amt(a.net), int(a.orders), amt(perDay(a)), c == null ? '' : signedPct(c));
      }
      if (multi) row.push(amt(res.total[m].net), int(res.total[m].orders));
      return row;
    });
    const foot: string[] = ['Total'];
    for (const b of bs) { const t = res.branchTotal[b.id]; foot.push(amt(t.net), int(t.orders), t.days ? amt(t.net / t.days) : '', ''); }
    if (multi) foot.push(amt(g.net), int(g.orders));
    const nCols = 1 + bs.length * 4 + (multi ? 2 : 0);
    y = table({
      startY: y, fontSize: 7.8, head: [head1, head2], body, foot: [foot],
      numeric: Array.from({ length: nCols - 1 }, (_, i) => i + 1), change: bs.map((_, j) => 4 + j * 4), columnStyles: { 0: { cellWidth: 22 } },
    });
  }

  /* With one branch the statement is that branch's. If its own section is in too, that holds it, so it is drawn once. */
  if (on.has('stmt') && (multi || !on.has('branches'))) {
    section(multi ? 'Monthly statement, all branches together' : `Monthly statement, ${name(bs[0])}`, 'Amounts in Ghana cedis. Counts in brackets are orders.');
    y = statement(multi ? null : bs[0], y);
  }

  if (on.has('branches')) {
    for (const b of bs) {
      const t = res.branchTotal[b.id];
      section(name(b), `First sale ${longDate(b.openDay)}. Open ${int(t.days)} days in this report. Net sales GHS ${amt(t.net)} from ${int(t.orders)} paid orders.`);
      const months = res.months.filter(m => res.cell[b.id][m].days > 0);
      const chartW = CW * 0.56;
      font(10, 'bold');
      doc.text('Sales a day, each month', ML, y + 2);
      font(7.5, 'normal', C.muted);
      doc.text('GHS', ML + chartW, y + 2, { align: 'right' });
      columns({ x: ML, y: y + 6, w: chartW, h: 50, maxBar: 12, cats: months.map(monthShort), series: [{ color: hex(b.id), values: months.map(m => perDay(res.cell[b.id][m])) }], labels: compact });
      const wx = ML + chartW + 10, ww = CW - chartW - 10;
      font(10, 'bold');
      doc.text('Average sales by day of the week', wx, y + 2);
      const end = table({
        startY: y + 5, margin: { left: wx, right: MR }, tableWidth: ww, fontSize: 7.8,
        head: [['Day', 'Average net sales (GHS)', 'Days counted']],
        body: weekday(book, res, b).map((r, i) => [DOW[i], r.average == null ? '' : amt(r.average), int(r.days)]),
        numeric: [1, 2],
      });
      y = room(Math.max(y + 6 + 50, end) + 9, 50);
      sub('Monthly statement', 'Amounts in Ghana cedis. Counts in brackets are orders.');
      y = room(statement(b, y + 1) + 10, 45);
      sub(`What sold at ${name(b)}`, 'Item sales in each menu category, in Ghana cedis, before any discount.');
      y = categories([b.id], y + 1);
    }
  }

  if (on.has('period')) {
    const R = periodPresets(book).mtd, P = periods(book, f, R.A, R.B);
    const aT = rangeText(R.A[0], R.A[1]), bT = rangeText(R.B[0], R.B[1]);
    section('Period against period', `${aT}, against ${bT}. Amounts in Ghana cedis. Change in sales a day.`);
    const list = [
      ...P.rows.map(r => ({ name: name(r.branch), a: r.a, b: r.b })),
      ...(P.rows.length > 1 ? [{ name: 'All branches', a: P.all.a, b: P.all.b }] : []),
    ];
    columns({
      x: ML, y, w: CW * 0.5, h: 55, cats: P.rows.map(r => name(r.branch)), maxBar: 12,
      series: [
        { colors: P.rows.map(r => fade(hex(r.branch.id), 0.55)), values: P.rows.map(r => r.b.net) },
        { colors: P.rows.map(r => hex(r.branch.id)), values: P.rows.map(r => r.a.net) },
      ],
    });
    font(7.8, 'normal', C.muted);
    doc.text(doc.splitTextToSize(`Lighter bar: ${bT}. Solid bar: ${aT}.`, CW * 0.45), ML + CW * 0.53, y + 4);
    y = table({
      startY: y + 62, fontSize: 7.8,
      head: [['Branch', 'Net sales, this', 'Net sales, earlier', 'Difference', 'Orders, this', 'Orders, earlier', 'Average order, this', 'Average order, earlier', 'Sales a day, this', 'Sales a day, earlier', 'Change']],
      body: list.map(r => {
        const c = change(r.a, r.b);
        return [
          r.name, amt(r.a.net), amt(r.b.net), (r.a.net - r.b.net >= 0 ? '+' : '-') + amt(Math.abs(r.a.net - r.b.net)),
          int(r.a.orders), int(r.b.orders), r.a.orders ? amt(r.a.net / r.a.orders) : '', r.b.orders ? amt(r.b.net / r.b.orders) : '',
          r.a.days ? amt(r.a.net / r.a.days) : '', r.b.days ? amt(r.b.net / r.b.days) : '', c == null ? '' : signedPct(c),
        ];
      }),
      numeric: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], change: [3, 10],
    });
  }

  if (on.has('pace')) {
    const pc = pace(book, f), M = monthName(pc.month), P = monthName(pc.monthBefore);
    section(`${M} so far and forecast`, `1 to ${pc.daysIn} ${M}, against the same days of ${P}. The forecast assumes the remaining ${pc.daysLeft} days sell like the days so far. Amounts in Ghana cedis.`);
    const rows = [...pc.rows, ...(pc.rows.length > 1 ? [pc.all] : [])];
    const scale = Math.max(1, ...rows.map(r => Math.max(r.forecast, r.monthBefore.net)));
    const lx = ML + 32, lw = CW - 32 - 70;
    rows.forEach((r, i) => {
      const yy = y + i * 11, col = r.branch ? hex(r.branch.id) : C.muted;
      font(8.5, 'bold');
      doc.text(r.branch ? name(r.branch) : 'All branches', ML, yy + 4);
      doc.setFillColor(...C.foot);
      doc.rect(lx, yy, lw, 6, 'F');
      doc.setFillColor(...col);
      doc.rect(lx, yy, (r.soFar.net / scale) * lw, 6, 'F');
      doc.setFillColor(...fade(col, 0.6));
      doc.rect(lx + (r.soFar.net / scale) * lw, yy, (Math.max(0, r.forecast - r.soFar.net) / scale) * lw, 6, 'F');
      if (r.monthBefore.net) {
        const mx = lx + (r.monthBefore.net / scale) * lw;
        doc.setDrawColor(...C.ink);
        doc.setLineWidth(0.5);
        doc.line(mx, yy - 1.2, mx, yy + 7.2);
      }
      font(7.8, 'normal', C.muted);
      doc.text(`So far ${compact(r.soFar.net)}, forecast ${compact(r.forecast)}, ${monthShort(pc.monthBefore)} ${compact(r.monthBefore.net)}`, lx + lw + 3, yy + 4);
    });
    y += rows.length * 11 + 1;
    font(7.5, 'normal', C.muted);
    doc.text(`Solid: so far. Light: forecast for the rest of ${M}. Black mark: all of ${P}.`, ML, y + 2);
    const Ms = monthShort(pc.month), Ps = monthShort(pc.monthBefore);
    y = table({
      startY: y + 6,
      head: [['Branch', 'Days so far', 'Sales so far', `Same days of ${Ps}`, 'Change', 'Sales a day', `Forecast for ${Ms}`, `All of ${Ps}`, `Forecast against ${Ps}`]],
      body: rows.map(r => [
        r.branch ? name(r.branch) : 'All branches', int(r.soFar.days), amt(r.soFar.net), amt(r.sameDays.net), r.change == null ? '' : signedPct(r.change),
        r.soFar.days ? amt(r.soFar.net / r.soFar.days) : '', amt(r.forecast), amt(r.monthBefore.net), r.vsMonthBefore == null ? '' : signedPct(r.vsMonthBefore),
      ]),
      numeric: [1, 2, 3, 4, 5, 6, 7, 8], change: [4, 8],
    });
  }

  if (on.has('since')) {
    const list = since(book, f), n = Math.max(0, ...list.map(x => x.months.length));
    section('Months since opening', 'Each branch from its first month, in sales a day, so their starts sit side by side. Amounts in Ghana cedis.');
    if (list.length > 1) legendRight(list.map(x => ({ name: name(x.branch), color: hex(x.branch.id) })), PW - MR, y);
    lines({
      x: ML, y: y + 3, w: CW, h: 58, cats: Array.from({ length: n }, (_, i) => `Month ${i + 1}`),
      series: list.map(x => ({ color: hex(x.branch.id), values: Array.from({ length: n }, (_, i) => (x.months[i] ? perDay(x.months[i].sums) : null)) })),
    });
    y = table({
      startY: y + 66,
      head: [['Month', ...list.flatMap(x => [name(x.branch), 'Sales a day', 'Net sales'])]],
      body: Array.from({ length: n }, (_, i) => [`Month ${i + 1}`, ...list.flatMap(x => {
        const it = x.months[i];
        return it ? [`${monthLabel(it.month)}, ${plural(it.sums.days, 'day')}`, amt(perDay(it.sums)), amt(it.sums.net)] : ['Not yet', '', ''];
      })]),
      numeric: list.flatMap((_, j) => [2 + j * 3, 3 + j * 3]),
    });
  }

  if (on.has('share')) {
    const all = compute(book, { ...f, branch: 'all' });
    section('Share of sales by branch', `Each branch's part of net sales, ${rangeText(all.start, all.end)}.`);
    const slices = all.branches.map(b => ({ b, value: all.branchTotal[b.id].net }));
    const total = slices.reduce((s, x) => s + x.value, 0);
    const cy = y + 30, cx = ML + 30;
    donut(cx, cy, 25, 15.5, slices.map(s => ({ value: s.value, color: hex(s.b.id) })));
    font(7.5, 'normal', C.muted);
    doc.text('Net sales', cx, cy - 1.5, { align: 'center' });
    font(9.5, 'bold');
    doc.text(compact(total), cx, cy + 3.5, { align: 'center' });
    slices.forEach((s, i) => {
      const yy = y + 10 + i * 9, lx = ML + 66;
      doc.setFillColor(...hex(s.b.id));
      doc.roundedRect(lx, yy - 3, 3.2, 3.2, 0.6, 0.6, 'F');
      font(9, 'bold');
      doc.text(name(s.b), lx + 6, yy);
      font(9, 'normal', C.muted);
      doc.text(`${total ? pct(s.value / total) : ''}, GHS ${amt(s.value)}`, lx + 48, yy);
    });
    y = table({
      startY: y + 64,
      head: [['Month', ...all.branches.flatMap(b => [`${name(b)} (GHS)`, 'Share']), 'All branches (GHS)']],
      body: all.months.map(m => [monthLabel(m), ...all.branches.flatMap((b): CellInput[] => {
        const a = all.cell[b.id][m], T = all.total[m].net;
        return a.days ? [amt(a.net), T ? pct(a.net / T) : ''] : [notOpen(2)];
      }), amt(all.total[m].net)]),
      numeric: Array.from({ length: all.branches.length * 2 + 1 }, (_, i) => i + 1),
    });
  }

  /* Branch against branch needs two branches, as on screen. */
  if (on.has('bvb') && multi) {
    const v = versus(book, f, bs.map(b => b.id), true, res.start, res.end);
    section('Branch against branch', `Compared over ${rangeText(v.start, v.end)}. Amounts in Ghana cedis. Where one way is better, the strongest figure is in bold gold.`);
    const best = new Set<string>();
    const body = FACTORS.map((factor, row) => {
      const values = v.rows.map(r => factor.get(r.sums));
      const known = values.filter((x): x is number => x != null);
      const top = factor.best && known.length > 1 ? (factor.best === 'max' ? Math.max(...known) : Math.min(...known)) : null;
      values.forEach((x, i) => { if (top != null && x != null && Math.abs(x - top) < 1e-9) best.add(`${row},${i + 1}`); });
      return [factor.name, ...values.map(x => (x == null ? '' : factor.format(x)))];
    });
    y = table({
      startY: y, head: [['Figure', ...v.rows.map(r => name(r.branch))]], body, best,
      numeric: v.rows.map((_, i) => i + 1), columnStyles: { 0: { cellWidth: 70 } },
    });
    y = room(y + 9, 50);
    const items = itemTable(book, f, bs.map(b => b.id), monthOf(v.start), monthOf(v.end)).sort((a, b) => b.sales - a.sales).slice(0, 25);
    sub('The 25 best selling items, branch by branch', 'Item sales in Ghana cedis, with items sold in brackets. Items are named by the option bought.');
    y = table({
      startY: y + 1, fontSize: 7.6,
      head: [['Item', 'Category', ...v.rows.map(r => name(r.branch)), 'Together']],
      body: items.map(r => [
        plain(r.name), plain(r.category),
        ...v.rows.map(x => (r.by[x.branch.id] ? `${amt(r.by[x.branch.id].sales)} (${int(r.by[x.branch.id].quantity)})` : '0.00')),
        `${amt(r.sales)} (${int(r.quantity)})`,
      ]),
      numeric: [...v.rows.map((_, i) => i + 2), v.rows.length + 2], columnStyles: { 0: { cellWidth: 80 } },
    });
  }

  if (on.has('pay')) {
    section(multi ? 'How customers paid, all branches together' : `How customers paid at ${name(bs[0])}`, 'Net sales by payment method, in Ghana cedis.');
    const tot = multi ? g : res.branchTotal[bs[0].id];
    const share = (v: number, a: Sums) => (a.net ? pct(v / a.net) : '');
    const line = (a: Sums) => [amt(a.cash), share(a.cash, a), amt(a.momo), share(a.momo, a), amt(a.card), share(a.card, a), amt(a.net)];
    y = table({
      startY: y, head: [['Month', 'Cash', 'Share', 'MoMo', 'Share', 'Card', 'Share', 'Net sales']],
      body: stRows(multi ? null : bs[0]).map(r => [monthText(r.m), ...line(r.a)]), foot: [['Total', ...line(tot)]],
      numeric: [1, 2, 3, 4, 5, 6, 7], columnStyles: { 0: { cellWidth: 26 } },
    });
  }

  if (on.has('sold')) {
    section(multi ? 'What sold, all branches together' : `What sold at ${name(bs[0])}`, 'Item sales in each menu category, in Ghana cedis, before any discount.');
    y = categories(bs.map(b => b.id), y);
  }

  if (on.has('ledger')) {
    section('Daily takings', 'Every day each branch was open. Amounts in Ghana cedis.');
    const rows: { day: number; b: BookBranch; a: Sums | null }[] = [];
    for (let t = res.start; t <= res.end; t += DAY) {
      for (const b of bs) if (t >= b.openDay) rows.push({ day: t, b, a: res.days[b.id][iso(t)] ?? null });
    }
    const z = (a: Sums | null, get: (s: Sums) => number) => (a ? get(a) : 0);
    y = table({
      startY: y, fontSize: 7.6,
      head: [['Date', ...(multi ? ['Branch'] : []), 'Paid orders', 'Cash', 'MoMo', 'Card', 'Net sales', 'Delivery fees', 'Cancelled after payment']],
      body: rows.map(r => [
        rowDate(r.day) + (r.day === book.today ? ', so far' : ''), ...(multi ? [name(r.b)] : []),
        int(z(r.a, s => s.orders)), amt(z(r.a, s => s.cash)), amt(z(r.a, s => s.momo)), amt(z(r.a, s => s.card)),
        amt(z(r.a, s => s.net)), amt(z(r.a, s => s.deliveryFee)), int(z(r.a, lost)),
      ]),
      numeric: Array.from({ length: 7 }, (_, i) => i + (multi ? 2 : 1)),
    });
  }

  if (on.has('cx')) {
    const rows = cancelledIn(book, res).slice().sort((a, b) => (a.placed_at < b.placed_at ? -1 : 1));
    const branchOf = new Map(book.branches.map(b => [b.id, b]));
    section('Cancelled after payment, order by order', 'None of these orders is in net sales. Amounts in Ghana cedis.');
    const amountAt = multi ? 5 : 4;
    y = table({
      startY: y, fontSize: 7.6,
      head: [['Order', 'Placed', ...(multi ? ['Branch'] : []), 'Channel', 'Paid by', 'Amount', 'What happened', 'Reason given']],
      body: rows.map(c => {
        const b = branchOf.get(c.branch_id);
        return [
          plain(c.order_number), placedText(c.placed_at), ...(multi ? [b ? name(b) : ''] : []),
          LABEL.source[c.source] || plain(c.source), LABEL.method[c.method] || plain(c.method), amt(c.amount), LABEL.outcome[c.outcome],
          c.reason ? plain(c.reason) : 'None given',
        ];
      }),
      foot: [['Total', '', ...(multi ? [''] : []), '', '', amt(rows.reduce((s, c) => s + c.amount, 0)), '', '']],
      numeric: [amountAt], columnStyles: { [amountAt + 2]: { cellWidth: 70 } },
    });
  }

  /* The notes, on the last page (D5, D20). */
  const forecastMonth = monthName(monthOf(book.lastFull));
  const notes = [
    'A sale is a paid order that was not cancelled. Net sales is what customers paid for food and drink, after any discount, plus the small service charge on a few orders.',
    'Delivery fees belong to the riders. They are shown on their own and never counted as sales.',
    `Sales a day divides net sales by the days the branch was open. The first sales were recorded at ${listAnd(bs.map(b => `${name(b)} on ${longDate(b.openDay)}`))}. The figures run to ${longDate(book.end)}.`,
    'Change compares sales a day with the month before. That way a part month does not look like a fall. Today is left out of sales a day until it is over.',
    'An order cancelled after payment is never in net sales. Where the payment still stands as taken, the money is in the till but not in sales. It is listed under money kept.',
    `The forecast for ${forecastMonth} assumes the rest of the month sells like the days so far.`,
    'Until each branch has its own Hubtel account, MoMo from every branch lands in Ashaiman\'s Hubtel account. MoMo paid to a branch\'s own short code and rung up as cash is counted under Cash.',
    'A few test payments of GHS 0.10 or GHS 0.20 are counted as sales.',
    `Items are named by the option bought, as on the receipt. A line sold with no option recorded reads ${UNNAMED_LINE}, under Uncategorised.`,
    `Read from the CediBites order records on ${readAt}, Ghana time.`,
  ];
  font(9);
  const wrapped = notes.map(t => doc.splitTextToSize(t, CW * 0.72) as string[]);
  const need = 12 + wrapped.reduce((s, l) => s + l.length * 4.2 + 2.2, 0);
  if (count === 0) y = 52;
  else { doc.addPage(); y = TOP + 6; }
  y = room(y, need);
  font(14, 'bold');
  doc.text('How these figures are worked out', ML, y);
  y += 8;
  font(9);
  for (const l of wrapped) { doc.text(l, ML, y); y += l.length * 4.2 + 2.2; }

  /* The running header and footer, once every page is drawn. */
  const N = doc.getNumberOfPages();
  for (let i = 1; i <= N; i++) {
    doc.setPage(i);
    if (i > 1) {
      font(8, 'bold', C.strong);
      doc.text('CediBites', ML, 13);
      font(8, 'normal', C.muted);
      doc.text(`${TITLE}. ${period}.`, PW - MR, 13, { align: 'right' });
      doc.setDrawColor(...C.line);
      doc.setLineWidth(0.2);
      doc.line(ML, 15.5, PW - MR, 15.5);
    }
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.2);
    doc.line(ML, PH - 11.5, PW - MR, PH - 11.5);
    font(7.5, 'normal', C.muted);
    doc.text(`From the CediBites order records, read ${readAt}. Paid orders only. Delivery fees are not counted as sales.`, ML, PH - 7.5);
    doc.text(`Page ${i} of ${N}`, PW - MR, PH - 7.5, { align: 'right' });
  }
  return doc;
}
