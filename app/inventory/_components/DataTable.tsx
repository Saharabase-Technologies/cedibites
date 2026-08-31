'use client';

import { Fragment, useEffect, useRef, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CaretLeftIcon, CaretRightIcon, DotsThreeIcon } from '@phosphor-icons/react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DataTableColumn<T> = {
  key: string;
  header: string;
  /** When provided, header becomes click-sortable. Should return a comparable value. */
  sortValue?: (row: T) => string | number;
  /** Render the cell content. */
  cell: (row: T, index: number) => ReactNode;
  /** Right-align both header and cell. */
  align?: 'left' | 'right';
  /** Optional fixed/min width as Tailwind class fragment, e.g. 'w-12'. */
  width?: string;
  /** Hide column below given breakpoint. */
  hideBelow?: 'sm' | 'md' | 'lg';
};

export type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  /** Stable row id resolver - defaults to index. */
  rowKey?: (row: T, index: number) => string | number;
  /** Default sort key (must match a column key with sortValue defined). */
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
  /** Page size; defaults to 10. */
  pageSize?: number;
  /** Empty state to render when data is empty. */
  emptyState?: ReactNode;
  /** Optional onClick handler for rows. */
  onRowClick?: (row: T) => void;
  /**
   * Rows that are waiting on a person. Marked with a gold edge so what needs
   * doing is obvious on landing, instead of having to read every status badge.
   * Matches the sidebar counters - same definition of "needs attention".
   */
  needsAttention?: (row: T) => boolean;
  /** Loading state - renders skeleton rows. */
  isLoading?: boolean;
  /** Show row index column ('#'). */
  showIndex?: boolean;
  /**
   * Detail panel revealed beneath a row when its caret is clicked. Adds a
   * chevron column and makes rows accordions.
   *
   * For content that belongs to the row but is too wide or too repetitive to
   * live in a cell - a menu item's pricing options, a PO's line items. Return
   * null for rows with nothing to show and they render without a caret.
   */
  expandedContent?: (row: T) => ReactNode;
  /**
   * Make the whole row open its detail panel, not just the caret.
   *
   * On a touch screen the caret is a 24px target in a 48px row, which is a
   * fiddly thing to hit with a thumb while holding a card machine. Off by
   * default because most tables here pair expansion with `onRowClick` doing
   * something else entirely; where both are set, `onRowClick` wins and this is
   * ignored.
   */
  expandOnRowClick?: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DataTable<T>({
  data,
  columns,
  rowKey,
  defaultSortKey,
  defaultSortDir = 'asc',
  pageSize = 10,
  emptyState,
  onRowClick,
  needsAttention,
  isLoading,
  showIndex,
  expandedContent,
  expandOnRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);
  const [page, setPage] = useState(1);
  // Keyed by row key so expansion survives a sort or a re-render, and so more
  // than one row can be open at once - comparing two items' options is the
  // reason to expand in the first place.
  const [expandedKeys, setExpandedKeys] = useState<Set<string | number>>(new Set());

  const toggleExpanded = (key: string | number) =>
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // ── Sort ──
  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return data;
    const fn = col.sortValue;
    return [...data].sort((a, b) => {
      const av = fn(a);
      const bv = fn(b);
      if (av === bv) return 0;
      const cmp = av < bv ? -1 : 1;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, columns, sortKey, sortDir]);

  // ── Paginate ──
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const sliceStart = (safePage - 1) * pageSize;
  const paged = sorted.slice(sliceStart, sliceStart + pageSize);

  function toggleSort(key: string) {
    const col = columns.find((c) => c.key === key);
    if (!col?.sortValue) return;
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const hideClass = (col: DataTableColumn<T>) => {
    switch (col.hideBelow) {
      case 'sm': return 'hidden sm:table-cell';
      case 'md': return 'hidden md:table-cell';
      case 'lg': return 'hidden lg:table-cell';
      default:   return '';
    }
  };

  // ── Empty / loading ──
  if (isLoading) {
    return (
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4">
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-neutral-light rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl">
        {emptyState ?? (
          <div className="flex items-center justify-center h-32 text-neutral-gray text-base font-body">
            No data
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-body">
          <thead>
            <tr className="border-b border-[#f0e8d8]">
              {expandedContent && <th className="w-9 py-3 px-2" aria-label="Expand" />}
              {showIndex && (
                <th className="text-neutral-gray text-[10px] font-bold uppercase tracking-wider py-3 px-4 text-left w-10 select-none">
                  #
                </th>
              )}
              {columns.map((col) => {
                const sortable = !!col.sortValue;
                const active = sortable && sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={sortable ? () => toggleSort(col.key) : undefined}
                    className={`
                      text-[10px] font-bold uppercase tracking-wider py-3 px-4 select-none whitespace-nowrap transition-colors
                      ${col.align === 'right' ? 'text-right' : 'text-left'}
                      ${col.width ?? ''}
                      ${hideClass(col)}
                      ${sortable ? 'cursor-pointer' : ''}
                      ${active ? 'text-primary' : 'text-neutral-gray hover:text-text-dark'}
                    `}
                  >
                    {col.header}
                    {active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, idx) => {
              const key = rowKey ? rowKey(row, sliceStart + idx) : sliceStart + idx;
              const detail = expandedContent?.(row);
              const isExpanded = expandedKeys.has(key);
              const colSpan = columns.length + (showIndex ? 1 : 0) + (expandedContent ? 1 : 0);
              return (
                <Fragment key={key}>
                  <tr
                    onClick={
                      onRowClick
                        ? () => onRowClick(row)
                        : expandOnRowClick && detail
                          ? () => toggleExpanded(key)
                          : undefined
                    }
                    className={`
                      border-b border-[#f0e8d8] transition-colors
                      ${isExpanded ? 'bg-primary/5' : ''}
                      ${onRowClick || (expandOnRowClick && detail) ? 'cursor-pointer hover:bg-primary/5' : 'hover:bg-primary/5'}
                      ${needsAttention?.(row) ? 'bg-primary/6 shadow-[inset_3px_0_0_0_var(--color-primary)]' : ''}
                    `}
                  >
                    {expandedContent && (
                      <td className="py-3 pl-3 pr-0 align-middle">
                        {detail ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleExpanded(key); }}
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                            className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer text-neutral-gray hover:text-text-dark hover:bg-neutral-light transition-colors"
                          >
                            <CaretRightIcon
                              size={12}
                              weight="bold"
                              className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            />
                          </button>
                        ) : null}
                      </td>
                    )}
                    {showIndex && (
                      <td className="py-3 px-4 text-neutral-gray/60 text-xs">
                        {sliceStart + idx + 1}
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`
                          py-3 px-4 text-text-dark
                          ${col.align === 'right' ? 'text-right' : 'text-left'}
                          ${hideClass(col)}
                        `}
                      >
                        {col.cell(row, sliceStart + idx)}
                      </td>
                    ))}
                  </tr>
                  {isExpanded && detail && (
                    <tr className="border-b border-[#f0e8d8]">
                      <td colSpan={colSpan} className="bg-neutral-light/40 px-4 py-3">
                        {detail}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination footer ───────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[#f0e8d8] text-xs font-body">
          <p className="text-neutral-gray">
            Showing <span className="text-text-dark font-semibold">{sliceStart + 1}</span>
            {'–'}
            <span className="text-text-dark font-semibold">
              {Math.min(sliceStart + pageSize, sorted.length)}
            </span>
            {' of '}
            <span className="text-text-dark font-semibold">{sorted.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <PageButton
              disabled={safePage === 1}
              onClick={() => setPage(safePage - 1)}
              aria-label="Previous page"
            >
              <CaretLeftIcon size={12} weight="bold" />
            </PageButton>
            {pageRange(safePage, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`gap-${i}`} className="px-2 text-neutral-gray/60">…</span>
              ) : (
                <PageButton
                  key={p}
                  active={p === safePage}
                  onClick={() => setPage(p as number)}
                >
                  {p}
                </PageButton>
              ),
            )}
            <PageButton
              disabled={safePage === totalPages}
              onClick={() => setPage(safePage + 1)}
              aria-label="Next page"
            >
              <CaretRightIcon size={12} weight="bold" />
            </PageButton>
          </div>
        </div>
      )}

      {totalPages === 1 && (
        <div className="px-4 py-2.5 border-t border-[#f0e8d8] text-xs font-body text-neutral-gray">
          {sorted.length} row{sorted.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

// ─── Pagination helpers ───────────────────────────────────────────────────────

function PageButton({
  children,
  active,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`
        min-w-7 h-7 px-2 rounded-lg text-xs font-medium font-body transition-colors cursor-pointer
        flex items-center justify-center
        ${active
          ? 'bg-primary text-white'
          : 'text-neutral-gray hover:text-text-dark hover:bg-neutral-light'}
        disabled:opacity-30 disabled:cursor-not-allowed
      `}
    >
      {children}
    </button>
  );
}

function pageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const range: (number | '…')[] = [1];
  if (current > 3) range.push('…');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) range.push(i);
  if (current < total - 2) range.push('…');
  range.push(total);
  return range;
}

// ─── Row-action button (for edit/delete inline icons) ─────────────────────────

export function RowActionButton({
  icon,
  onClick,
  label,
  destructive,
}: {
  icon: ReactNode;
  onClick: () => void;
  label: string;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      className={`
        w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors
        ${destructive
          ? 'text-neutral-gray hover:text-red-500 hover:bg-red-50'
          : 'text-neutral-gray hover:text-text-dark hover:bg-neutral-light'}
      `}
    >
      {icon}
    </button>
  );
}

// ─── Three-dot actions menu ────────────────────────────────────────────────────

export type RowAction = {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  destructive?: boolean;
};

export function RowActionsMenu({ actions }: { actions: RowAction[] }) {
  const [open, setOpen] = useState(false);
  // Fixed viewport coords so the menu escapes the table's overflow clipping.
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setCoords({ top: r.bottom + 4, right: window.innerWidth - r.right });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    // The menu is fixed-positioned; close it if the page scrolls/resizes.
    function onReflow() {
      setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  }, [open]);

  return (
    <span className="inline-flex">
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); open ? setOpen(false) : openMenu(); }}
        aria-label="More actions"
        className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors text-neutral-gray hover:text-text-dark hover:bg-neutral-light"
      >
        <DotsThreeIcon size={16} weight="bold" />
      </button>

      {open && coords && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: coords.top, right: coords.right, zIndex: 9999 }}
            className="min-w-35 bg-neutral-card border border-[#f0e8d8] rounded-xl shadow-lg overflow-hidden"
          >
            {actions.map((action, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  action.onClick();
                }}
                className={`
                  w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-body text-left
                  transition-colors cursor-pointer
                  ${action.destructive
                    ? 'text-red-500 hover:bg-red-50'
                    : 'text-text-dark hover:bg-neutral-light'}
                `}
              >
                {action.icon && (
                  <span className="shrink-0 opacity-70">{action.icon}</span>
                )}
                {action.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </span>
  );
}
