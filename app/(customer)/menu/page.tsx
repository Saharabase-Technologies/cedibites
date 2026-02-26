'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
    MagnifyingGlassIcon, XIcon, FunnelIcon, SlidersIcon,
    StorefrontIcon, MapPinIcon, CaretDownIcon, SparkleIcon,
    FireIcon, ArrowUpIcon, CheckIcon, ListIcon,
    SquaresFourIcon, ClockIcon, ArrowRightIcon, SpinnerGapIcon,
} from '@phosphor-icons/react';
import { useMenuDiscovery } from '@/app/components/providers/MenuDiscoveryProvider';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { useLocation } from '@/app/components/providers/LocationProvider';
import { useModal } from '@/app/components/providers/ModalProvider';
import MenuItemCard from '@/app/components/ui/MenuItemCard';
import ItemDetailModal from '@/app/components/ui/ItemDetailModal';
import type { SearchableItem } from '@/app/components/providers/MenuDiscoveryProvider';
import Navbar from '../../components/layout/Navbar';

// ─── Types ────────────────────────────────────────────────────────────────────
type SortKey = 'default' | 'price_asc' | 'price_desc' | 'popular';
type ViewMode = 'grid' | 'list';
// ─── Category icon map ────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
    'All': '',
    'Main Dishes': '',
    'Combos': '',
    'Starters & Sides': '',
    'Appetizers': '',
    'Drinks': '',
    'Desserts': '',
    'Specials': '',
};

// ─── Sort options ─────────────────────────────────────────────────────────────
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'default', label: 'Featured' },
    { key: 'popular', label: 'Most Popular' },
    { key: 'price_asc', label: 'Price: Low to High' },
    { key: 'price_desc', label: 'Price: High to Low' },
];

function sortItems(items: SearchableItem[], sort: SortKey): SearchableItem[] {
    if (sort === 'popular') return [...items].sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));
    if (sort === 'price_asc') return [...items].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    if (sort === 'price_desc') return [...items].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    return items;
}

// ─── Loading state ────────────────────────────────────────────────────────────
function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
            <SpinnerGapIcon size={48} className="animate-spin text-primary" />
            <p className="text-sm text-neutral-gray">Loading menu...</p>
        </div>
    );
}

// ─── Error state ──────────────────────────────────────────────────────────────
function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-4xl">
                😞
            </div>
            <div className="space-y-2">
                <p className="text-base font-bold text-text-dark dark:text-text-light">
                    Failed to load menu
                </p>
                <p className="text-sm text-neutral-gray">
                    We couldn't fetch the menu. Please check your connection and try again.
                </p>
            </div>
            <button
                onClick={onRetry}
                className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            >
                Retry
            </button>
        </div>
    );
}

// ─── Back to top button ───────────────────────────────────────────────────────
function BackToTop() {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const h = () => setVisible(window.scrollY > 600);
        window.addEventListener('scroll', h, { passive: true });
        return () => window.removeEventListener('scroll', h);
    }, []);
    if (!visible) return null;
    return (
        <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-30 w-11 h-11 rounded-full bg-primary shadow-lg flex items-center justify-center hover:bg-primary-hover active:scale-90 transition-all md:bottom-8 md:right-8"
            aria-label="Back to top"
        >
            <ArrowUpIcon weight="bold" size={18} className="text-white" />
        </button>
    );
}

