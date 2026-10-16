'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FilterBar, FilterSelect, SearchBar, SegmentedTabs } from '@/app/inventory/_components';
import { boltService, type BoltBoard, type BoltDish, type BoltOption, type BoltSettings } from '@/lib/api/services/bolt.service';
import { receiptName } from '@/lib/utils/receiptName.mjs';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { toast } from '@/lib/utils/toast';
import { BoltSettingsCard } from '../_components/bolt/BoltSettingsCard';
import { BoltRows } from '../_components/bolt/BoltRows';

/**
 * Bolt: what each dish costs on Bolt, and what Bolt keeps.
 *
 * A Bolt order at the till is charged these prices, and its promo is the
 * order's discount, which we pay for. Changes save at once. The owner,
 * 2026-10-16: "a Bolt price until we do the integration".
 */

type View = 'on_bolt' | 'all';

const QUERY_KEY = ['admin-bolt'];

/** The till's menu carries the Bolt prices, so it catches up after a change. */
const MENU_KEYS = ['menu-items', 'menu-item'];

export default function MenuBoltPage() {
    const queryClient = useQueryClient();
    const [view, setView] = useState<View | null>(null);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');

    const { data: board, isLoading, isError, refetch } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: () => boltService.board(),
        staleTime: 30 * 1000,
    });

    // Start on the dishes already on Bolt when there are some.
    const activeView: View = view ?? (board && board.on_bolt_count > 0 ? 'on_bolt' : 'all');

    async function run(write: () => Promise<BoltBoard>, done?: string): Promise<boolean> {
        try {
            queryClient.setQueryData(QUERY_KEY, await write());
            MENU_KEYS.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
            if (done) toast.success(done);
            return true;
        } catch (error) {
            toast.error(getErrorMessage(error));
            return false;
        }
    }

    const saveOption = async (option: BoltOption, boltPrice: number | null, promoPercent: number | null) => {
        await run(() => boltService.saveOption(option.id, boltPrice, promoPercent));
    };

    const saveSettings = (next: BoltSettings) => run(() => boltService.saveSettings(next), 'Saved. New Bolt orders use it.');

    const categories = useMemo(
        () => Array.from(new Set((board?.dishes ?? []).map(d => d.category ?? 'Uncategorised'))),
        [board],
    );

    const groups = useMemo(() => {
        if (!board) return [];
        const q = search.trim().toLowerCase();
        const byCategory = new Map<string, BoltDish[]>();

        for (const dish of board.dishes) {
            const cat = dish.category ?? 'Uncategorised';
            if (category && cat !== category) continue;

            let options = dish.options;
            if (activeView === 'on_bolt') options = options.filter(o => o.bolt_price != null);
            if (q) {
                options = options.filter(o =>
                    `${dish.name} ${receiptName(dish.name, o.display_name || o.option_label)}`.toLowerCase().includes(q),
                );
            }
            if (options.length === 0) continue;

            byCategory.set(cat, [...(byCategory.get(cat) ?? []), { ...dish, options }]);
        }

        return Array.from(byCategory, ([cat, dishes]) => ({ category: cat, dishes }));
    }, [board, search, category, activeView]);

    if (isLoading) {
        return (
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-10 bg-neutral-light rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    if (isError || !board) {
        return (
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-16 text-center">
                <p className="text-neutral-gray text-sm font-body mb-3">The Bolt prices did not load.</p>
                <button type="button" onClick={() => refetch()} className="text-sm font-medium font-body text-primary cursor-pointer min-h-11">
                    Try again
                </button>
            </div>
        );
    }

    return (
        <>
            <p className="text-neutral-gray text-sm font-body mb-4">
                The till charges these prices on a Bolt order. Each change saves at once.
            </p>

            <BoltSettingsCard
                key={`${board.settings.commission_percent}:${board.settings.commission_base}`}
                settings={board.settings}
                onSave={saveSettings}
            />

            <div className="mb-4">
                <SegmentedTabs<View>
                    options={[
                        { value: 'on_bolt', label: `On Bolt (${board.on_bolt_count})` },
                        { value: 'all', label: 'All dishes' },
                    ]}
                    value={activeView}
                    onChange={setView}
                />
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

            {groups.length === 0 ? (
                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-16 text-center">
                    <p className="text-neutral-gray text-sm font-body">
                        {activeView === 'on_bolt' && board.on_bolt_count === 0
                            ? 'No dish is on Bolt yet. Open All dishes and type a Bolt price.'
                            : 'No dishes match your filters.'}
                    </p>
                </div>
            ) : (
                <BoltRows groups={groups} settings={board.settings} onSave={saveOption} />
            )}
        </>
    );
}
