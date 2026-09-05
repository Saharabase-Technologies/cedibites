'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
    MagnifyingGlassIcon, XIcon, ClockIcon, SpinnerGapIcon, ArrowLeftIcon, PlusIcon,
} from '@phosphor-icons/react';
import { useMenuDiscovery, type SearchableItem } from '../providers/MenuDiscoveryProvider';
import { useCart, DEFAULT_SIZE_KEY } from '../providers/CartProvider';
import { useModal } from '../providers/ModalProvider';
import ItemDetailModal from './ItemDetailModal';

const formatPrice = (p: number | string | null | undefined) => {
    const n = typeof p === 'number' ? p : Number(p);
    return `₵${Number.isNaN(n) ? '0.00' : n.toFixed(2)}`;
};

type Size = NonNullable<SearchableItem['sizes']>[number];

interface Row {
    key: string;
    item: SearchableItem;
    size?: Size;
    /** What the row is called. The option's own name where there is one. */
    title: string;
    price: number;
    image?: string;
}

/**
 * One row per orderable thing, not one row per menu item.
 *
 * A dish with several options was collapsing into a single row carrying the
 * item's combined name and whichever price came back first. Searching "jollof"
 * has to lay out every jollof you can actually order, each with its own price,
 * so somebody can pick between them. An item with one option or none stays a
 * single row under its own name; there is nothing to choose between.
 */
function toRows(items: SearchableItem[], query: string): Row[] {
    const rows: Row[] = [];
    const q = query.trim().toLowerCase();

    const optionName = (s: Size) => s.displayName ?? s.label ?? '';

    for (const item of items) {
        const sizes = item.sizes ?? [];

        // When the words landed on the options themselves, show those options
        // and not the rest of the dish. Typing "jollof" against an item holding
        // both jollof and fried rice variations should not drag the fried rice
        // ones along for the ride.
        const hits = q ? sizes.filter(s => optionName(s).toLowerCase().includes(q)) : [];
        if (hits.length > 0 && hits.length < sizes.length) {
            for (const size of hits) {
                const title = optionName(size);
                rows.push({
                    key: `${item.id}:${size.key}`,
                    item,
                    size,
                    title,
                    price: size.price,
                    image: size.image ?? size.thumbnail ?? item.image,
                });
            }
            continue;
        }

        if (sizes.length > 1) {
            for (const size of sizes) {
                const title = optionName(size);
                rows.push({
                    key: `${item.id}:${size.key}`,
                    item,
                    size,
                    title,
                    // When the option carries the whole dish name already, the
                    // item name underneath would just say it twice.
                    price: size.price,
                    image: size.image ?? size.thumbnail ?? item.image,
                });
            }
            continue;
        }

        const only = sizes[0];
        rows.push({
            key: item.id,
            item,
            size: only,
            title: item.name,
            price: only?.price ?? item.price ?? 0,
            image: only?.image ?? item.image,
        });
    }

    return rows;
}

function ResultRow({ row, onSelect, onAdd }: { row: Row; onSelect: (r: Row) => void; onAdd: (r: Row) => void }) {
    const [imgError, setImgError] = useState(false);
    const { isOptionSoldOut, isItemSoldOut } = useMenuDiscovery();
    const soldOut = row.size ? isOptionSoldOut(row.size.id) : isItemSoldOut(row.item);

    return (
        <button
            onClick={() => onSelect(row)}
            className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150 ease-out hover:bg-surface-sunken ${soldOut ? 'opacity-55' : ''}`}
        >
            <div className="relative h-14 w-14 shrink-0 self-start overflow-hidden rounded-lg bg-surface-sunken">
                {row.image && !imgError && (
                    <Image src={row.image} alt="" fill sizes="56px" className="object-cover" onError={() => setImgError(true)} />
                )}
            </div>

            {/* The name wraps and the row grows to fit it. These names run long
                — "Assorted Fried Rice + 7 Drums + Korkoor" — and a clipped one
                is the difference between choosing and guessing.
            
                The price moved underneath to give the name the width. Sharing a
                line with a price and a button left it barely half the row, which
                is what was truncating it. The dish name that used to sit here as
                a subtitle is gone too: these items are filed under combined names
                like "Fried Rice / Jollof + 3 Drums", so it repeated the very
                thing the option name exists to replace. */}
            <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-snug text-fg">{row.title}</p>
                <p className={`mt-1 text-sm font-bold tabular-nums ${soldOut ? 'text-fg-muted' : 'text-primary-ink'}`}>
                    {soldOut ? 'Sold out' : formatPrice(row.price)}
                </p>
            </div>

            {/* The row opens the dish; this adds the exact option that was
                found, without a detour through the sheet. */}
            {!soldOut && (
                <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Add ${row.title} to cart`}
                    onClick={e => { e.stopPropagation(); onAdd(row); }}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onAdd(row); }
                    }}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-fill text-white transition-[filter] duration-150 ease-out hover:brightness-95"
                >
                    <PlusIcon size={16} weight="bold" />
                </span>
            )}
        </button>
    );
}

/**
 * Search, full screen, over whatever you were looking at.
 *
 * It used to be a bar pinned to the top of the home screen, which meant it took
 * a slot on one screen and did not exist on any other. As a sheet it is one tap
 * from everywhere, and it gets the whole display to show results in.
 *
 * The empty state offers recent searches and the real categories. There is no
 * invented "popular right now" list: the old inline search shipped one as a
 * hardcoded prop, and a made-up list of trending dishes is a claim about the
 * business that nobody checked.
 */
