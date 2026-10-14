'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { DownloadSimpleIcon } from '@phosphor-icons/react';
import { PageHeader, SegmentedTabsLink } from '@/app/inventory/_components';
import { listAnd, rangeText, readAtText } from '@/lib/finance/format';
import type { FinanceLedgerFilters } from '@/types/finance';
import { FinanceDownload } from './FinanceDownload';
import { FinanceFilterBar } from './FinanceFilterBar';
import { FinanceNotice } from './FinanceNotice';
import { FinanceProvider, useFinanceState } from './FinanceProvider';

/**
 * What every Finance page stands in, for the admin portal and the partner
 * portal alike. A portal's layout mounts it, so it stays in place while the
 * tabs change under it.
 *
 * The order is fixed, top to bottom: the header, the tabs, the filters, then
 * the page. The owner could not tell where to look, so nothing moves.
 */
export function FinanceShell({
  basePath,
  scope,
  branch,
  branchControl,
  barRoom = true,
  children,
}: {
  /** Where the section lives: `/admin/finance` or `/partner/finance`. */
  basePath: string;
  /** The branches to read. Left out, every branch the caller may see. */
  scope?: Pick<FinanceLedgerFilters, 'branch_id' | 'branch_ids'>;
  /** The branch filter, when `branchControl` chooses it. */
  branch?: 'all' | number;
  /** Stands in for the branch picker in the filter row. */
  branchControl?: ReactNode;
  /**
   * Room at the foot for the phone bar, as the Menu section and the inventory
   * pages leave. Off where the portal's `main` leaves it already, as the
   * partner portal's does.
   */
  barRoom?: boolean;
  children: ReactNode;
}) {
  return (
    <FinanceProvider scope={scope} branch={branch}>
      <FinanceFrame basePath={basePath} branchControl={branchControl} barRoom={barRoom}>{children}</FinanceFrame>
    </FinanceProvider>
  );
}

function FinanceFrame({
  basePath,
  branchControl,
  barRoom,
  children,
}: {
  basePath: string;
  branchControl?: ReactNode;
  barRoom: boolean;
  children: ReactNode;
}) {
  const state = useFinanceState();
  const [downloading, setDownloading] = useState(false);
  const closeDownload = useCallback(() => setDownloading(false), []);
  const tabs = [
    { href: basePath, label: 'Overview', exact: true },
    { href: `${basePath}/compare`, label: 'Compare' },
    { href: `${basePath}/ledgers`, label: 'Ledgers' },
  ];
  const subtitle = state.status === 'ready' && state.figures.branches.length
    ? `${listAnd(state.figures.branches.map(b => b.name))}, ${rangeText(state.figures.start, state.figures.end)}`
    : undefined;
  const readAt = state.status === 'ready' ? readAtText(state.book.ledger.read_at) : '';

  return (
    // The same width and padding as the Menu section and the inventory pages.
    <div className={`p-6 ${barRoom ? 'pb-24 md:pb-6' : ''} max-w-6xl mx-auto w-full`}>
      <PageHeader
        title="Finance"
        subtitle={subtitle}
        secondaryAction={state.status === 'ready'
          ? { label: 'Download', onClick: () => setDownloading(true), icon: <DownloadSimpleIcon size={16} weight="bold" /> }
          : undefined}
      />
      <div className="mb-5">
        <SegmentedTabsLink items={tabs} />
      </div>

      {state.status === 'loading' && <FinanceNotice title="Reading the order records" />}
      {state.status === 'error' && (
        <FinanceNotice title="The figures could not be read" action={{ label: 'Try again', onClick: state.retry }}>
          Check the connection, then try again.
        </FinanceNotice>
      )}
      {state.status === 'empty' && (
        <>
          {/* A branch with no sales yet can be chosen from outside. The control stays, so another can be chosen. */}
          {branchControl && <div className="mb-4">{branchControl}</div>}
          <FinanceNotice title="No paid orders yet">The figures start with the first one.</FinanceNotice>
        </>
      )}
      {state.status === 'ready' && (
        <>
          <FinanceFilterBar branchControl={branchControl} />
          <FinanceDownload open={downloading} onClose={closeDownload} />
          {children}
          {/* The server's own stamp, from the ledger. Never this machine's clock. */}
          <p className="mt-8 text-xs font-body text-neutral-gray">
            {readAt && `Read ${readAt}, Ghana time. `}Paid orders only. Delivery fees are not counted as sales.
          </p>
        </>
      )}
    </div>
  );
}
