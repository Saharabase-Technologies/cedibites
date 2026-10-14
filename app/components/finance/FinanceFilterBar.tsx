'use client';

import { useState, type ReactNode } from 'react';
import { SlidersIcon, XIcon } from '@phosphor-icons/react';
import { CustomSelect, FilterBar } from '@/app/inventory/_components';
import { LABEL } from '@/lib/finance/figures';
import { monthLabel } from '@/lib/finance/format';
import { useFinance, type FinanceFilterName } from './FinanceProvider';

/**
 * The page filters, the same on every Finance tab.
 *
 * Two groups: where and when (Branch, From, To), then which sales (Channel,
 * Order type, Payment). On a laptop the groups share a row. On a phone the
 * second folds behind More filters.
 *
 * A filter that is set shows as a chip under the row, so it stays in sight
 * when its control is folded away.
 */
export function FinanceFilterBar({
  branchControl,
}: {
  /** Stands in for the branch picker. The partner portal passes its own scope selector, which sets the branch filter. It keeps its own width. */
  branchControl?: ReactNode;
}) {
  const { book, filters, present, setFilters, clearFilter, clearFilters } = useFinance();
  const [moreOpen, setMoreOpen] = useState(false);

  const months = book.months.map(m => ({ value: m, label: monthLabel(m) }));
  const first = book.months[0], last = book.months[book.months.length - 1];
  const withAll = (kind: 'source' | 'type' | 'method', all: string) => [
    { value: 'all', label: all },
    ...present[kind].map(v => ({ value: v, label: LABEL[kind][v] || v })),
  ];

  const chips: { name: FinanceFilterName; label: string }[] = [];
  const branch = book.branches.find(b => b.id === filters.branch);
  if (!branchControl && branch) chips.push({ name: 'branch', label: branch.name });
  if (filters.from !== first || filters.to !== last) {
    chips.push({
      name: 'months',
      label: filters.from === filters.to ? monthLabel(filters.from) : `${monthLabel(filters.from)} to ${monthLabel(filters.to)}`,
    });
  }
  for (const kind of ['source', 'type', 'method'] as const) {
    if (filters[kind] !== 'all') chips.push({ name: kind, label: LABEL[kind][filters[kind]] || filters[kind] });
  }

  return (
    <FilterBar>
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
        <div className={branchControl ? 'w-full md:w-auto' : 'w-full md:w-40'}>
          {branchControl ?? (
            <CustomSelect
              fullWidth
              value={String(filters.branch)}
              onChange={v => setFilters({ branch: v })}
              options={[{ value: 'all', label: 'All branches' }, ...book.branches.map(b => ({ value: String(b.id), label: b.name }))]}
            />
          )}
        </div>
        <div className="flex flex-1 items-center gap-2 md:flex-none">
          <label htmlFor="finance-from" className="text-sm font-body text-neutral-gray">From</label>
          <div className="flex-1 md:flex-none md:w-36">
            <CustomSelect id="finance-from" fullWidth value={filters.from} onChange={v => setFilters({ from: v })} options={months} />
          </div>
        </div>
        <div className="flex flex-1 items-center gap-2 md:flex-none">
          <label htmlFor="finance-to" className="text-sm font-body text-neutral-gray">To</label>
          <div className="flex-1 md:flex-none md:w-36">
            <CustomSelect id="finance-to" fullWidth value={filters.to} onChange={v => setFilters({ to: v })} options={months} />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setMoreOpen(open => !open)}
        aria-expanded={moreOpen}
        aria-controls="finance-more-filters"
        className="md:hidden flex items-center gap-2 min-h-11 px-3.5 rounded-xl border border-[#f0e8d8] bg-neutral-card text-sm font-medium font-body text-text-dark cursor-pointer"
      >
        <SlidersIcon size={16} />
        More filters
      </button>

      <div
        id="finance-more-filters"
        className={`${moreOpen ? 'flex' : 'hidden'} md:flex flex-wrap items-center gap-3 w-full md:w-auto`}
      >
        <div className="w-full md:w-40">
          <CustomSelect fullWidth value={filters.source} onChange={v => setFilters({ source: v })} options={withAll('source', 'All channels')} />
        </div>
        <div className="w-full md:w-40">
          <CustomSelect fullWidth value={filters.type} onChange={v => setFilters({ type: v })} options={withAll('type', 'All order types')} />
        </div>
        <div className="w-full md:w-40">
          <CustomSelect fullWidth value={filters.method} onChange={v => setFilters({ method: v })} options={withAll('method', 'All payments')} />
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 w-full">
          {chips.map(chip => (
            <button
              key={chip.name}
              type="button"
              onClick={() => clearFilter(chip.name)}
              aria-label={`Remove the filter ${chip.label}`}
              className="flex items-center gap-2 min-h-11 pl-3.5 pr-3 rounded-full bg-neutral-light text-sm font-medium font-body text-text-dark hover:bg-[#f0e8d8] transition-colors cursor-pointer"
            >
              {chip.label}
              <XIcon size={14} weight="bold" className="text-neutral-gray" />
            </button>
          ))}
          {chips.length > 1 && (
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-11 px-2 text-sm font-medium font-body text-text-dark underline cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </FilterBar>
  );
}
