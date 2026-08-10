'use client';

import { ForkKnifeIcon, PencilSimpleIcon, StarIcon, TrashIcon } from '@phosphor-icons/react';
import { DataTable, RowActionsMenu, type DataTableColumn } from '@/app/inventory/_components';
import type { AdminMenuItem } from './types';
import { hasPricingOptions, optionRowsOf } from './types';

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
 * A summary only. The options themselves live in the expanded row — this used
 * to be the only place they appeared, crushed into four pills or a bare
 * min–max range, so anything with five or more options was unreadable without
 * opening the editor.
 */
function PriceSummary({ item }: { item: AdminMenuItem }) {
    if (!hasPricingOptions(item)) {
        return item.price != null
            ? <span className="text-text-dark text-sm font-semibold font-body">₵{item.price}</span>
            : <span className="text-neutral-gray text-sm font-body">—</span>;
    }

    const prices = optionRowsOf(item).map(r => Number(r.price)).filter(Boolean);
    if (!prices.length) return <span className="text-neutral-gray text-sm font-body">—</span>;

    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return (
        <span className="text-text-dark text-sm font-semibold font-body whitespace-nowrap">
            {min === max ? `₵${min}` : `₵${min} - ₵${max}`}
            <span className="text-neutral-gray font-normal text-xs ml-1.5">
                {prices.length} option{prices.length !== 1 ? 's' : ''}
            </span>
        </span>
    );
}

// ─── Expanded detail ──────────────────────────────────────────────────────────

/**
 * What the row cannot show: every option with its receipt name and price.
 * Returns null for single-price items, which have nothing to expand — the
 * table then renders no caret for them.
 */
function OptionDetail({ item }: { item: AdminMenuItem }) {
    const rows = optionRowsOf(item);

    return (
        <div className="py-1">
            <div className="grid grid-cols-[1fr_1.5fr_90px] gap-3 pb-2 mb-1 border-b border-[#f0e8d8]">
                {['Option', 'Receipt name', 'Price'].map((h, i) => (
                    <span
                        key={h}
                        className={`text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider ${i === 2 ? 'text-right' : ''}`}
                    >
                        {h}
                    </span>
                ))}
            </div>
            {rows.map((row, i) => (
                <div key={`${row.label}-${i}`} className="grid grid-cols-[1fr_1.5fr_90px] gap-3 py-1.5 items-center">
                    <span className="text-text-dark text-sm font-body">{row.label}</span>
                    <span className={`text-sm font-body ${row.displayName ? 'text-neutral-gray' : 'text-neutral-gray/40 italic'}`}>
                        {row.displayName || `falls back to "${row.label}"`}
                    </span>
                    <span className="text-text-dark text-sm font-semibold font-body text-right">
                        {row.price ? `₵${row.price}` : '—'}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ─── Table ────────────────────────────────────────────────────────────────────

export function ItemsTable({
    items,
    isLoading,
    onEdit,
    onDelete,
    onToggleAvailable,
}: {
    items: AdminMenuItem[];
    isLoading: boolean;
    onEdit: (item: AdminMenuItem) => void;
    onDelete: (item: AdminMenuItem) => void;
    onToggleAvailable: (item: AdminMenuItem) => void;
}) {
    const columns: DataTableColumn<AdminMenuItem>[] = [
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
                            <span className={`text-sm font-semibold font-body ${row.isAvailable ? 'text-text-dark' : 'text-neutral-gray/60 line-through'}`}>
                                {row.name}
                            </span>
                            {row.tags.map(t => <TagBadge key={t} tag={t} />)}
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
            sortValue: (row) => row.price ?? optionRowsOf(row).reduce((min, r) => Math.min(min, Number(r.price) || Infinity), Infinity),
            cell: (row) => <PriceSummary item={row} />,
        },
        {
            key: 'branches',
            header: 'Served at',
            hideBelow: 'lg',
            sortValue: (row) => row.branches?.length ?? 0,
            cell: (row) => {
                const served = row.branches?.filter(b => b.isAvailable).length ?? 0;
                const total = row.branches?.length ?? 0;

                // No pivot rows at all is a data gap, not "served nowhere" —
                // say so rather than showing a confident 0.
                if (!row.branches) {
                    return <span className="text-neutral-gray/50 text-sm font-body">—</span>;
                }
                if (total === 0) {
                    return <span className="text-error text-sm font-body">No branches</span>;
                }
                return (
                    <span className="text-sm font-body text-neutral-gray whitespace-nowrap">
                        <span className="text-text-dark font-semibold">{served}</span>
                        {` of ${total}`}
                    </span>
                );
            },
        },
        {
            key: 'rating',
            header: 'Rating',
            hideBelow: 'lg',
            align: 'right',
            sortValue: (row) => row.rating ?? -1,
            cell: (row) => (row.rating == null ? (
                <span className="text-neutral-gray/40 text-sm font-body">—</span>
            ) : (
                <span className="text-text-dark text-sm font-body inline-flex items-center gap-1 justify-end">
                    <StarIcon size={12} weight="fill" className="text-primary" />
                    {row.rating.toFixed(1)}
                    <span className="text-neutral-gray/60 text-xs">({row.ratingCount ?? 0})</span>
                </span>
            )),
        },
        {
            key: 'available',
            header: 'On sale',
            align: 'right',
            sortValue: (row) => (row.isAvailable ? 1 : 0),
            cell: (row) => (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleAvailable(row); }}
                    aria-label={row.isAvailable ? `Withdraw ${row.name}` : `Put ${row.name} on sale`}
                    className={`
                        px-2.5 py-1 rounded-lg text-xs font-medium font-body cursor-pointer transition-colors whitespace-nowrap
                        ${row.isAvailable
                            ? 'bg-secondary/10 text-secondary hover:bg-secondary/20'
                            : 'bg-neutral-light text-neutral-gray hover:bg-[#f0e8d8]'}
                    `}
                >
                    {row.isAvailable ? 'On sale' : 'Withdrawn'}
                </button>
            ),
        },
        {
            key: 'actions',
            header: '',
            align: 'right',
            width: 'w-12',
            cell: (row) => (
                <RowActionsMenu
                    actions={[
                        { label: 'Edit', icon: <PencilSimpleIcon size={14} weight="bold" />, onClick: () => onEdit(row) },
                        { label: 'Delete', icon: <TrashIcon size={14} weight="bold" />, onClick: () => onDelete(row), destructive: true },
                    ]}
                />
            ),
        },
    ];

    return (
        <DataTable
            data={items}
            columns={columns}
            rowKey={(row) => row.id}
            defaultSortKey="name"
            pageSize={15}
            isLoading={isLoading}
            expandedContent={(row) => (hasPricingOptions(row) ? <OptionDetail item={row} /> : null)}
            emptyState={
                <div className="px-4 py-16 text-center">
                    <ForkKnifeIcon size={32} weight="thin" className="text-neutral-gray/40 mx-auto mb-3" />
                    <p className="text-neutral-gray text-sm font-body">No items match your filters.</p>
                </div>
            }
        />
    );
}
