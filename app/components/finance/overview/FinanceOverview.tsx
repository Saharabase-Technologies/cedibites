'use client';

import { DailyPanel } from './DailyPanel';
import { MonthGrid } from './MonthGrid';
import { MonthPanel } from './MonthPanel';
import { OverviewFigures } from './OverviewFigures';
import { WeekPanel } from './WeekPanel';

/**
 * The Overview tab, in the order of the plan's Section 6. The admin and the
 * partner portal both mount it inside the Finance shell.
 */
export function FinanceOverview() {
  return (
    <div className="flex flex-col gap-5 min-w-0">
      <OverviewFigures />
      <MonthPanel />
      <MonthGrid />
      <DailyPanel />
      <WeekPanel />
    </div>
  );
}
