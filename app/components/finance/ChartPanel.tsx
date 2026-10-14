'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import { FunnelSimpleIcon, XIcon } from '@phosphor-icons/react';
import { CustomSelect } from '@/app/inventory/_components';
import { compute, LABEL, type Figures } from '@/lib/finance/figures';
import { useFinance } from './FinanceProvider';

/**
 * The frame every Finance chart sits in: the title, one row of controls, then
 * the chart.
 *
 * A chart can follow its own branch and payment instead of the page's. The
 * pickers hide behind Filter this chart. When one is set, a chip says so, and
 * its cross puts the chart back on the page filters.
 */

interface ChartChoice {
  branch: 'page' | number;
  method: string;
}

const ON_PAGE: ChartChoice = { branch: 'page', method: 'page' };

export interface ChartFilter {
  /** The figures this chart draws: the page's, or its own branch and payment over the page's months. */
  figures: Figures;
  choice: ChartChoice;
  setChoice: (patch: Partial<ChartChoice>) => void;
  /** What the chart is set to, as `Lakeside, MoMo`. Empty when it follows the page. */
  chip: string;
}

/** The figures for one chart, with its own branch and payment pick. */
export function useChartFilter(): ChartFilter {
  const { book, filters, figures, present } = useFinance();
  const [picked, setPicked] = useState<ChartChoice>(ON_PAGE);

  /* A pick the ledger no longer holds goes back to the page, so a chart never empties itself. */
  const branch = picked.branch !== 'page' ? book.branches.find(b => b.id === picked.branch) : undefined;
  const method = present.method.includes(picked.method) ? picked.method : 'page';
  const choice = useMemo<ChartChoice>(() => ({ branch: branch ? branch.id : 'page', method }), [branch, method]);

  const own = useMemo(() => {
    if (choice.branch === 'page' && choice.method === 'page') return figures;
    return compute(book, {
      ...filters,
      branch: choice.branch === 'page' ? filters.branch : choice.branch,
      method: choice.method === 'page' ? filters.method : choice.method,
    });
  }, [book, filters, figures, choice]);

  const chip = [branch?.name, method !== 'page' ? LABEL.method[method] || method : undefined].filter(Boolean).join(', ');

  return {
    figures: own,
    choice,
    setChoice: patch => setPicked(previous => ({ ...previous, ...patch })),
    chip,
  };
}

/** A caption and the control it names, such as Show and its tabs. */
export function ControlGroup({ caption, children }: { caption: string; children: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="flex flex-wrap items-center gap-2">
      <span id={id} className="text-xs font-semibold font-body text-[#6f6353]">{caption}</span>
      {children}
    </div>
  );
}

export function ChartPanel({
  title,
  sub,
  controls,
  filter,
  children,
}: {
  title: string;
  sub?: ReactNode;
  /** The Show and Chart groups. */
  controls?: ReactNode;
  /** Left out, the chart follows the page filters and offers no pick of its own. */
  filter?: ChartFilter;
  children: ReactNode;
}) {
  const { book, present } = useFinance();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const pickersId = useId();

  return (
    <section aria-labelledby={titleId} className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4 md:p-5 flex flex-col gap-3 min-w-0">
      <div>
        <h2 id={titleId} className="text-lg font-semibold font-body text-text-dark text-balance">{title}</h2>
        {sub && <p className="text-sm font-body text-neutral-gray mt-1">{sub}</p>}
      </div>

      {(controls || filter) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {controls}
          {filter && (
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              aria-expanded={open}
              aria-controls={pickersId}
              className="md:ml-auto flex items-center gap-2 min-h-11 px-3.5 rounded-xl border border-[#e3ddd0] bg-neutral-card text-sm font-medium font-body text-text-dark hover:border-neutral-gray/50 transition-colors cursor-pointer"
            >
              <FunnelSimpleIcon size={16} />
              Filter this chart
            </button>
          )}
        </div>
      )}

      {filter && (open || filter.chip) && (
        <div className="flex flex-wrap items-center gap-3">
          {open && (
            <div id={pickersId} className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor={`${pickersId}-branch`} className="text-sm font-body text-neutral-gray">Branch</label>
                <div className="w-44">
                  <CustomSelect
                    id={`${pickersId}-branch`}
                    size="sm"
                    fullWidth
                    value={String(filter.choice.branch)}
                    onChange={v => filter.setChoice({ branch: v === 'page' ? 'page' : Number(v) })}
                    options={[{ value: 'page', label: 'Same as the page' }, ...book.branches.map(b => ({ value: String(b.id), label: b.name }))]}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor={`${pickersId}-method`} className="text-sm font-body text-neutral-gray">Payment</label>
                <div className="w-44">
                  <CustomSelect
                    id={`${pickersId}-method`}
                    size="sm"
                    fullWidth
                    value={filter.choice.method}
                    onChange={v => filter.setChoice({ method: v })}
                    options={[{ value: 'page', label: 'Same as the page' }, ...present.method.map(v => ({ value: v, label: LABEL.method[v] || v }))]}
                  />
                </div>
              </div>
            </div>
          )}
          {filter.chip && (
            <button
              type="button"
              onClick={() => filter.setChoice({ branch: 'page', method: 'page' })}
              aria-label={`${filter.chip}. Put this chart back on the page filters`}
              className="flex items-center gap-2 min-h-11 pl-3.5 pr-3 rounded-full bg-neutral-light text-sm font-medium font-body text-text-dark hover:bg-[#f0e8d8] transition-colors cursor-pointer"
            >
              {filter.chip}
              <XIcon size={14} weight="bold" className="text-neutral-gray" />
            </button>
          )}
        </div>
      )}

      {children}
    </section>
  );
}

/** A quiet line under a chart, for what a mark means. */
export function ChartNote({ children }: { children: ReactNode }) {
  return <p className="text-sm font-body text-neutral-gray max-w-prose">{children}</p>;
}
