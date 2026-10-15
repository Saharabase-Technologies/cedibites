'use client';

import { useState } from 'react';
import { SegmentedTabs, type DataTableColumn } from '@/app/inventory/_components';
import type { Figures, FinanceBook, ItemSum } from '@/lib/finance/figures';
import { amt, int, monthLabel, pct } from '@/lib/finance/format';
import { ChartPanel, ControlGroup } from '../ChartPanel';
import { useFinance } from '../FinanceProvider';
import { FigureTable } from '../parts';

/**
 * What sold: each menu category by month, as item sales or as items sold.
 * Ported from the review page's `drawCats`.
 *
 * Items come by the month, so a month here is always the whole month. Item
 * sales are before any discount, so they do not add up to net sales.
 */

type Mode = 'sales' | 'quantity';
const MODES = [{ value: 'sales' as const, label: 'Sales' }, { value: 'quantity' as const, label: 'Items sold' }];

interface CategoryRow extends ItemSum {
  category: string;
  by: Record<string, ItemSum>;
}

/** The chosen branches' item rows, gathered by category. Each line's category comes from the book. */
function byCategory(book: FinanceBook, res: Figures): CategoryRow[] {
  const out = new Map<string, CategoryRow>();
  for (const b of res.branches) {
    for (const [line, item] of Object.entries(res.items[b.id] || {})) {
      const category = book.lines[Number(line)].category;
      const row = out.get(category) ?? { category, by: {}, quantity: 0, sales: 0 };
      row.quantity += item.quantity; row.sales += item.sales;
      for (const [m, x] of Object.entries(item.by)) {
        const cell = (row.by[m] = row.by[m] || { quantity: 0, sales: 0 });
        cell.quantity += x.quantity; cell.sales += x.sales;
      }
      out.set(category, row);
    }
  }
  return [...out.values()];
}

export function SoldPanel() {
  const { book, figures: res } = useFinance();
  const [mode, setMode] = useState<Mode>('sales');

  const rows = byCategory(book, res);
  const value = (x: ItemSum | undefined): number => (x ? x[mode] : 0);
  const format = mode === 'quantity' ? int : amt;
  const grand = rows.reduce((sum, r) => sum + value(r), 0);

  const columns: DataTableColumn<CategoryRow>[] = [
    { key: 'category', header: 'Category', sortValue: r => r.category, cell: r => <span className="font-medium">{r.category}</span>, foot: 'Total' },
    ...res.months.map(m => ({
      key: m,
      header: monthLabel(m),
      align: 'right' as const,
      sortValue: (r: CategoryRow) => value(r.by[m]),
      cell: (r: CategoryRow) => <span className={r.by[m] ? undefined : 'text-neutral-gray'}>{format(value(r.by[m]))}</span>,
      foot: format(rows.reduce((sum, r) => sum + value(r.by[m]), 0)),
    })),
    { key: 'total', header: 'Total', align: 'right', sortValue: r => value(r), cell: r => <span className="font-bold">{format(value(r))}</span>, foot: format(grand) },
    { key: 'share', header: 'Share', align: 'right', sortValue: r => value(r), cell: r => <span className="text-neutral-gray">{grand ? pct(value(r) / grand) : ''}</span> },
  ];

  return (
    <ChartPanel
      title="What sold"
      sub={mode === 'quantity'
        ? 'Items sold in each menu category, by the whole month.'
        : 'Item sales in each menu category, by the whole month, in Ghana cedis. They are before any discount.'}
      controls={(
        <ControlGroup caption="Show">
          <SegmentedTabs options={MODES} value={mode} onChange={setMode} />
        </ControlGroup>
      )}
    >
      <FigureTable
        rows={rows}
        rowKey={r => r.category}
        columns={columns}
        defaultSortKey="total"
        defaultSortDir="desc"
        stackOnPhone
        empty="No items sold in these filters."
      />
    </ChartPanel>
  );
}