// ─── Sort Dropdown ────────────────────────────────────────────────────────────
function SortDropdown({ value, onChange }: { value: SortKey; onChange: (k: SortKey) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    const label = SORT_OPTIONS.find(o => o.key === value)?.label ?? 'Sort';
    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(p => !p)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-brand-dark border border-neutral-gray/20 hover:border-primary/40 text-sm font-semibold text-text-dark dark:text-text-light transition-all"
            >
                <SlidersIcon size={15} weight="bold" className="text-neutral-gray" />
                <span className="hidden sm:inline">{label}</span>
                <CaretDownIcon size={13} weight="bold" className={`text-neutral-gray transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-brand-darker rounded-2xl shadow-xl border border-neutral-gray/10 py-1.5 z-50">
                    {SORT_OPTIONS.map(o => (
                        <button key={o.key} onClick={() => { onChange(o.key); setOpen(false); }}
                            className="flex items-center justify-between w-full px-4 py-2.5 text-sm hover:bg-primary/5 hover:text-primary transition-colors">
                            <span className={value === o.key ? 'text-primary font-bold' : 'text-text-dark dark:text-text-light font-medium'}>{o.label}</span>
                            {value === o.key && <CheckIcon size={14} weight="bold" className="text-primary" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Branch pill ──────────────────────────────────────────────────────────────
function BranchPill() {
    const { selectedBranch } = useBranch();
    const { coordinates } = useLocation();
    const { openBranchSelector } = useModal();
    const { getBranchesWithDistance } = useBranch();

    const distance = coordinates && selectedBranch
        ? getBranchesWithDistance(coordinates.latitude, coordinates.longitude).find(b => b.id === selectedBranch.id)?.distance
        : null;

    if (!selectedBranch) return null;

    return (
        <button
            onClick={openBranchSelector}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-all group shrink-0"
        >
            <MapPinIcon weight="fill" size={14} className="text-primary shrink-0" />
            <span className="text-sm font-bold text-primary truncate max-w-[120px] sm:max-w-[160px]">
                {selectedBranch.name}
            </span>
            {distance !== null && distance !== undefined && (
                <span className="text-xs text-primary/70 hidden sm:inline">{distance.toFixed(1)}km</span>
            )}
            <CaretDownIcon size={12} weight="bold" className="text-primary/70 shrink-0 group-hover:translate-y-0.5 transition-transform" />
        </button>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ query, category }: { query: string; category: string | null }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-neutral-gray/10 flex items-center justify-center text-4xl">
                {query ? '🔍' : ''}
            </div>
            <div>
                <p className="text-base font-bold text-text-dark dark:text-text-light">
                    {query ? `No results for "${query}"` : `Nothing in ${category ?? 'this category'} yet`}
                </p>
                <p className="text-sm text-neutral-gray mt-1">
                    {query ? 'Try different keywords' : 'Check back soon!'}
                </p>
            </div>
        </div>
    );
}

// ─── List view item row ───────────────────────────────────────────────────────
function ListItemRow({ item, onOpen }: { item: SearchableItem; onOpen: (item: SearchableItem) => void }) {
    const price = item.sizes?.[0]?.price ?? item.price ?? 0;
    const priceDisplay = typeof price === 'number' ? price.toFixed(2) : '0.00';
    
    return (
        <button
            onClick={() => onOpen(item)}
            className="flex items-center gap-4 w-full p-3.5 rounded-2xl bg-white dark:bg-brand-dark hover:bg-primary/4 border border-neutral-gray/10 hover:border-primary/20 transition-all text-left group"
        >
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-primary/10 shrink-0">
                <Image 
                    src={item.image || '/menu_placeholder.png'} 
                    alt={item.name} 
                    fill 
                    sizes="64px" 
                    className="object-cover group-hover:scale-105 transition-transform duration-300" 
                />
                {item.popular && (
                    <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <FireIcon weight="fill" size={10} className="text-white" />
                    </div>
                )}
            </div>
            <div className="flex-1 w-full min-w-0">
                <p className="text-sm font-bold text-text-dark dark:text-text-light truncate">{item.name}</p>
                {item.description && <p className="text-xs text-neutral-gray mt-0.5 line-clamp-1">{item.description}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{item.category}</span>
                    {item.sizes && item.sizes.length > 1 && (
                        <span className="text-xs text-neutral-gray">{item.sizes.length} sizes</span>
                    )}
                </div>
            </div>
            <div className="text-right shrink-0">
                <p className="text-base font-bold text-primary">GHS {priceDisplay}</p>
                <p className="text-xs text-neutral-gray mt-0.5 group-hover:text-primary transition-colors">View →</p>
            </div>
        </button>
    );
}

// ─── Category sidebar item ────────────────────────────────────────────────────
function SidebarCategoryBtn({ label, count, active, onClick }: {
    label: string; count: number; active: boolean; onClick: () => void;
}) {
    const icon = CATEGORY_ICONS[label] ?? '';
    return (
        <button
            onClick={onClick}
            className={`flex cursor-pointer items-center gap-3 w-full px-3.5 py-3 rounded-xl text-left transition-all group
                ${active
                    ? 'bg-primary text-white font-bold shadow-sm'
                    : 'text-text-dark dark:text-text-light hover:bg-primary/8 hover:text-primary font-medium'
                }`}
        >
            <span className="text-base shrink-0 leading-none">{icon}</span>
            <span className="flex-1 text-sm truncate">{label}</span>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0 ${active ? 'bg-white/20 text-white' : 'bg-neutral-gray/15 text-neutral-gray group-hover:bg-primary/15 group-hover:text-primary'}`}>
                {count}
            </span>
        </button>
    );
}

