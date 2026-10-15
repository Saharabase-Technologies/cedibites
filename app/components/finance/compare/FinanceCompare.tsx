'use client';

import { PacePanel } from './PacePanel';
import { PeriodPanel } from './PeriodPanel';
import { SharePanel } from './SharePanel';
import { SincePanel } from './SincePanel';
import { VersusPanel } from './VersusPanel';

/**
 * The Compare tab, in the order of the plan's Section 6. The admin and the
 * partner portal both mount it inside the Finance shell.
 */
export function FinanceCompare() {
  return (
    <div className="flex flex-col gap-5 min-w-0">
      <PeriodPanel />
      <PacePanel />
      <SincePanel />
      <SharePanel />
      <VersusPanel />
    </div>
  );
}
