'use client';

import type { ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/app/inventory/_components';
import { SeriesKey } from './charts';

export { monthNote } from '@/lib/finance/format';

/**
 * What the Finance tabs share. Every table here is the kit's `DataTable`
 * drawn without its own card, since it already sits on a panel.
 */


/** A branch with its series colour, for the first cell of a row or a column heading. */
export function BranchName({ name, colour, strong }: { name: string; colour?: string; strong?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${strong ? 'font-semibold' : 'font-medium'}`}>
      {colour && <SeriesKey colour={colour} />}
      {name}
    </span>
  );
}

/** A figure with a quiet second line under it, such as the days it covers or the month it is. */
export function Figure({ value, under, strong }: { value: ReactNode; under?: ReactNode; strong?: boolean }) {
  return (
    <span className="whitespace-nowrap">
      <span className={strong ? 'font-bold' : undefined}>{value}</span>
      {under && <span className="block text-xs font-normal text-neutral-gray">{under}</span>}
    </span>
  );
}

/** A table of figures on a panel. Numbers line up in their columns. */
export function FigureTable<T>({
  rows,
  columns,
  rowKey,
  pageSize,
  defaultSortKey,
  defaultSortDir,
  empty,
  expandedContent,
  stickyFirst,
  stackOnPhone,
}: {
  rows: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => string | number;
  /** Left out, every row shows on one page. */
  pageSize?: number;
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
  empty?: string;
  /** What a row opens to show. The whole row opens it. */
  expandedContent?: (row: T) => ReactNode;
  stickyFirst?: boolean;
  stackOnPhone?: boolean;
}) {
  return (
    <div className="tabular-nums -mx-4 md:-mx-5 border-t border-[#f0e8d8] min-w-0">
      <DataTable
        framed={false}
        data={rows}
        columns={columns}
        rowKey={rowKey}
        pageSize={pageSize ?? Math.max(1, rows.length)}
        defaultSortKey={defaultSortKey}
        defaultSortDir={defaultSortDir}
        emptyState={empty ? <p className="py-8 text-center text-sm font-body text-neutral-gray">{empty}</p> : undefined}
        expandedContent={expandedContent}
        expandOnRowClick={!!expandedContent}
        stickyFirst={stickyFirst}
        stackOnPhone={stackOnPhone}
      />
    </div>
  );
}

/** A heading inside a section, over one of its tables. */
export function PartHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-base font-semibold font-body text-text-dark pt-2">{children}</h3>;
}
