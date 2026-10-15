'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FilterBar, FilterSelect, SearchBar, SegmentedTabs } from '@/app/inventory/_components';
import {
    menuPricesService,
    type BoardDish,
    type BoardOption,
    type PriceBoard,
} from '@/lib/api/services/menuPrices.service';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { toast } from '@/lib/utils/toast';
import { optionName } from '../_components/prices/format';
import { StatusCard } from '../_components/prices/StatusCard';
import { PriceRows, type RowActions } from '../_components/prices/PriceRows';
import { DishChangesModal, type DishChange } from '../_components/prices/DishChangesModal';
import { PublishModal } from '../_components/prices/PublishModal';
import { HistoryList } from '../_components/prices/HistoryList';

/**
 * New prices: type them in now, put them live when you say.
 *
 * Nothing typed here reaches the till, the website or the app until somebody
 * presses Put new prices live. Then every price switches at once, new options
 * go on sale, open baskets are repriced and every open till reloads.
 *
 * The owner asked for it on 2026-10-15: "I'll want a trigger for when we're
 * ready to publish them." See docs/MENU_PRICES_BUILD.md.
 */

type View = 'all' | 'waiting' | 'history';

const QUERY_KEY = ['admin-menu-prices'];

/** Everything else that shows a price or a dish name and should catch up after a publish. */
const MENU_KEYS = ['admin-menu-items', 'menu-items', 'menu-item', 'menu-categories', 'smart-categories', 'cart'];

function hasDraft(dish: BoardDish): boolean {
    return (
        Object.keys(dish.drafts).length > 0 ||
        dish.new_options.length > 0 ||
        dish.options.some(o => Object.keys(o.drafts).length > 0)
    );
}

export default function MenuPricesPage() {
    const queryClient = useQueryClient();
    const [view, setView] = useState<View | null>(null);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [openDishId, setOpenDishId] = useState<number | null>(null);
    const [publishing, setPublishing] = useState<'now' | 'at' | null>(null);
    const [busy, setBusy] = useState(false);

    const { data: board, isLoading, isError, refetch } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: () => menuPricesService.board(),
        staleTime: 30 * 1000,
    });

    // Start on what is waiting when something is, so the owner lands on it.
    const activeView: View = view ?? (board && board.waiting_count > 0 ? 'waiting' : 'all');

    function take(next: PriceBoard) {
        queryClient.setQueryData(QUERY_KEY, next);
    }

    /** Run a write, keep the board it answers with, and say what went wrong if it did. */
    async function run(write: () => Promise<PriceBoard>, done?: string): Promise<boolean> {
        try {
            take(await write());
            if (done) toast.success(done);
            return true;
        } catch (error) {
            toast.error(getErrorMessage(error));
            return false;
        }
    }

    const actions: RowActions = {
        savePrice: async (dish: BoardDish, option: BoardOption, value: number | null) => {
            await run(() => menuPricesService.setDraft({ menuItemId: dish.id, optionId: option.id, field: 'price', value }));
        },
        removeDraft: async (draftId: number) => {
            await run(() => menuPricesService.removeDraft(draftId));
        },
        openDish: (dish: BoardDish) => setOpenDishId(dish.id),
    };

    async function saveDishChanges(dish: BoardDish, changes: DishChange[]) {
        for (const change of changes) {
            const ok = await run(() =>
                menuPricesService.setDraft({ menuItemId: dish.id, optionId: change.optionId, field: change.field, value: change.value }),
            );
            if (!ok) throw new Error('stopped');
        }
    }

    async function publishNow() {
        setBusy(true);
        const ok = await run(() => menuPricesService.publishNow(), 'The new prices are live.');
        setBusy(false);
        if (ok) {
            setPublishing(null);
            setView('history');
            MENU_KEYS.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
        }
    }

    async function schedule(at: string) {
        const ok = await run(() => menuPricesService.schedule(at), 'The time is set.');
        if (ok) setPublishing(null);
    }

    async function cancelSchedule(id: number) {
        setBusy(true);
        await run(() => menuPricesService.cancel(id), 'Called off. The changes are still waiting.');
        setBusy(false);
    }

    async function clearAll() {
        setBusy(true);
        await run(() => menuPricesService.clearDrafts(), 'Every waiting change is cleared.');
        setBusy(false);
    }

    async function undo(id: number) {
        const ok = await run(() => menuPricesService.undo(id), 'The old values are back.');
        if (ok) MENU_KEYS.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
    }

    const categories = useMemo(
        () => Array.from(new Set((board?.dishes ?? []).map(d => d.category ?? 'Uncategorised'))),
        [board],
    );

    const groups = useMemo(() => {
        if (!board) return [];
        const q = search.trim().toLowerCase();
        const byCategory = new Map<string, BoardDish[]>();

        for (const dish of board.dishes) {
            const cat = dish.category ?? 'Uncategorised';
            if (category && cat !== category) continue;
            if (activeView === 'waiting' && !hasDraft(dish)) continue;
            if (q) {
                const names = [dish.name, ...dish.options.map(o => optionName(dish, o))].join(' ').toLowerCase();
                if (!names.includes(q)) continue;
            }
            byCategory.set(cat, [...(byCategory.get(cat) ?? []), dish]);
        }

        return Array.from(byCategory, ([cat, dishes]) => ({ category: cat, dishes }));
    }, [board, search, category, activeView]);

    const openDish = board?.dishes.find(d => d.id === openDishId) ?? null;

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
                <p className="text-neutral-gray text-sm font-body mb-3">The prices did not load.</p>
                <button type="button" onClick={() => refetch()} className="text-sm font-medium font-body text-primary cursor-pointer min-h-11">
                    Try again
                </button>
            </div>
        );
    }

    return (
        <>
            <p className="text-neutral-gray text-sm font-body mb-4">
                Type new prices here. Nothing changes on the till or the website until you put them live.
            </p>

            <StatusCard
                board={board}
                busy={busy}
                onPublish={when => setPublishing(when)}
                onCancelSchedule={cancelSchedule}
                onClearAll={clearAll}
            />

            <div className="mb-4">
                <SegmentedTabs<View>
                    options={[
                        { value: 'waiting', label: `Waiting (${board.waiting_count})` },
                        { value: 'all', label: 'All dishes' },
                        { value: 'history', label: 'History' },
                    ]}
                    value={activeView}
                    onChange={setView}
                />
            </div>

            {activeView === 'history' ? (
                <HistoryList history={board.history} onUndo={undo} />
            ) : (
                <>
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
                                {activeView === 'waiting' && board.waiting_count === 0
                                    ? 'Nothing is waiting. Open All dishes to type a new price.'
                                    : 'No dishes match your filters.'}
                            </p>
                        </div>
                    ) : (
                        <PriceRows groups={groups} actions={actions} />
                    )}
                </>
            )}

            {openDish && (
                <DishChangesModal
                    key={openDish.id}
                    dish={openDish}
                    onClose={() => setOpenDishId(null)}
                    onSave={changes => saveDishChanges(openDish, changes)}
                    onAddOption={(label, receiptName, price) =>
                        run(() => menuPricesService.addOption({ menuItemId: openDish.id, label, receiptName, price }))
                    }
                    onRemoveNewOption={async draftId => {
                        await run(() => menuPricesService.removeDraft(draftId));
                    }}
                />
            )}

            {publishing && (
                <PublishModal
                    board={board}
                    initialWhen={publishing}
                    onClose={() => setPublishing(null)}
                    onPublishNow={publishNow}
                    onSchedule={schedule}
                />
            )}
        </>
    );
}