export default function SearchSheet() {
    const { isSearchOpen, closeSearch } = useModal();
    const {
        searchQuery, setSearchQuery, searchResults, isSearching, error,
        recentSearches, addRecentSearch, clearRecentSearches,
        categories, setSelectedCategory,
    } = useMenuDiscovery();
    const router = useRouter();
    const { addToCart } = useCart();

    const inputRef = useRef<HTMLInputElement>(null);
    const [detail, setDetail] = useState<{ item: SearchableItem; sizeKey?: string } | null>(null);

    const rows = useMemo(() => toRows(searchResults, searchQuery), [searchResults, searchQuery]);

    useEffect(() => {
        if (!isSearchOpen) return;
        // Opened from a staple tile the query is already run, so the results are
        // what somebody came for. Taking focus there would throw the keyboard up
        // over the answer. Only an empty sheet asks to be typed into.
        if (searchQuery.trim()) return;
        // A beat, so the sheet is painted before the keyboard is asked for.
        const t = setTimeout(() => inputRef.current?.focus(), 60);
        return () => clearTimeout(t);
    }, [isSearchOpen, searchQuery]);

    useEffect(() => {
        if (!isSearchOpen) return;
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSearch(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [isSearchOpen, closeSearch]);

    if (!isSearchOpen) return null;

    const hasQuery = searchQuery.trim().length > 0;

    const addRow = (row: Row) => {
        addRecentSearch(row.title);
        addToCart(row.item, row.size?.key ?? DEFAULT_SIZE_KEY);
    };

    const pickRow = (row: Row) => {
        addRecentSearch(row.title);
        setDetail({ item: row.item, sizeKey: row.size?.key });
    };

    const pickCategory = (id: string) => {
        setSelectedCategory(id);
        closeSearch();
        router.push('/menu');
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-bg pt-safe">

            <div className="flex shrink-0 items-center gap-2 border-b border-hairline px-3 py-2.5">
                <button
                    onClick={closeSearch}
                    aria-label="Close search"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-fg transition-colors duration-150 ease-out hover:bg-surface-sunken"
                >
                    <ArrowLeftIcon size={20} weight="bold" />
                </button>

                <div className="relative flex min-w-0 flex-1 items-center">
                    <MagnifyingGlassIcon size={18} weight="bold" className="pointer-events-none absolute left-3.5 text-fg-muted" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search dishes, drinks..."
                        className="h-11 w-full rounded-lg border border-hairline bg-surface pl-10 pr-10 text-sm font-medium text-fg outline-none transition-colors duration-150 ease-out placeholder:text-fg-subtle focus:border-hairline-strong"
                    />
                    {hasQuery && (
                        <button
                            onClick={() => { setSearchQuery(''); inputRef.current?.focus(); }}
                            aria-label="Clear search"
                            className="absolute right-2 grid h-7 w-7 place-items-center rounded-lg text-fg-muted transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-fg"
                        >
                            <XIcon size={15} weight="bold" />
                        </button>
                    )}
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-safe">
                {error ? (
                    <div className="px-6 py-14 text-center">
                        <p className="text-sm font-bold text-fg">The menu did not load</p>
                        <p className="mt-1 text-sm text-fg-muted">Check your connection and try again.</p>
                    </div>
                ) : hasQuery ? (
                    isSearching && searchResults.length === 0 ? (
                        <div className="flex items-center gap-3 px-5 py-6 text-sm text-fg-muted">
                            <SpinnerGapIcon size={16} className="animate-spin" /> Searching
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="px-6 py-14 text-center">
                            <p className="text-sm font-bold text-fg">Nothing matches &ldquo;{searchQuery}&rdquo;</p>
                            <p className="mt-1 text-sm text-fg-muted">Try a shorter word, or browse the menu.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-hairline">
                            {rows.map(row => (
                                <ResultRow key={row.key} row={row} onSelect={pickRow} onAdd={addRow} />
                            ))}
                        </div>
                    )
                ) : (
                    <div className="flex flex-col gap-7 px-4 py-5">
                        {recentSearches.length > 0 && (
                            <div>
                                <div className="mb-2.5 flex items-center justify-between">
                                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-fg-muted">
                                        <ClockIcon size={11} /> Recent
                                    </p>
                                    <button
                                        onClick={clearRecentSearches}
                                        className="text-[10px] font-bold text-fg-muted transition-colors duration-150 ease-out hover:text-danger-ink"
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {recentSearches.slice(0, 8).map(term => (
                                        <button
                                            key={term}
                                            onClick={() => setSearchQuery(term)}
                                            className="h-9 rounded-lg border border-hairline bg-surface px-3 text-sm font-semibold text-fg transition-colors duration-150 ease-out hover:border-hairline-strong"
                                        >
                                            {term}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {categories.length > 0 && (
                            <div>
                                <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-fg-muted">
                                    Browse
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {categories.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => pickCategory(c.id)}
                                            className="h-9 rounded-lg border border-hairline bg-surface px-3 text-sm font-semibold text-fg transition-colors duration-150 ease-out hover:border-hairline-strong"
                                        >
                                            {c.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ItemDetailModal
                item={detail?.item ?? null}
                initialSizeKey={detail?.sizeKey}
                onClose={() => setDetail(null)}
            />
        </div>
    );
}
