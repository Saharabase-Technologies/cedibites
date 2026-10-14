'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useFinanceLedger } from '@/lib/api/hooks/useFinance';
import { compute, openBook, type Figures, type FigureFilters, type FinanceBook } from '@/lib/finance/figures';
import type { FinanceLedgerFilters } from '@/types/finance';

/**
 * One ledger read for the whole Finance section, and the page filters every
 * tab shares.
 *
 * It is mounted by the section's layout, which App Router keeps in place
 * while you move between the tabs. So the ledger is read once, and a filter
 * set on Overview still holds on Compare.
 *
 * The ledger is read whole, with no `from`. The months are chosen here, on
 * the screen: a day the endpoint left out would count as a day a branch was
 * open and sold nothing.
 */

export type FinanceFilterName = 'branch' | 'months' | 'source' | 'type' | 'method';

/** What was picked in the filter row. A null month follows the ledger: its first month for From, its last for To. */
interface Choice {
  branch: 'all' | number;
  from: string | null;
  to: string | null;
  source: string;
  type: string;
  method: string;
}

const NO_CHOICE: Choice = { branch: 'all', from: null, to: null, source: 'all', type: 'all', method: 'all' };

export interface FinanceReady {
  book: FinanceBook;
  /** The page filters, with the months filled in. */
  filters: FigureFilters;
  /** The chosen branches over the chosen months. */
  figures: Figures;
  /** Each source, type and payment method the ledger holds, in the order it first appears. */
  present: { source: string[]; type: string[]; method: string[] };
  setFilters: (patch: Partial<FigureFilters>) => void;
  /** Puts one filter back to everything. */
  clearFilter: (name: FinanceFilterName) => void;
  clearFilters: () => void;
}

export type FinanceState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  /** The ledger came back with no branch that has sold. */
  | { status: 'empty' }
  | ({ status: 'ready' } & FinanceReady);

const FinanceContext = createContext<FinanceState | null>(null);

const distinct = (values: string[]): string[] => [...new Set(values)];

export function FinanceProvider({
  scope,
  children,
}: {
  /** The branches to read. Left out, the endpoint sends every branch the caller may see. */
  scope?: Pick<FinanceLedgerFilters, 'branch_id' | 'branch_ids'>;
  children: ReactNode;
}) {
  const { data, isLoading, isError, refetch } = useFinanceLedger(scope);
  const [choice, setChoice] = useState<Choice>(NO_CHOICE);

  const book = useMemo(() => (data ? openBook(data) : null), [data]);

  const present = useMemo(() => {
    const sales = book ? book.ledger.sales : [];
    return {
      source: distinct(sales.map(row => row[2])),
      type: distinct(sales.map(row => row[3])),
      method: distinct(sales.map(row => row[4])),
    };
  }, [book]);

  /* A choice the ledger no longer holds falls back to everything, so a stale pick never empties the page. */
  const filters = useMemo<FigureFilters | null>(() => {
    if (!book || !book.months.length) return null;
    const first = book.months[0], last = book.months[book.months.length - 1];
    const from = choice.from && book.months.includes(choice.from) ? choice.from : first;
    const to = choice.to && book.months.includes(choice.to) ? choice.to : last;
    return {
      branch: choice.branch !== 'all' && book.branches.some(b => b.id === choice.branch) ? choice.branch : 'all',
      from,
      to: to < from ? from : to,
      source: present.source.includes(choice.source) ? choice.source : 'all',
      type: present.type.includes(choice.type) ? choice.type : 'all',
      method: present.method.includes(choice.method) ? choice.method : 'all',
    };
  }, [book, choice, present]);

  const figures = useMemo(() => (book && filters ? compute(book, filters) : null), [book, filters]);

  const setFilters = useCallback((patch: Partial<FigureFilters>) => {
    setChoice(previous => {
      const next: Choice = { ...previous, ...patch, branch: previous.branch };
      if (patch.branch !== undefined) next.branch = patch.branch === 'all' ? 'all' : Number(patch.branch);
      /* A span that would end before it starts: the month just picked wins. */
      if (next.from && next.to && next.from > next.to) {
        if (patch.from) next.to = next.from;
        else next.from = next.to;
      }
      return next;
    });
  }, []);

  const clearFilter = useCallback((name: FinanceFilterName) => {
    setChoice(previous => (
      name === 'months' ? { ...previous, from: null, to: null }
        : name === 'branch' ? { ...previous, branch: 'all' }
          : { ...previous, [name]: 'all' }
    ));
  }, []);

  const clearFilters = useCallback(() => setChoice(NO_CHOICE), []);

  const state = useMemo<FinanceState>(() => {
    if (book && filters && figures) {
      return { status: 'ready', book, filters, figures, present, setFilters, clearFilter, clearFilters };
    }
    if (book) return { status: 'empty' };
    if (isError && !isLoading) return { status: 'error', retry: () => { void refetch(); } };
    return { status: 'loading' };
  }, [book, filters, figures, present, setFilters, clearFilter, clearFilters, isError, isLoading, refetch]);

  return <FinanceContext.Provider value={state}>{children}</FinanceContext.Provider>;
}

/** Where the ledger read stands. For the shell, which draws the loading, empty and error states. */
export function useFinanceState(): FinanceState {
  const state = useContext(FinanceContext);
  if (!state) throw new Error('useFinanceState must be used inside FinanceProvider');
  return state;
}

/** The book, the filters and the figures. For a Finance page, which the shell mounts only once the ledger is read. */
export function useFinance(): FinanceReady {
  const state = useFinanceState();
  if (state.status !== 'ready') throw new Error('useFinance must be used on a page the Finance shell has mounted');
  return state;
}
