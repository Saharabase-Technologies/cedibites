'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { InfoIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { FilterBar, FilterSelect, SearchBar } from '@/app/inventory/_components';
import { useMenuItems } from '@/lib/api/hooks/useMenuItems';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import {
    menuAvailabilityService,
    type BranchMenuAvailability,
} from '@/lib/api/services/menuAvailability.service';
import { toast } from '@/lib/utils/toast';
import { BranchMenuTable } from './_components/BranchMenuTable';
import {
    AVAILABILITY_FILTERS,
    isOnSale,
    matchesAvailability,
    type AvailabilityFilter,
    type BranchMenuRow,
} from './_components/types';

/**
 * The branch's menu.
 *
 * Rebuilt on the same components as the admin's, and cut down to the one thing
 * a branch manager may actually change. Phase 3 made the menu one menu across
 * every branch, so creating, renaming, repricing, retagging and deleting are
 * company-level and belong to the Admin — a manager holds only
 * `menu.availability.manage` and would get a 403 from all of it. The previous
 * page was a ~1000-line copy of the old admin editor that offered every one of
 * those affordances behind a permission check, which meant maintaining a second
 * copy of the whole editor to hide it.
 *
 * What is left is the question a branch actually asks each morning: what are we
 * out of today.
 */
export default function ManagerMenuPage() {
    const { staffUser } = useStaffAuth();
    const branchId = staffUser?.branches?.[0]?.id ? Number(staffUser.branches[0].id) : undefined;
    const branchName = staffUser?.branches?.[0]?.name ?? 'this branch';

    const { items: menuItems, isLoading: menuLoading } = useMenuItems(
        branchId ? { branch_id: branchId } : undefined,
    );

    const queryClient = useQueryClient();
    const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [availability, setAvailability] = useState<AvailabilityFilter>('');

    // The branch's own flags. A separate query from the menu itself because
    // they come from a different endpoint and move far more often — a dish runs
    // out mid-service, its price does not.
    const flagsKey = ['branch-menu-availability', branchId] as const;
    const {
        data: flagRows = [],
        isLoading: flagsLoading,
        isError: flagsFailed,
    } = useQuery({
        queryKey: flagsKey,
        queryFn: () => menuAvailabilityService.list(branchId!),
        enabled: !!branchId,
        staleTime: 30 * 1000,
    });

    const flags = useMemo(
        () => Object.fromEntries(flagRows.map(row => [
            row.id,
            { everywhere: row.available_everywhere, here: row.available_here },
        ])),
        [flagRows],
    );

    /** Optimistic writes go into the query cache, so there is one copy of this. */
    function patchFlag(menuItemId: number, here: boolean) {
        queryClient.setQueryData<BranchMenuAvailability[]>(flagsKey, prev =>
            (prev ?? []).map(row => (row.id === menuItemId ? { ...row, available_here: here } : row)));
    }

    const rows = useMemo<BranchMenuRow[]>(() => menuItems.map(item => {
        const flag = flags[item.numericId];
        return {
            id: item.id,
            numericId: item.numericId,
            name: item.name,
            description: item.description,
            category: item.category,
            image: item.image ?? item.sizes?.find(s => s.image)?.image,
            price: item.price,
            options: (item.sizes ?? [])
                .filter(size => size.key !== 'standard')
                .map(size => ({
                    label: size.label,
                    displayName: size.displayName ?? '',
                    price: size.price,
                })),
            tags: item.tags?.map(t => t.slug) ?? [],
            // Default true only until the flags land. Defaulting true after a
            // failed read is what made every row render green however many
            // things the branch had marked off.
            availableEverywhere: flag?.everywhere ?? item.isAvailable,
            availableHere: flag?.here ?? true,
        };
    }), [menuItems, flags]);

    const categories = useMemo(
        () => Array.from(new Set(rows.map(r => r.category).filter(Boolean))).sort(),
        [rows],
    );

    const filtered = useMemo(() => {
        let list = rows;
        if (category) list = list.filter(r => r.category === category);
        if (availability) list = list.filter(r => matchesAvailability(r, availability));
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(r =>
                r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
        }
        return list;
    }, [rows, category, availability, search]);

    const onSaleCount = useMemo(() => rows.filter(isOnSale).length, [rows]);
    const soldOutCount = useMemo(
        () => rows.filter(r => r.availableEverywhere && !r.availableHere).length,
        [rows],
    );

    /**
     * Sold out here, not withdrawn everywhere.
     *
     * Writes the branch pivot through the dedicated endpoint. It must not go
     * through menuService.updateItem, which sets `menu_items.is_available` and
     * would take the dish off every branch in the business — and needs
     * `manage_menu`, which a manager does not hold.
     */
    async function toggleAvailability(row: BranchMenuRow) {
        if (!branchId || !row.availableEverywhere) return;

        const next = !row.availableHere;

        setPendingIds(prev => new Set(prev).add(row.numericId));
        // Optimistic: this gets pressed at a counter with a customer waiting.
        patchFlag(row.numericId, next);

        try {
            await menuAvailabilityService.setAvailable(branchId, row.numericId, next);
            toast.success(next ? `${row.name} is back on.` : `${row.name} marked sold out.`);
        } catch {
            patchFlag(row.numericId, !next);
            toast.error('Could not update availability.');
        } finally {
            setPendingIds(prev => {
                const nextPending = new Set(prev);
                nextPending.delete(row.numericId);
                return nextPending;
            });
        }
    }

    if (!branchId) {
        return (
            <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-16 text-center">
                    <p className="text-neutral-gray text-sm font-body">
                        Your account is not assigned to a branch, so there is no menu to show.
                    </p>
                </div>
            </div>
        );
    }

    return (
        // max-w-6xl, matching the admin menu and the inventory pages, so the
        // content stops jumping as you move between sections.
        <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
            <div className="mb-5">
                <h1 className="text-2xl font-bold font-brand text-text-dark">Menu</h1>
                <p className="text-neutral-gray text-sm font-body mt-1">
                    What {branchName} is serving today. Mark a dish sold out when you run out of it —
                    it stays on the menu at every other branch.
                </p>
            </div>

            {/* A failed read leaves every row defaulting to "on sale", which is
                indistinguishable from a branch that has run out of nothing. It
                has to be said on the page — a toast is gone in four seconds and
                the wrong menu stays up. */}
            {flagsFailed ? (
                <div className="mb-4 flex items-start gap-2.5 px-4 py-3 bg-error/5 border border-error/20 rounded-xl">
                    <WarningCircleIcon size={16} weight="fill" className="text-error shrink-0 mt-0.5" />
                    <p className="text-text-dark text-sm font-body">
                        Could not read what is sold out at {branchName}.
                        <span className="text-neutral-gray"> Everything below is shown as on sale, which may be wrong — reload before trusting it.</span>
                    </p>
                </div>
            ) : (
                <div className="mb-4 flex items-start gap-2.5 px-4 py-3 bg-primary/5 border border-primary/15 rounded-xl">
                    <InfoIcon size={16} weight="fill" className="text-primary shrink-0 mt-0.5" />
                    <p className="text-text-dark text-sm font-body">
                        Every branch serves the same menu, so dishes, photos and prices are set by an
                        administrator.
                        <span className="text-neutral-gray"> Availability is yours.</span>
                    </p>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4">
                <p className="text-neutral-gray text-sm font-body">
                    <span className="text-text-dark font-semibold">{onSaleCount}</span> on sale
                </p>
                {soldOutCount > 0 && (
                    <p className="text-primary text-sm font-body">
                        <span className="font-semibold">{soldOutCount}</span> sold out
                    </p>
                )}
                {filtered.length !== rows.length && (
                    <p className="text-neutral-gray/70 text-sm font-body">
                        {filtered.length} shown
                    </p>
                )}
            </div>

            <FilterBar>
                <SearchBar value={search} onChange={setSearch} placeholder="Search dishes…" />
                <FilterSelect
                    value={category}
                    onChange={setCategory}
                    placeholder="All categories"
                    options={categories.map(name => ({ value: name, label: name }))}
                />
                <FilterSelect
                    value={availability}
                    onChange={(value) => setAvailability(value as AvailabilityFilter)}
                    placeholder="Any availability"
                    options={AVAILABILITY_FILTERS}
                />
            </FilterBar>

            <BranchMenuTable
                rows={filtered}
                isLoading={menuLoading || flagsLoading}
                onToggle={toggleAvailability}
                pendingIds={pendingIds}
                branchName={branchName}
            />
        </div>
    );
}
