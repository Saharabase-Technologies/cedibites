'use client';

import { ForkKnifeIcon } from '@phosphor-icons/react';
import { DataTable, type DataTableColumn } from '@/app/inventory/_components';
import type { BranchMenuRow } from './types';

// ─── Tag badge ────────────────────────────────────────────────────────────────

const TAG_STYLES: Record<string, string> = {
    spicy: 'bg-error/10 text-error',
    vegetarian: 'bg-secondary/10 text-secondary',
};

function TagBadge({ tag }: { tag: string }) {
    return (
        <span className={`text-[10px] font-medium font-body px-2 py-0.5 rounded-full capitalize ${TAG_STYLES[tag] ?? 'bg-neutral-light text-neutral-gray'}`}>
            {tag}
        </span>
    );
}

// ─── Price summary ────────────────────────────────────────────────────────────

/**
 * A summary only — the options themselves live in the expanded row. Prices are
 * read-only here: one menu, one price list, set by an administrator.
 */
function PriceSummary({ row }: { row: BranchMenuRow }) {
    const prices = row.options.map(o => o.price).filter(p => p > 0);

    if (!prices.length) {
        return row.price != null
            ? <span className="text-text-dark text-sm font-semibold font-body">₵{row.price}</span>
            : <span className="text-neutral-gray text-sm font-body">—</span>;
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return (
        <span className="text-text-dark text-sm font-semibold font-body whitespace-nowrap">
            {min === max ? `₵${min}` : `₵${min} - ₵${max}`}
            {prices.length > 1 && (
                <span className="text-neutral-gray font-normal text-xs ml-1.5">
                    {prices.length} options
                </span>
            )}
        </span>
    );
}

// ─── Expanded detail ──────────────────────────────────────────────────────────

function OptionDetail({ row }: { row: BranchMenuRow }) {
    return (
        <div className="py-1">
            <div className="grid grid-cols-[1fr_1.5fr_90px] gap-3 pb-2 mb-1 border-b border-[#f0e8d8]">
                {['Option', 'Receipt name', 'Price'].map((header, i) => (
                    <span
                        key={header}
                        className={`text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider ${i === 2 ? 'text-right' : ''}`}
                    >
                        {header}
                    </span>
                ))}
            </div>
            {row.options.map((option, i) => (
                <div key={`${option.label}-${i}`} className="grid grid-cols-[1fr_1.5fr_90px] gap-3 py-1.5 items-center">
                    <span className="text-text-dark text-sm font-body">{option.label}</span>
                    <span className={`text-sm font-body ${option.displayName ? 'text-neutral-gray' : 'text-neutral-gray/40 italic'}`}>
                        {option.displayName || `falls back to "${option.label}"`}
                    </span>
                    <span className="text-text-dark text-sm font-semibold font-body text-right">
                        {option.price ? `₵${option.price}` : '—'}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ─── Availability control ─────────────────────────────────────────────────────

/**
 * The branch manager's one menu power, and the only control on this page.
 *
 * Three outcomes, not two. A dish the admin has withdrawn company-wide is not
 * something a branch can put back, so it reads as withdrawn and does not
 * pretend to be clickable — the old screen showed the same red mark for that as
 * for "we ran out", against a toggle that silently did nothing.
 */
function AvailabilityControl({
    row,
    onToggle,
    pending,
}: {
    row: BranchMenuRow;
    onToggle: (row: BranchMenuRow) => void;
    pending: boolean;
}) {
    if (!row.availableEverywhere) {
        return (
            <span
                title="Withdrawn from the menu by an administrator. Only they can put it back."
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium font-body bg-neutral-light text-neutral-gray/70 whitespace-nowrap cursor-not-allowed"
            >
                Withdrawn
            </span>
        );
    }

    return (
        <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggle(row); }}
            disabled={pending}
            aria-label={row.availableHere ? `Mark ${row.name} sold out` : `Put ${row.name} back on`}
            title={row.availableHere
                ? 'On sale here. Click if you have run out.'
                : 'Sold out here. Click when it is back on.'}
            className={`
                inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold font-body
                cursor-pointer transition-colors whitespace-nowrap disabled:opacity-50
                ${row.availableHere
                    ? 'bg-secondary/15 text-secondary hover:bg-secondary/25'
                    : 'bg-primary/15 text-primary hover:bg-primary/25'}
            `}
        >
            {row.availableHere ? 'On sale' : 'Sold out'}
        </button>
    );
}

// ─── Table ────────────────────────────────────────────────────────────────────

export function BranchMenuTable({
    rows,
    isLoading,
    onToggle,
    pendingIds,
    branchName,
}: {
    rows: BranchMenuRow[];
    isLoading: boolean;
    onToggle: (row: BranchMenuRow) => void;
    pendingIds: Set<number>;
    branchName: string;
}) {
    const columns: DataTableColumn<BranchMenuRow>[] = [
        {
            key: 'name',
            header: 'Item',
            sortValue: (row) => row.name.toLowerCase(),
            cell: (row) => (
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {row.image
                            ? <img src={row.image} alt="" className="w-full h-full object-cover" />
                            : <ForkKnifeIcon size={15} weight="fill" className="text-primary" />}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-semibold font-body ${row.availableEverywhere ? 'text-text-dark' : 'text-neutral-gray/60 line-through'}`}>
                                {row.name}
                            </span>
                            {row.tags.map(tag => <TagBadge key={tag} tag={tag} />)}
                        </div>
                        {row.description && (
                            <p className="text-neutral-gray text-xs font-body mt-0.5 line-clamp-1">
                                {row.description}
                            </p>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'category',
            header: 'Category',
            sortValue: (row) => row.category,
            hideBelow: 'md',
            cell: (row) => <span className="text-neutral-gray text-sm font-body">{row.category}</span>,
        },
        {
            key: 'price',
            header: 'Price',
            hideBelow: 'sm',
            sortValue: (row) => row.price ?? row.options.reduce((min, o) => Math.min(min, o.price || Infinity), Infinity),
            cell: (row) => <PriceSummary row={row} />,
        },
        {
            key: 'available',
            header: `At ${branchName}`,
            align: 'right',
            // Withdrawn sorts last: it is not a state anyone here can act on.
            sortValue: (row) => (!row.availableEverywhere ? 2 : row.availableHere ? 1 : 0),
            cell: (row) => (
                <AvailabilityControl
                    row={row}
                    onToggle={onToggle}
                    pending={pendingIds.has(row.numericId)}
                />
            ),
        },
    ];

    return (
        <DataTable
            data={rows}
            columns={columns}
            rowKey={(row) => row.id}
            defaultSortKey="name"
            pageSize={15}
            isLoading={isLoading}
            expandedContent={(row) => (row.options.length > 1 ? <OptionDetail row={row} /> : null)}
            emptyState={
                <div className="px-4 py-16 text-center">
                    <ForkKnifeIcon size={32} weight="thin" className="text-neutral-gray/40 mx-auto mb-3" />
                    <p className="text-neutral-gray text-sm font-body">No dishes match your filters.</p>
                </div>
            }
        />
    );
}
