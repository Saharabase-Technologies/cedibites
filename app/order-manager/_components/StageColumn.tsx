'use client';

import type { ReactNode } from 'react';
import { STAGE, type BoardStage } from './board.constants';

/**
 * One column of the board.
 *
 * Each column scrolls independently, so a long Cooking queue never pushes the
 * New column off the bottom of a tablet — on the old single grid, a busy night
 * put the newest, most urgent tickets below the fold.
 *
 * The header is sticky within its own column and carries the count, because on
 * a wall-mounted screen the count is read from across the room far more often
 * than any individual ticket is.
 */
export function StageColumn({
  stage,
  count,
  children,
  isEmpty,
  emptyLabel,
}: {
  stage: BoardStage;
  count: number;
  children: ReactNode;
  isEmpty: boolean;
  emptyLabel: string;
}) {
  const tone = STAGE[stage];

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-[#f0e8d8] bg-neutral-light/60">
      <header className="sticky top-0 z-20 flex shrink-0 items-center gap-2 rounded-t-2xl border-b border-[#f0e8d8] bg-neutral-light/95 px-3 py-2.5 backdrop-blur">
        <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
        <h2 className="font-brand text-sm font-bold uppercase tracking-wide text-text-dark">
          {tone.columnLabel}
        </h2>
        <span
          className={`
            ml-auto flex h-6 min-w-6 items-center justify-center rounded-full px-1.5
            font-body text-xs font-bold tabular-nums
            ${count > 0 ? `${tone.dot} text-white` : 'bg-neutral-card text-neutral-gray'}
          `}
        >
          {count}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-2.5">
        {isEmpty ? (
          <p className="px-2 py-8 text-center font-body text-xs text-neutral-gray">{emptyLabel}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