// ─── Main Menu Page ───────────────────────────────────────────────────────────
export default function MenuPage() {
    const {
        allItems,
        filteredItems,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        isSearching,
        error,
        retryFetch,
    } = useMenuDiscovery();

    // Derive unique categories from all items
    const categories = React.useMemo(() => {
        const seen = new Set<string>();
        allItems.forEach(item => { if (item.category) seen.add(item.category); });
        return Array.from(seen);
    }, [allItems]);

    const [sort, setSort] = useState<SortKey>('default');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [detailItem, setDetailItem] = useState<SearchableItem | null>(null);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Category counts
    const categoryCounts = React.useMemo(() => {
        const counts: Record<string, number> = { All: allItems.length };
        allItems.forEach(item => {
            if (item.category) counts[item.category] = (counts[item.category] ?? 0) + 1;
        });
        return counts;
    }, [allItems]);

    const allCategories = ['All', ...categories];

    // Apply sort on top of provider's filtered items
    const displayItems = React.useMemo(() => sortItems(filteredItems, sort), [filteredItems, sort]);

    const handleCategoryChange = (cat: string) => {
        setSelectedCategory(cat === 'All' ? null : cat);
        setShowMobileFilters(false);
        // scroll content to top on mobile
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const clearSearch = () => { setSearchQuery(''); searchRef.current?.focus(); };
    const [isFocused, setIsFocused] = useState(false);


    const isFiltered = searchQuery.trim() || selectedCategory;
    const activeCategory = selectedCategory ?? 'All';

    return (
        <div className="min-h-screen bg-neutral-light dark:bg-brand-darker">
            <Navbar />
            {/* ── Top bar ─────────────────────────────────────────────────── */}
            <div className="sticky top-20 w-full mt-20 z-20  bg-primary/10  dark:bg-brand-darker items-center backdrop-blur-md border-b border-neutral-gray/20">




                <div className="w-[95%] md:w-[90%]  h-32 xl:w-[85%] max-w-7xl mx-auto flex-wrap py-3 flex items-center gap-3">



                    {/* Search */}
                    <div className='relative w-full mt-  md:w-[40%] flex items-center'>
                        <MagnifyingGlassIcon
                            size={24}
                            weight="bold"
                            className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isFocused ? 'text-primary' : 'text-neutral-gray'}`}
                        />
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder="Search dishes, drinks..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-4 md:pr-12 py-3 md:py-3 bg-neutral-light dark:bg-brand-dark border-2 border-neutral-gray/50 focus:border-2 focus:border-primary rounded-full text-text-dark dark:text-text-light placeholder:text-neutral-gray transition-all outline-none text-lg"
                        />
                        {searchQuery && (
                            <button
                                onClick={clearSearch}
                                className="absolute cursor-pointer hover:bg-neutral-gray/10 right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full dark:hover:bg-brand-dark transition-colors"
                            >
                                <XIcon size={20} weight="bold" />
                            </button>
                        )}
                    </div>



                    {/* Branch pill */}
                    <BranchPill />

                    {/* Sort */}
                    <SortDropdown value={sort} onChange={setSort} />

                    {/* View toggle — desktop only */}
                    <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-brand-dark border border-neutral-gray/15">
                        <button onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-neutral-gray hover:text-text-dark'}`}>
                            <SquaresFourIcon weight="fill" size={16} />
                        </button>
                        <button onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary text-white' : 'text-neutral-gray hover:text-text-dark'}`}>
                            <ListIcon weight="bold" size={16} />
                        </button>
                    </div>

                    {/* Mobile filter toggle */}
                    <button
                        onClick={() => setShowMobileFilters(p => !p)}
                        className="md:hidden flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white dark:bg-brand-dark border border-neutral-gray/20 text-sm font-semibold text-text-dark dark:text-text-light"
                    >
                        <FunnelIcon size={15} weight="bold" className={selectedCategory ? 'text-primary' : 'text-neutral-gray'} />
                        {selectedCategory && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </button>
                </div>

                {/* Mobile category strip */}
                {showMobileFilters && (
                    <div className="md:hidden border-t border-neutral-gray/10 overflow-x-auto scrollbar-none">
                        <div className="flex gap-2 px-4 py-3 w-max">
                            {allCategories.map(cat => {
                                const active = cat === activeCategory;
                                return (
                                    <button key={cat} onClick={() => handleCategoryChange(cat)}
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all
                                            ${active ? 'bg-primary text-white' : 'bg-white dark:bg-brand-dark text-text-dark dark:text-text-light border border-neutral-gray/15'}`}>
                                        <span>{CATEGORY_ICONS[cat] ?? ''}</span>
                                        {cat}
                                        <span className={`text-xs ${active ? 'opacity-80' : 'text-neutral-gray'}`}>
                                            {categoryCounts[cat] ?? 0}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Body: sidebar + content ──────────────────────────────────── */}
            <div className="w-[95%] md:w-[90%] xl:w-[85%] max-w-7xl mx-auto py-6 flex gap-6 items-start">

                {/* ── Sidebar (desktop) ─────────────────────────────────────── */}
                <aside className="hidden md:flex flex-col gap-1 w-52 xl:w-60 shrink-0 sticky top-60">
                    {/* Menu label */}
                    <div className="px-3.5 pb-3 mb-1 border-b border-neutral-gray/10">
                        <p className="text-[10px] font-bold text-neutral-gray uppercase tracking-widest">Categories</p>
                    </div>

                    {allCategories.map(cat => (
                        <SidebarCategoryBtn
                            key={cat}
                            label={cat}
                            count={categoryCounts[cat] ?? 0}
                            active={cat === activeCategory}
                            onClick={() => handleCategoryChange(cat)}

                        />
                    ))}

                    {/* Branch info card */}
                    <BranchInfoCard />
                </aside>

                {/* ── Main content ──────────────────────────────────────────── */}
                <main ref={contentRef} className="flex-1 min-w-0">

                    {/* Section header */}
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-text-dark dark:text-text-light flex items-center gap-2.5">
                                {activeCategory === 'All'
                                    ? <> <span className='text-2xl'>Our Full Menu</span></>
                                    : <><span className="text-xl">{CATEGORY_ICONS[activeCategory] ?? ''}</span> {activeCategory}</>
                                }
                            </h1>
                            <p className="text-sm text-neutral-gray mt-0.5">
                                {isFiltered
                                    ? `${displayItems.length} result${displayItems.length !== 1 ? 's' : ''}`
                                    : `${displayItems.length} item${displayItems.length !== 1 ? 's' : ''} available`
                                }
                                {searchQuery && <span className="text-primary font-semibold"> for "{searchQuery}"</span>}
                            </p>
                        </div>

                        {isFiltered && (
                            <button
                                onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
                                className="flex items-center gap-1.5 text-xs font-semibold text-neutral-gray hover:text-error transition-colors"
                            >
                                <XIcon size={12} weight="bold" /> Clear filters
                            </button>
                        )}
                    </div>

                    {/* Items */}
                    {error && allItems.length === 0 ? (
                        <ErrorState onRetry={retryFetch} />
                    ) : isSearching && allItems.length === 0 ? (
                        <LoadingState />
                    ) : displayItems.length === 0 ? (
                        <EmptyState query={searchQuery} category={selectedCategory} />
                    ) : viewMode === 'list' ? (
                        // List view
                        <div className="flex flex-col gap-2.5">
                            {displayItems.map(item => (
                                <ListItemRow key={item.id} item={item} onOpen={setDetailItem} />
                            ))}
                        </div>
                    ) : (
                        // Grid view — grouped by category when "All", flat when filtered
                        activeCategory === 'All' && !searchQuery ? (
                            <GroupedGrid items={displayItems} categories={categories} onOpen={setDetailItem} />
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 md:gap-4">
                                {displayItems.map(item => (
                                    <MenuItemCard key={item.id} item={item} onOpenDetail={setDetailItem} />
                                ))}
                            </div>
                        )
                    )}
                </main>
            </div>

            {/* Detail modal */}
            {detailItem && (
                <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
            )}

            <BackToTop />
        </div>
    );
}

// ─── Grouped grid (All category) ──────────────────────────────────────────────
function GroupedGrid({ items, categories, onOpen }: {
    items: SearchableItem[];
    categories: string[];
    onOpen: (item: SearchableItem) => void;
}) {
    return (
        <div className="flex flex-col gap-10">
            {categories.map(cat => {
                const catItems = items.filter(i => i.category === cat);
                if (catItems.length === 0) return null;
                const icon = CATEGORY_ICONS[cat] ?? '';
                return (
                    <section key={cat}>
                        {/* Category divider */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 text-lg">
                                {icon}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-base font-bold text-text-dark dark:text-text-light">{cat}</h2>
                                <p className="text-xs text-neutral-gray">{catItems.length} item{catItems.length !== 1 ? 's' : ''}</p>
                            </div>
                            <div className="flex-1 h-px bg-neutral-gray/10" />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 md:gap-4">
                            {catItems.map(item => (
                                <MenuItemCard key={item.id} item={item} onOpenDetail={onOpen} />
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

// ─── Branch info card (sidebar bottom) ───────────────────────────────────────
function BranchInfoCard() {
    const { selectedBranch } = useBranch();
    const { openBranchSelector } = useModal();
    if (!selectedBranch) return null;

    const now = new Date();
    const hour = now.getHours();
    const isOpen = selectedBranch.isOpen ?? (hour >= 8 && hour < 22);

    return (
        <div className="mt-4 p-4 rounded-2xl bg-white dark:bg-brand-dark border border-neutral-gray/10">
            <div className="flex items-center gap-2 mb-3">
                <StorefrontIcon weight="fill" size={15} className="text-primary shrink-0" />
                <p className="text-sm font-bold text-text-dark dark:text-text-light truncate">{selectedBranch.name} Branch</p>
            </div>
            <div className={`flex items-center gap-1.5 mb-2`}>
                <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-secondary animate-pulse' : 'bg-error'}`} />
                <p className={`text-xs font-semibold ${isOpen ? 'text-secondary' : 'text-error'}`}>
                    {isOpen ? 'Open Now' : 'Closed'}
                </p>
                <span className="text-xs text-neutral-gray ml-1">{selectedBranch.operatingHours ?? '8am – 10pm'}</span>
            </div>
            <p className="text-xs text-neutral-gray mb-3 line-clamp-2">{selectedBranch.address}</p>
            <button
                onClick={openBranchSelector}
                className="flex items-center cursor-pointer justify-between w-full text-xs font-bold text-primary hover:underline"
            >
                Change branch <ArrowRightIcon size={12} weight="bold" />
            </button>
        </div>
    );
}
