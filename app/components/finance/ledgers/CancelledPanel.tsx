'use client';

import { useState } from 'react';
import { SegmentedTabs, type DataTableColumn } from '@/app/inventory/_components';
import { TONE } from '@/app/inventory/_components/status-tokens';
import { cancelledCsv } from '@/lib/finance/csv';
import { fileName, saveFile } from '@/lib/finance/download';
import { cancelledIn, LABEL } from '@/lib/finance/figures';
import { amt, int, placedText } from '@/lib/finance/format';
import type { FinanceCancelledOrder, FinanceCancelOutcome } from '@/types/finance';
import { ChartPanel } from '../ChartPanel';
import { useFinance } from '../FinanceProvider';
import { BranchName, CsvButton, FigureTable } from '../parts';

/**
 * Cancelled after payment: each order that was paid for and then cancelled,
 * split by what became of the money (D8). Ported from the review page's
 * `drawCx`. Its CSV button saves the orders the chosen tab shows.
 *
 * The list and its counts come from `cancelledIn`, so they always agree with
 * the Overview's Cancelled after payment figure.
 */

type Kind = 'all' | FinanceCancelOutcome;

const KINDS: FinanceCancelOutcome[] = ['refunded', 'kept', 'no_charge'];

const TONE_OF: Record<FinanceCancelOutcome, (typeof TONE)[keyof typeof TONE]> = {
  refunded: TONE.neutral,
  kept: TONE.problem,
  no_charge: TONE.waiting,
};

function Outcome({ outcome }: { outcome: FinanceCancelOutcome }) {
  const tone = TONE_OF[outcome];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${tone.bg} ${tone.text}`}>
      <span aria-hidden className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
      {LABEL.outcome[outcome]}
    </span>
  );
}

export function CancelledPanel() {
  const { book, figures: res, colours } = useFinance();
  const [kind, setKind] = useState<Kind>('all');

  const all = cancelledIn(book, res);
  const count = (k: Kind) => (k === 'all' ? all.length : all.filter(c => c.outcome === k).length);
  const rows = kind === 'all' ? all : all.filter(c => c.outcome === kind);
  const branchOf = new Map(res.branches.map(b => [b.id, b]));
  const what = kind === 'all' ? 'cancelled after payment' : `cancelled after payment, ${LABEL.outcome[kind].toLowerCase()}`;

  const columns: DataTableColumn<FinanceCancelledOrder>[] = [
    { key: 'order', header: 'Order', sortValue: c => c.order_number, cell: c => <span className="font-bold whitespace-nowrap">{c.order_number}</span>, foot: 'Total' },
    { key: 'placed', header: 'Placed', sortValue: c => c.placed_at, cell: c => <span className="whitespace-nowrap">{placedText(c.placed_at)}</span> },
    ...(res.branches.length > 1 ? [{
      key: 'branch',
      header: 'Branch',
      sortValue: (c: FinanceCancelledOrder) => branchOf.get(c.branch_id)?.name ?? '',
      cell: (c: FinanceCancelledOrder) => <BranchName name={branchOf.get(c.branch_id)?.name ?? ''} colour={colours[c.branch_id]} />,
    }] : []),
    { key: 'source', header: 'Channel', sortValue: c => c.source, cell: c => LABEL.source[c.source] || c.source },
    { key: 'method', header: 'Paid by', sortValue: c => c.method, cell: c => LABEL.method[c.method] || c.method },
    { key: 'amount', header: 'Amount', align: 'right', sortValue: c => c.amount, cell: c => amt(c.amount), foot: amt(rows.reduce((sum, c) => sum + c.amount, 0)) },
    { key: 'outcome', header: 'What happened', sortValue: c => c.outcome, cell: c => <Outcome outcome={c.outcome} /> },
    {
      key: 'reason',
      header: 'Reason given',
      sortValue: c => c.reason.toLowerCase(),
      cell: c => (c.reason ? <span className="block min-w-48 max-w-xs whitespace-normal">{c.reason}</span> : <span className="text-neutral-gray">None given</span>),
    },
  ];

  return (
    <ChartPanel
      title="Cancelled after payment"
      sub="Orders that were paid for and then cancelled. None of them is in net sales."
      controls={(
        <>
          <SegmentedTabs<Kind>
            options={[
              { value: 'all', label: `All (${int(count('all'))})` },
              ...KINDS.map(k => ({ value: k, label: `${LABEL.outcome[k]} (${int(count(k))})` })),
            ]}
            value={kind}
            onChange={setKind}
          />
          <CsvButton disabled={!rows.length} onClick={() => saveFile(fileName(book, res, what, 'csv'), cancelledCsv(res, rows))} />
        </>
      )}
    >
      <FigureTable
        key={kind}
        rows={rows}
        rowKey={c => c.order_number}
        columns={columns}
        pageSize={15}
        defaultSortKey="placed"
        defaultSortDir="desc"
        stackOnPhone
        empty={kind === 'all' ? 'No order was cancelled after payment in these filters.' : 'No order to show here.'}
      />
    </ChartPanel>
  );
}
