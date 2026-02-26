'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
    MagnifyingGlassIcon,
    XIcon,
    ClockIcon,
    TrendUpIcon,
    ArrowRightIcon,
    SpinnerGapIcon,
    FireIcon,
} from '@phosphor-icons/react';
import { useMenuDiscovery, type SearchableItem } from '@/app/components/providers/MenuDiscoveryProvider';
import ItemDetailModal from './ItemDetailModal';

// ─── Props (kept for backwards compat — most are now from provider) ───────────
interface UniversalSearchProps {
    placeholder?: string;
    popularSearches?: string[];
    onItemClick?: (item: SearchableItem) => void;
    showPrices?: boolean;
}

const formatPrice = (price: number | undefined) => {
    if (price === undefined || price === null || typeof price !== 'number') return 'GHS 0.00';
    return `GHS ${price.toFixed(2)}`;
};

// ─── Result row ───────────────────────────────────────────────────────────────
function ResultRow({ item, onSelect }: { item: SearchableItem; onSelect: (item: SearchableItem) => void }) {
    const [imgError, setImgError] = useState(false);
    const price = item.sizes?.[0]?.price ?? item.price ?? 0;

    return (
        <button
            onMouseDown={(e) => { e.preventDefault(); onSelect(item); }} // mousedown fires before blur
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/6 transition-colors text-left group"
        >
            {/* Thumbnail */}
            <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-primary/10 shrink-0">
                {item.image && !imgError ? (
                    <Image src={item.image} alt={item.name} fill sizes="44px" className="object-cover" onError={() => setImgError(true)} />
                ) : (
                    <div className="w-full h-full" />
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-dark dark:text-text-light truncate group-hover:text-primary transition-colors">
                    {item.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                    {item.category && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-neutral-gray/12 text-neutral-gray">
                            {item.category}
                        </span>
                    )}
                    {item.popular && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-primary">
                            <FireIcon weight="fill" size={9} /> Popular
                        </span>
                    )}
                </div>
            </div>

            {/* Price */}
            <span className="text-sm font-bold text-primary shrink-0">
                {formatPrice(price)}
            </span>
        </button>
    );
}

// ─── Suggestion chip ──────────────────────────────────────────────────────────
function SuggestionChip({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
    return (
        <button
            onMouseDown={(e) => { e.preventDefault(); onClick(); }}
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-neutral-gray/8 hover:bg-primary/10 hover:text-primary border border-neutral-gray/15 hover:border-primary/30 text-xs font-medium text-text-dark dark:text-text-light transition-all shrink-0"
        >
            <span className="text-neutral-gray">{icon}</span>
            {label}
        </button>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UniversalSearch({
    placeholder = 'Search for Jollof, Banku, Waakye...',
    popularSearches = ['Jollof Rice', 'Banku', 'Waakye', 'Fufu', 'Kelewele', 'Sobolo'],
    onItemClick,
    showPrices = true,
}: UniversalSearchProps) {
    const {
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        recentSearches,
        addRecentSearch,
        clearRecentSearches,
        error,
    } = useMenuDiscovery();

    const [isFocused, setIsFocused] = useState(false);
    const [modalItem, setModalItem] = useState<SearchableItem | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const showDropdown = isFocused && (searchQuery.trim().length > 0 || recentSearches.length > 0 || popularSearches.length > 0);
    const hasResults = searchResults.length > 0;
    const hasQuery = searchQuery.trim().length > 0;

    // Close dropdown on outside click
    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node))
                setIsFocused(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    // ⌘K / Ctrl+K to focus
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
                setIsFocused(true);
            }
            if (e.key === 'Escape') {
                inputRef.current?.blur();
                setIsFocused(false);
            }
        };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleClear = () => {
        setSearchQuery('');
        inputRef.current?.focus();
    };

    const handleItemSelect = (item: SearchableItem) => {
        addRecentSearch(item.name);
        setIsFocused(false);
        inputRef.current?.blur();

        if (onItemClick) {
            onItemClick(item);
        } else {
            // Open the item detail modal directly
            setModalItem(item);
        }
    };

    const handleSuggestionSelect = (query: string) => {
        setSearchQuery(query);
        addRecentSearch(query);
        setIsFocused(false);
        inputRef.current?.blur();
    };

    const handleSubmit = () => {
        if (!searchQuery.trim()) return;
        addRecentSearch(searchQuery.trim());
        setIsFocused(false);
        inputRef.current?.blur();
    };

    return (
        <div ref={containerRef} className="py border- my-4 md:my-0 border-neutral-gray/20 w-full relative">

            {/* Search input — unchanged styling */}
            <div className="relative w-full">
                <MagnifyingGlassIcon
                    size={24}
                    weight="bold"
                    className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isFocused ? 'text-primary' : 'text-neutral-gray'}`}
                />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder={placeholder}
                    value={searchQuery}
                    onChange={handleChange}
                    onFocus={() => setIsFocused(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSubmit();
                        if (e.key === 'Escape') { setIsFocused(false); inputRef.current?.blur(); }
                    }}
                    className="w-full pl-14 pr-4 md:pr-12 py-3 md:py-4 bg-neutral-light dark:bg-brand-dark border-2 border-neutral-gray/50 focus:border-2 focus:border-primary rounded-full text-text-dark dark:text-text-light placeholder:text-neutral-gray transition-all outline-none text-lg"
                />
                {searchQuery && (
                    <button
                        onClick={handleClear}
                        className="absolute cursor-pointer hover:bg-neutral-gray/10 right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full dark:hover:bg-brand-dark transition-colors"
                    >
                        <XIcon size={20} weight="bold" />
                    </button>
                )}
            </div>

            {/* ── Dropdown panel ─────────────────────────────────────────────── */}
            {showDropdown && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white dark:bg-brand-dark rounded-2xl shadow-2xl border border-neutral-gray/12 overflow-hidden">

                    {/* Live search results */}
                    {hasQuery && (
                        <>
                            {error ? (
                                <div className="px-5 py-6 text-center">
                                    <p className="text-sm font-semibold text-text-dark dark:text-text-light">
                                        Failed to load menu
                                    </p>
                                    <p className="text-xs text-neutral-gray mt-1">Please check your connection and try again</p>
                                </div>
                            ) : isSearching && !hasResults ? (
                                <div className="flex items-center gap-3 px-5 py-4 text-sm text-neutral-gray">
                                    <SpinnerGapIcon size={16} className="animate-spin text-primary" />
                                    Searching...
                                </div>
                            ) : hasResults ? (
                                <>
                                    <div className="flex items-center justify-between px-4 pt-3 pb-1">
                                        <p className="text-[10px] font-bold text-neutral-gray uppercase tracking-widest">
                                            Results
                                        </p>
                                        <span className="text-[10px] font-semibold text-primary">
                                            {searchResults.length} found
                                        </span>
                                    </div>
                                    <div className="divide-y divide-neutral-gray/6 max-h-[320px] overflow-y-auto overscroll-contain">
                                        {searchResults.slice(0, 7).map(item => (
                                            <ResultRow key={item.id} item={item} onSelect={handleItemSelect} />
                                        ))}
                                    </div>
                                    {searchResults.length > 7 && (
                                        <div className="px-4 py-3 border-t border-neutral-gray/8">
                                            <button
                                                onMouseDown={(e) => { e.preventDefault(); handleSubmit(); }}
                                                className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                                            >
                                                <ArrowRightIcon weight="bold" size={14} />
                                                See all {searchResults.length} results
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* No results */
                                <div className="px-5 py-6 text-center">
                                    <p className="text-sm font-semibold text-text-dark dark:text-text-light">
                                        No results for &ldquo;{searchQuery}&rdquo;
                                    </p>
                                    <p className="text-xs text-neutral-gray mt-1">Try a different search term</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Empty state — recents + popular */}
                    {!hasQuery && (
                        <div className="px-4 py-4 flex flex-col gap-5">

                            {/* Recent searches */}
                            {recentSearches.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[10px] font-bold text-neutral-gray uppercase tracking-widest flex items-center gap-1.5">
                                            <ClockIcon size={11} /> Recent
                                        </p>
                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); clearRecentSearches(); }}
                                            className="text-[10px] font-semibold text-neutral-gray hover:text-error transition-colors"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {recentSearches.slice(0, 6).map(s => (
                                            <SuggestionChip
                                                key={s}
                                                label={s}
                                                icon={<ClockIcon size={11} />}
                                                onClick={() => handleSuggestionSelect(s)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Popular searches */}
                            <div>
                                <p className="text-[10px] font-bold text-neutral-gray uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                    <TrendUpIcon size={11} /> Popular right now
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {popularSearches.map(s => (
                                        <SuggestionChip
                                            key={s}
                                            label={s}
                                            icon={<TrendUpIcon size={11} />}
                                            onClick={() => handleSuggestionSelect(s)}
                                        />
                                    ))}
                                </div>
                            </div>

                        </div>
                    )}

                    {/* Footer hint */}
                    <div className="px-4 py-2.5 border-t border-neutral-gray/8 flex items-center justify-between">
                        <p className="text-[10px] text-neutral-gray">Results update as you type</p>
                        <div className="hidden sm:flex items-center gap-1 text-[10px] text-neutral-gray">
                            <kbd className="px-1.5 py-0.5 rounded bg-neutral-gray/10 font-mono">↵</kbd>
                            <span>to search</span>
                            <kbd className="px-1.5 py-0.5 rounded bg-neutral-gray/10 font-mono ml-1">esc</kbd>
                            <span>to close</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Item detail modal — opens when a search result is clicked */}
            <ItemDetailModal item={modalItem} onClose={() => setModalItem(null)} />
        </div>
    );
}