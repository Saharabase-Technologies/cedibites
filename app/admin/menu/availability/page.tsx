'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckIcon, MinusIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { FilterBar, FilterSelect, SearchBar } from '@/app/inventory/_components';
import {
    menuBranchAvailabilityService,
    type AvailabilityMatrix,
} from '@/lib/api/services/menuBranchAvailability.service';
import { toast } from '@/lib/utils/toast';

/**
 * Which branches serve which dishes.
 *
 * Replaces the per-item Branch dropdown, which showed `menu_items.branch_id` —
 * the branch that first entered the dish, not where it is served. After
 * menu:unify that read "Mother Kitchen" for everything while the pivot said
 * otherwise.
 *
 * Three states per cell, not two:
 *   served      — on the branch's menu, on sale
 *   sold out    — on the menu, the branch has marked it out today
 *   not served  — not on that branch's menu at all
 *
 * The middle one is the branch manager's to set and unset each day. An admin
 * clicking a cell toggles the outer question (served / not served) and leaves
 * today's sold-out flag alone.
 */

type CellState = 'served' | 'sold-out' | 'not-served';

const EMPTY: AvailabilityMatrix = { branches: [], items: [] };
const QUERY_KEY = ['admin-menu-branch-availability'];

export default function MenuAvailabilityPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [pending, setPending] = useState<Set<string>>(new Set());

    const { data: matrix = EMPTY, isLoading } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: () => menuBranchAvailabilityService.matrix(),
        staleTime: 60 * 1000,
    });

    /** Optimistic cell writes go straight into the cache, so there is one copy. */
    function patchCache(update: (prev: AvailabilityMatrix) => AvailabilityMatrix) {
        queryClient.setQueryData<AvailabilityMatrix>(QUERY_KEY, prev => update(prev ?? EMPTY));
    }

    function reload() {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    }

    const categories = useMemo(
        () => Array.from(new Set(matrix.items.map(i => i.category).filter((c): c is string => !!c))).sort(),
        [matrix.items],
    );

    const rows = useMemo(() => {
        let list = matrix.items;
        if (category) list = list.filter(i => i.category === category);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(i => i.name.toLowerCase().includes(q));
        }
        return list;
    }, [matrix.items, category, search]);

    function cellState(item: AvailabilityMatrix['items'][number], branchId: number): CellState {
        const key = String(branchId);
        if (!(key in item.branches)) return 'not-served';
        return item.branches[key] ? 'served' : 'sold-out';
    }

    /**
     * One click, and it always moves toward "on sale here" — except when it is
     * already there, when it takes the dish off the branch.
     *
     *   not served → served
     *   sold out   → served      (clears the branch's flag)
     *   served     → not served
     *
     * The middle case used to compute `served = current === 'not-served'`,
     * which for a sold-out cell is `false` — so the only click available on an
     * amber cell *removed the dish from the branch*. Combined with the API
     * having no way to clear the flag at all, a branch that read sold out could
     * only be fixed by removing the dish and adding it back.
     */
    async function toggleCell(itemId: number, branchId: number, current: CellState) {
        const key = `${itemId}:${branchId}`;
        if (pending.has(key)) return;

        setPending(prev => new Set(prev).add(key));

        const next: CellState = current === 'served' ? 'not-served' : 'served';

        // Optimistic — the grid is the only place this state is visible, and a
        // lag on a cell click reads as a click that did not register.
        patchCache(prev => ({
            ...prev,
            items: prev.items.map(item => {
                if (item.id !== itemId) return item;
                const branches = { ...item.branches };
                if (next === 'served') branches[String(branchId)] = true;
                else delete branches[String(branchId)];
                return { ...item, branches };
            }),
        }));

        try {
            if (current === 'sold-out') {
                await menuBranchAvailabilityService.setAvailableHere(itemId, branchId, true);
            } else {
                await menuBranchAvailabilityService.setServed(itemId, branchId, next === 'served');
            }
        } catch {
            toast.error('Could not change that. Reloading.');
            reload();
        } finally {
            setPending(prev => {
                const nextPending = new Set(prev);
                nextPending.delete(key);
                return nextPending;
            });
        }
    }

    async function toggleRow(itemId: number, served: boolean) {
        try {
            await menuBranchAvailabilityService.setServedEverywhere(itemId, served);
            reload();
        } catch {
            toast.error('Could not update every branch.');
        }
    }

    return (
        <>
            <div className="mb-4">
                <p className="text-neutral-gray text-sm font-body">
                    Which branches serve which dishes. A branch marking something sold out for the day
                    is shown here but set by the branch.
                </p>
            </div>

            <FilterBar>
                <SearchBar value={search} onChange={setSearch} placeholder="Search dishes…" />
                <FilterSelect
                    value={category}
                    onChange={setCategory}
                    placeholder="All categories"
                    options={categories.map(c => ({ value: c, label: c }))}
                />
            </FilterBar>

            <Legend />

            {isLoading ? (
                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4 space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-10 bg-neutral-light rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-16 text-center">
                    <p className="text-neutral-gray text-sm font-body">No dishes match your filters.</p>
                </div>
            ) : (
                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm font-body">
                            <thead>
                                <tr className="border-b border-[#f0e8d8]">
                                    <th className="text-left text-neutral-gray text-[10px] font-bold uppercase tracking-wider py-3 px-4 min-w-56">
                                        Dish
                                    </th>
                                    {matrix.branches.map(branch => (
                                        <th
                                            key={branch.id}
                                            className="text-center text-neutral-gray text-[10px] font-bold uppercase tracking-wider py-3 px-3 whitespace-nowrap"
                                        >
                                            {branch.name}
                                        </th>
                                    ))}
                                    <th className="text-right text-neutral-gray text-[10px] font-bold uppercase tracking-wider py-3 px-4 whitespace-nowrap">
                                        All
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(item => {
                                    const servedCount = matrix.branches
                                        .filter(b => cellState(item, b.id) !== 'not-served').length;
                                    const allServed = servedCount === matrix.branches.length;

                                    return (
                                        <tr key={item.id} className="border-b border-[#f0e8d8] last:border-0 hover:bg-primary/5 transition-colors">
                                            <td className="py-2.5 px-4">
                                                <p className={`text-sm font-medium font-body ${item.available_everywhere ? 'text-text-dark' : 'text-neutral-gray/60 line-through'}`}>
                                                    {item.name}
                                                </p>
                                                <p className="text-neutral-gray text-xs font-body">
                                                    {item.category ?? 'Uncategorised'}
                                                    {!item.available_everywhere && (
                                                        <span className="text-neutral-gray/70"> · withdrawn everywhere</span>
                                                    )}
                                                </p>
                                            </td>

                                            {matrix.branches.map(branch => {
                                                const state = cellState(item, branch.id);
                                                return (
                                                    <td key={branch.id} className="py-2.5 px-3 text-center">
                                                        <Cell
                                                            state={state}
                                                            disabled={pending.has(`${item.id}:${branch.id}`)}
                                                            label={`${item.name} at ${branch.name}`}
                                                            onClick={() => toggleCell(item.id, branch.id, state)}
                                                        />
                                                    </td>
                                                );
                                            })}

                                            <td className="py-2.5 px-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleRow(item.id, !allServed)}
                                                    className="text-xs font-medium font-body text-primary hover:opacity-80 transition-opacity cursor-pointer whitespace-nowrap"
                                                >
                                                    {allServed ? 'Remove all' : 'Serve all'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-4 py-2.5 border-t border-[#f0e8d8] text-xs font-body text-neutral-gray">
                        {rows.length} dish{rows.length !== 1 ? 'es' : ''} × {matrix.branches.length} branch{matrix.branches.length !== 1 ? 'es' : ''}
                    </div>
                </div>
            )}
        </>
    );
}

// ─── Cell ─────────────────────────────────────────────────────────────────────

function Cell({
    state,
    onClick,
    disabled,
    label,
}: {
    state: CellState;
    onClick: () => void;
    disabled: boolean;
    label: string;
}) {
    const styles: Record<CellState, string> = {
        'served': 'bg-secondary/15 text-secondary hover:bg-secondary/25',
        'sold-out': 'bg-primary/15 text-primary hover:bg-primary/25',
        'not-served': 'bg-neutral-light text-neutral-gray/40 hover:bg-[#eceae7]',
    };

    const titles: Record<CellState, string> = {
        'served': `Served — ${label}. Click to remove from this branch.`,
        'sold-out': `Sold out today — ${label}. Set by the branch; click to put it back on sale here.`,
        'not-served': `Not served — ${label}. Click to add to this branch.`,
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={titles[state]}
            aria-label={titles[state]}
            className={`w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 ${styles[state]}`}
        >
            {state === 'served' && <CheckIcon size={14} weight="bold" />}
            {state === 'sold-out' && <WarningCircleIcon size={14} weight="fill" />}
            {state === 'not-served' && <MinusIcon size={12} weight="bold" />}
        </button>
    );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
    const entries: { state: CellState; label: string; hint: string }[] = [
        { state: 'served', label: 'Served', hint: 'on the menu here' },
        { state: 'sold-out', label: 'Sold out today', hint: 'set by the branch' },
        { state: 'not-served', label: 'Not served', hint: 'not on this menu' },
    ];

    return (
        <div className="flex flex-wrap gap-4 mb-4 px-1">
            {entries.map(({ state, label, hint }) => (
                <span key={state} className="inline-flex items-center gap-2 text-xs font-body text-neutral-gray">
                    <Cell state={state} onClick={() => {}} disabled label={label} />
                    <span>
                        <span className="text-text-dark font-medium">{label}</span>
                        <span className="text-neutral-gray/70"> · {hint}</span>
                    </span>
                </span>
            ))}
        </div>
    );
}
