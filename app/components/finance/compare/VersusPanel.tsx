'use client';

import { useId, useState } from 'react';
import { CustomSelect, SegmentedTabs, Toggle } from '@/app/inventory/_components';
import { SeriesKey } from '../charts';
import { itemTable, lost, monthEnd, monthOf, monthStart, perDay, versus, type ItemRow, type Sums } from '@/lib/finance/figures';
import { amt, compact, int, monthLabel, one, pct, rangeText } from '@/lib/finance/format';
import { ChartNote, ChartPanel, ControlGroup } from '../ChartPanel';
import { useFinance } from '../FinanceProvider';
import { Figure, FigureTable, PartHeading } from './parts';

/**
 * Branch against branch: the chosen branches side by side on the figures,
 * across the menu and by category. Ported from the review page's `drawBvb`.
 *
 * The best figure in a row is bold in deep gold, with no pill (D13). The page
 * filters hold, but the chips here choose the branches.
 */

interface Factor {
  name: string;
  get: (a: Sums) => number | null;
  format: (v: number) => string;
  /** Which way is better, for a figure where one is. */
  best?: 'max' | 'min';
}

const shareOf = (part: number, a: Sums): number | null => (a.net ? part / a.net : null);

const FACTORS: Factor[] = [
  { name: 'Net sales', get: a => a.net, format: amt, best: 'max' },
  { name: 'Paid orders', get: a => a.orders, format: int, best: 'max' },
  { name: 'Average order', get: a => (a.orders ? a.net / a.orders : null), format: amt, best: 'max' },
  { name: 'Sales a day', get: perDay, format: amt, best: 'max' },
  { name: 'Orders a day', get: a => (a.days ? a.orders / a.days : null), format: one, best: 'max' },
  { name: 'Cash share of sales', get: a => shareOf(a.cash, a), format: pct },
  { name: 'MoMo share of sales', get: a => shareOf(a.momo, a), format: pct },
  { name: 'Card share of sales', get: a => shareOf(a.card, a), format: pct },
  { name: 'Sold at the till', get: a => shareOf(a.bySource.pos || 0, a), format: pct },
  { name: 'Sold online or on WhatsApp', get: a => shareOf((a.bySource.online || 0) + (a.bySource.whatsapp || 0), a), format: pct },
  { name: 'Dine in share', get: a => shareOf(a.byType.dine_in || 0, a), format: pct },
  { name: 'Takeaway share', get: a => shareOf(a.byType.takeaway || 0, a), format: pct },
  { name: 'Pickup share', get: a => shareOf(a.byType.pickup || 0, a), format: pct },
  { name: 'Delivery share', get: a => shareOf(a.byType.delivery || 0, a), format: pct },
  { name: 'Cancelled after payment, share of orders', get: a => (a.orders + lost(a) ? lost(a) / (a.orders + lost(a)) : null), format: pct, best: 'min' },
  { name: 'Refunded', get: a => a.refundedAmount, format: amt },
  { name: 'Money kept on cancelled orders', get: a => a.keptAmount, format: amt },
  { name: 'Delivery fees to riders', get: a => a.deliveryFee, format: amt },
  { name: 'Days open', get: a => a.days, format: int },
];

type Mode = 'sales' | 'quantity';
const MODES = [{ value: 'sales' as const, label: 'Sales' }, { value: 'quantity' as const, label: 'Items sold' }];
const ALL = 'all';

