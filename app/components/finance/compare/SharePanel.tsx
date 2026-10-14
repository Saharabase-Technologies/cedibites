'use client';

import { useId, useState } from 'react';
import { CustomSelect, SegmentedTabs } from '@/app/inventory/_components';
import { DonutChart, TipRow, TipRows, TipTitle } from '../charts';
import { compute, type Sums } from '@/lib/finance/figures';
import { amt, ghs, int, monthLong, pct, plural, rangeText } from '@/lib/finance/format';
import { ChartPanel, ControlGroup } from '../ChartPanel';
import { useFinance } from '../FinanceProvider';
import { BranchName, FigureTable } from '../parts';

/**
 * Share of sales: each branch's part of the whole, as a donut (D12), for the
 * chosen months or one month picked here. A small table under it.
 *
 * It always shows every branch, so it takes no branch pick, from the page or
 * from a chart filter. It follows the page's channel filters.
 */

type Measure = 'net' | 'orders';

const SHOW = [{ value: 'net' as const, label: 'Net sales' }, { value: 'orders' as const, label: 'Orders' }];
const ALL = 'all';

export function SharePanel() {
  const { book, filters, colours } = useFinance();
  const [measure, setMeasure] = useState<Measure>('net');
  const [picked, setMonth] = useState<string>(ALL);
  const monthId = useId();

  const months = book.months.filter(m => m >= filters.from && m <= filters.to);
  /* A month the page filters have taken away goes back to all of them. */
  const month = months.includes(picked) ? picked : ALL;
  const res = compute(book, { ...filters, branch: 'all', ...(month !== ALL ? { from: month, to: month } : {}) });

  const get = (a: Sums) => (measure === 'net' ? a.net : a.orders);
  const format = measure === 'net' ? ghs : int;
  const total = get(res.grand);
  const rows = res.branches.filter(b => res.branchTotal[b.id].days > 0);
  const shareOf = (a: Sums) => (total ? get(a) / total : null);

  const what = measure === 'net' ? 'net sales' : 'paid orders';
  const title = `Share of ${what} by branch`;

  const controls = (
    <>
      <ControlGroup caption="Show">
        <SegmentedTabs options={SHOW} value={measure} onChange={setMeasure} />
      </ControlGroup>
      <div className="flex items-center gap-2">
        <label htmlFor={monthId} className="text-xs font-semibold font-body text-[#6f6353]">Month</label>
        <div className="w-52">
          <CustomSelect
            id={monthId}
            sheetTitle="Month"
            fullWidth
            value={month}
            onChange={setMonth}
            options={[{ value: ALL, label: 'All chosen months' }, ...[...months].reverse().map(m => ({ value: m, label: monthLong(m) }))]}
          />
        </div>
      </div>
    </>
  );

  return (
    <ChartPanel
      title={title}
      sub={`${rangeText(res.start, res.end)}.${filters.branch !== 'all' && book.branches.length > 1 ? ' Every branch, whatever branch is chosen above.' : ''}`}
      controls={controls}
    >
      <DonutChart
        label={title}
        slices={rows.map(b => ({ name: b.name, colour: colours[b.id], value: get(res.branchTotal[b.id]) }))}
        height={260}
        tip={i => {
          const b = rows[i], a = res.branchTotal[b.id];
          return (
            <>
              <TipTitle>{b.name}</TipTitle>
              <TipRows>
                <TipRow colour={colours[b.id]} name={pct(shareOf(a))} value={format(get(a))} extra={plural(a.days, 'day')} />
              </TipRows>
            </>
          );
        }}
      />
      {rows.length > 0 && (
        <FigureTable
          rows={[...rows.map(b => ({ key: String(b.id), name: b.name, colour: colours[b.id], a: res.branchTotal[b.id] })), { key: 'all', name: 'All branches', colour: undefined, a: res.grand }]}
          rowKey={r => r.key}
          stackOnPhone
          columns={[
            { key: 'branch', header: 'Branch', cell: r => <BranchName name={r.name} colour={r.colour} strong={!r.colour} /> },
            { key: 'value', header: measure === 'net' ? 'Net sales' : 'Orders', align: 'right', cell: r => <span className={r.colour ? undefined : 'font-bold'}>{measure === 'net' ? amt(r.a.net) : int(r.a.orders)}</span> },
            { key: 'share', header: 'Share', align: 'right', cell: r => <span className={r.colour ? undefined : 'font-bold'}>{pct(shareOf(r.a))}</span> },
          ]}
        />
      )}
    </ChartPanel>
  );
}
