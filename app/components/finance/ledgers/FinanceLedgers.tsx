'use client';

import { CancelledPanel } from './CancelledPanel';
import { PaidByPanel } from './PaidByPanel';
import { SoldPanel } from './SoldPanel';
import { StatementPanel } from './StatementPanel';
import { TakingsPanel } from './TakingsPanel';

/**
 * The Ledgers tab, in the order of the plan's Section 6. The admin and the
 * partner portal both mount it inside the Finance shell.
 */
export function FinanceLedgers() {
  return (
    <div className="flex flex-col gap-5 min-w-0">
      <StatementPanel />
      <TakingsPanel />
      <CancelledPanel />
      <PaidByPanel />
      <SoldPanel />
    </div>
  );
}