export function VersusPanel() {
  const { book, filters, colours } = useFinance();
  const [picked, setPicked] = useState<number[] | null>(null);
  const [common, setCommon] = useState(true);
  const [mode, setMode] = useState<Mode>('sales');
  const [category, setCategory] = useState<string>(ALL);
  const categoryId = useId();

  if (book.branches.length < 2) {
    return (
      <ChartPanel title="Branch against branch">
        <p className="py-8 text-center text-sm font-body text-neutral-gray">This needs two branches that have sold.</p>
      </ChartPanel>
    );
  }

  /* Every branch to start with. A choice of fewer than two that the ledger still holds goes back to all of them. */
  const held = (picked ?? []).filter(id => book.branches.some(b => b.id === id));
  const ids = held.length >= 2 ? held : book.branches.map(b => b.id);
  const toggle = (id: number) => setPicked(ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id].sort((a, b) => a - b));

  const from = monthStart(filters.from);
  const to = Math.min(book.end, monthEnd(filters.to));
  const v = versus(book, filters, ids, common, from, to);
  const never = v.start > v.end;

  const best = FACTORS.map(f => {
    if (!f.best) return null;
    const values = v.rows.map(r => f.get(r.sums)).filter((x): x is number => x != null);
    if (values.length < 2) return null;
    return f.best === 'max' ? Math.max(...values) : Math.min(...values);
  });

  /* Items come by the month, so the menu tables count whole months. */
  const fromMonth = monthOf(v.start), toMonth = monthOf(v.end);
  const items = never ? [] : itemTable(book, filters, ids, fromMonth, toMonth);
  const categories = [...new Set(book.lines.map(l => l.category))].sort();
  const chosenCategory = categories.includes(category) ? category : ALL;
  const shown = items.filter(r => chosenCategory === ALL || r.category === chosenCategory);
  const value = (x: { quantity: number; sales: number } | undefined) => (x ? (mode === 'quantity' ? x.quantity : x.sales) : 0);
  const format = mode === 'quantity' ? int : amt;

  /* Each branch's item sales by category, as a share of its own item sales. */
  const mix = [...new Set(items.map(r => r.category))].map(name => {
    const by: Record<number, number> = {};
    for (const r of items) if (r.category === name) for (const id of ids) by[id] = (by[id] || 0) + (r.by[id]?.sales || 0);
    return { name, by, together: ids.reduce((sum, id) => sum + (by[id] || 0), 0) };
  }).sort((a, b) => b.together - a.together);
  const itemTotal: Record<number, number> = {};
  for (const id of ids) itemTotal[id] = items.reduce((sum, r) => sum + (r.by[id]?.sales || 0), 0);

  const chips = (
    <div role="group" aria-label="Branches to compare" className="flex flex-wrap items-center gap-2">
      {book.branches.map(b => {
        const on = ids.includes(b.id);
        const locked = on && ids.length <= 2;
        return (
          <button
            key={b.id}
            type="button"
            aria-pressed={on}
            disabled={locked}
            title={locked ? 'Keep at least two branches' : undefined}
            onClick={() => toggle(b.id)}
            className={`flex items-center gap-2 min-h-11 px-3.5 rounded-full border text-sm font-medium font-body transition-colors ${
              on ? 'bg-[#f0e8d8] border-[#cbbfa8] text-text-dark' : 'bg-neutral-card border-[#e3ddd0] text-neutral-gray hover:text-text-dark'
            } ${locked ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <SeriesKey colour={on ? colours[b.id] : undefined} hollow={!on} />
            {b.name}
          </button>
        );
      })}
    </div>
  );

  return (
    <ChartPanel
      title="Branch against branch"
      sub={never ? undefined : `Compared over ${rangeText(v.start, v.end)}. Amounts in Ghana cedis.`}
      controls={(
        <>
          {chips}
          <div className="flex items-center min-h-11">
            <Toggle checked={common} onChange={setCommon} label="Only the days every chosen branch was open" />
          </div>
        </>
      )}
    >
      {never ? (
        <p className="py-8 text-center text-sm font-body text-neutral-gray">These branches were never all open in the chosen months.</p>
      ) : (
        <>
          <PartHeading>Figures</PartHeading>
          <FigureTable
            rows={FACTORS.map((_, i) => i)}
            rowKey={i => i}
            columns={[
              { key: 'figure', header: 'Figure', cell: i => <span className="font-medium">{FACTORS[i].name}</span> },
              ...v.rows.map(r => ({
                key: String(r.branch.id),
                header: r.branch.name,
                align: 'right' as const,
                cell: (i: number) => {
                  const f = FACTORS[i], x = f.get(r.sums);
                  if (x == null) return <span className="text-neutral-gray">None</span>;
                  const top = best[i] != null && Math.abs(x - (best[i] as number)) < 1e-9;
                  return top
                    ? <span className="font-bold text-[#9a6410] whitespace-nowrap"><span className="sr-only">Best: </span>{f.format(x)}</span>
                    : <span className="whitespace-nowrap">{f.format(x)}</span>;
                },
              })),
            ]}
          />
          <ChartNote>The best figure in a row is in bold gold.</ChartNote>

          <PartHeading>Menu items</PartHeading>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <ControlGroup caption="Show">
              <SegmentedTabs options={MODES} value={mode} onChange={setMode} />
            </ControlGroup>
            <div className="flex items-center gap-2">
              <label htmlFor={categoryId} className="text-xs font-semibold font-body text-[#6f6353]">Category</label>
              <div className="w-52">
                <CustomSelect
                  id={categoryId}
                  size="sm"
                  fullWidth
                  value={chosenCategory}
                  onChange={setCategory}
                  options={[{ value: ALL, label: 'All categories' }, ...categories.map(c => ({ value: c, label: c }))]}
                />
              </div>
            </div>
          </div>
          <FigureTable<ItemRow>
            rows={shown}
            rowKey={r => r.line}
            pageSize={12}
            defaultSortKey="together"
            defaultSortDir="desc"
            empty="No items sold in this selection."
            columns={[
              { key: 'name', header: 'Item', sortValue: r => r.name.toLowerCase(), cell: r => <span className="font-medium whitespace-normal">{r.name}</span> },
              { key: 'category', header: 'Category', sortValue: r => r.category, cell: r => <span className="text-neutral-gray">{r.category}</span> },
              ...v.rows.map(x => ({
                key: String(x.branch.id),
                header: x.branch.name,
                align: 'right' as const,
                sortValue: (r: ItemRow) => value(r.by[x.branch.id]),
                cell: (r: ItemRow) => <span className={r.by[x.branch.id] ? undefined : 'text-neutral-gray'}>{format(value(r.by[x.branch.id]))}</span>,
              })),
              { key: 'together', header: 'Together', align: 'right', sortValue: r => value(r), cell: r => <span className="font-bold">{format(value(r))}</span> },
            ]}
          />

          <PartHeading>Category mix</PartHeading>
          <FigureTable
            rows={mix}
            rowKey={c => c.name}
            empty="No items sold in this selection."
            columns={[
              { key: 'category', header: 'Category', cell: c => <span className="font-medium">{c.name}</span> },
              ...v.rows.map(x => ({
                key: String(x.branch.id),
                header: x.branch.name,
                align: 'right' as const,
                cell: (c: (typeof mix)[number]) => (itemTotal[x.branch.id]
                  ? <Figure value={pct((c.by[x.branch.id] || 0) / itemTotal[x.branch.id])} under={compact(c.by[x.branch.id] || 0)} />
                  : ''),
              })),
              { key: 'together', header: 'Together', align: 'right', cell: c => <span className="font-bold">{amt(c.together)}</span> },
            ]}
          />
          <ChartNote>
            Each branch&apos;s share of its own item sales. The menu tables count whole months, {monthLabel(fromMonth)} to {monthLabel(toMonth)}.
          </ChartNote>
        </>
      )}
    </ChartPanel>
  );
}
