'use client';

import React, { useMemo, useState } from 'react';
import { MagnifyingGlassIcon, SmileySadIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { useMenuDiscovery } from '@/app/components/providers/MenuDiscoveryProvider';
import type { SearchableItem } from '@/app/components/providers/MenuDiscoveryProvider';
import MenuItemCard from './MenuItemCard';
import ItemDetailModal from './ItemDetailModal';

const MIX_CONFIG: { category: string; count: number }[] = [
    { category: 'Basic Meals', count: 2 },
    { category: 'Combos', count: 2 },
    { category: 'Budget Bowls', count: 2 },
    { category: 'Top Ups', count: 1 },
    { category: 'Drinks', count: 1 },
];

function buildCediBitesMix(allItems: SearchableItem[]): SearchableItem[] {
    const result: SearchableItem[] = [];
    for (const { category, count } of MIX_CONFIG) {
        const pool = allItems.filter((item) => item.category === category);
        const sorted = [...pool].sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));
        result.push(...sorted.slice(0, count));
    }
    return result;
}

function EmptyState({ query, category }: { query: string; category: string | null }) {
    const isSearch = query.trim().length > 0;
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            {isSearch
                ? <MagnifyingGlassIcon size={48} className="text-neutral-gray/40" />
                : <SmileySadIcon size={48} className="text-neutral-gray/40" />}
            <p className="text-base font-semibold text-text-dark dark:text-text-light">
                {isSearch ? `No results for "${query}"` : `Nothing in ${category ?? 'this category'} yet`}
            </p>
            <p className="text-sm text-neutral-gray">
                {isSearch ? 'Try a different search term' : 'Check back soon!'}
            </p>
        </div>
    );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
    return (
        <div className="flex items-baseline gap-2 mb-4">
            <h2 className="text-lg md:text-xl font-bold text-text-dark dark:text-text-light">{label}</h2>
            <span className="text-sm text-neutral-gray">({count} item{count !== 1 ? 's' : ''})</span>
        </div>
    );
}

function MixHeader() {
    return (
        <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-text-dark dark:text-text-light">The CediBites Mix</h2>
            <span className="hidden sm:inline text-xs font-semibold px-3 py-1 rounded-full bg-primary/15 text-primary">A little of everything</span>
        </div>
    );
}

function PopularHeader({ count }: { count: number }) {
    return (
        <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-text-dark dark:text-text-light">Most Popular</h2>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/15 text-primary">
                {count} item{count !== 1 ? 's' : ''}
            </span>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
            <SpinnerGapIcon size={48} className="animate-spin text-primary" />
            <p className="text-sm text-neutral-gray">Loading menu...</p>
        </div>
    );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <SmileySadIcon size={48} className="text-red-500" />
            <div className="space-y-2">
                <p className="text-base font-semibold text-text-dark dark:text-text-light">
                    Failed to load menu
                </p>
                <p className="text-sm text-neutral-gray">
                    We couldn't fetch the menu. Please check your connection and try again.
                </p>
            </div>
            <button
                onClick={onRetry}
                className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
                Retry
            </button>
        </div>
    );
}

export default function MenuGrid() {
    const { filteredItems, searchQuery, selectedCategory, allItems, isSearching, error, retryFetch } = useMenuDiscovery();
    const [detailItem, setDetailItem] = useState<SearchableItem | null>(null);
    const cediBitesMix = useMemo(() => buildCediBitesMix(allItems), [allItems]);

    const grid = (items: SearchableItem[]) => (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {items.map((item) => (
                <MenuItemCard key={item.id} item={item} onOpenDetail={setDetailItem} />
            ))}
        </div>
    );

    return (
        <>
            {/* Show error state when menu fetch fails */}
            {error && allItems.length === 0 ? (
                <section className="w-[95%] md:w-[80%] xl:w-[70%] mx-auto pb-8 mt-6">
                    <ErrorState onRetry={retryFetch} />
                </section>
            ) : (
                <>
                    {/* Show loading state when fetching menu */}
                    {isSearching && allItems.length === 0 ? (
                        <section className="w-[95%] md:w-[80%] xl:w-[70%] mx-auto pb-8 mt-6">
                            <LoadingState />
                        </section>
                    ) : (
                        <>
                            {/* Default: CediBites Mix */}
                            {!selectedCategory && !searchQuery.trim() && (
                                <section className="w-[95%] md:w-[80%] xl:w-[70%] mx-auto pb-8 mt-6">
                                    <MixHeader />
                                    {grid(cediBitesMix)}
                                </section>
                            )}

                            {/* Most Popular */}
                            {selectedCategory === 'Most Popular' && !searchQuery.trim() && (
                                <section className="w-[95%] md:w-[80%] xl:w-[70%] mx-auto pb-8 mt-6">
                                    <PopularHeader count={filteredItems.length} />
                                    {filteredItems.length === 0
                                        ? <EmptyState query="" category="Most Popular" />
                                        : grid(filteredItems)}
                                </section>
                            )}

                            {/* Search or category */}
                            {(searchQuery.trim() || (selectedCategory && selectedCategory !== 'Most Popular')) && (
                                <section className="w-[95%] md:w-[80%] xl:w-[70%] mx-auto pb-8 mt-6">
                                    <SectionHeader
                                        label={searchQuery.trim() ? `Results for "${searchQuery}"` : selectedCategory ?? ''}
                                        count={filteredItems.length}
                                    />
                                    {filteredItems.length === 0
                                        ? <EmptyState query={searchQuery} category={selectedCategory} />
                                        : grid(filteredItems)}
                                </section>
                            )}
                        </>
                    )}
                </>
            )}

            <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
        </>
    );
}