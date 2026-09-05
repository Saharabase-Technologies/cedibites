'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    CaretDownIcon,
    MagnifyingGlassIcon,
    StorefrontIcon,
    XIcon,
} from '@phosphor-icons/react';
import { useMenuDiscovery } from '@/app/components/providers/MenuDiscoveryProvider';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { useModal } from '@/app/components/providers/ModalProvider';
import BlockHeading from '@/app/components/ui/BlockHeading';
import ItemDetailModal from '@/app/components/ui/ItemDetailModal';
import type { SearchableItem } from '@/app/components/providers/MenuDiscoveryProvider';
import MenuItemRow from './_components/MenuItemRow';
import SectionRail, { type MenuSection } from './_components/SectionRail';
import { MenuEmpty, MenuError, MenuNoResults, MenuSkeleton } from './_components/MenuStates';

/**
 * The menu, as one continuous list with a spine.
 *
 * What was here: a search field, a branch pill, a sort dropdown and a grid/list
 * toggle in one row on a phone, a scrolling strip of category chips that
 * filtered, a sidebar that filtered the same way on desktop, and 43 cards each
 * led by a 4:3 picture. There are no pictures. Every `image_url` and
 * `thumbnail_url` on this menu is null, so the page was a gallery of empty red
 * rectangles with the prices hidden behind them.
 *
 * Four decisions came out of reading the real data rather than the mock:
 *
 * 1. Nothing filters. Categories jump to a section of one long menu, and the
 *    rail follows the scroll, so the rest of the food is never more than a
 *    thumb away. Filtering by category on this menu produced a page with one
 *    dish on it, because Soft bites really does hold one dish.
 * 2. Rows, not a grid. The longest name on this menu is sixty-six characters.
 *    Half a phone's width cannot hold it.
 * 3. Every price on the face of the row. With no photography the option labels
 *    and their prices are the only thing separating one row from the next, and
 *    they were the one thing you had to open a modal to see.
 * 4. Sort and the view toggle are gone. Forty-three dishes in six named
 *    sections do not need sorting by price, and one good row beats a choice
 *    between two mediocre densities.
 *
 * Most Popular is a computed section from the API, not a hand-set tag, and it
 * sits first because it answers the question most people arrive with.
 */
export default function MenuPage() {
    const {
        allItems,
        searchResults,
        categories,
        smartCategories,
        searchQuery,
        setSearchQuery,
        isSearching,
        error,
        retryFetch,
    } = useMenuDiscovery();

    const { selectedBranch } = useBranch();

    const [detailItem, setDetailItem] = useState<SearchableItem | null>(null);
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [searchFocused, setSearchFocused] = useState(false);
    const searchInput = useRef<HTMLInputElement>(null);

    const searching = searchQuery.trim().length > 0;

    /**
     * The menu, cut into the sections the kitchen already thinks in.
     *
     * Smart categories come first and are computed by the API from thirty days
     * of orders. The rest follow the display order an admin set. A section with
     * nothing in it is dropped rather than rendered empty, which is what keeps
     * a newly provisioned branch from showing six headings and no food.
     */
    const sections = useMemo(() => {
        const built: (MenuSection & { items: SearchableItem[] })[] = [];

        for (const category of categories) {
            const smart = category.id.startsWith('smart:')
                ? smartCategories.find(sc => `smart:${sc.slug}` === category.id)
                : null;

            const items = smart
                ? allItems.filter(item => smart.item_ids.some(id => String(id) === item.id))
                : allItems.filter(item => item.category === category.label);

            if (items.length === 0) continue;

            built.push({ id: category.id, label: category.label, count: items.length, items });
        }

        return built;
    }, [allItems, categories, smartCategories]);

    /**
     * Which section the reader is actually in.
     *
     * The band is a thin strip below the sticky header. Whichever section is
     * crossing it owns the rail. Positions are read fresh on every callback
     * rather than trusted from the entry, because an entry's rectangle is
     * measured when the observer fired and the page has moved since.
     */
    useEffect(() => {
        if (searching || sections.length === 0) return;

        const inBand = new Set<string>();

        const observer = new IntersectionObserver(
            entries => {
                for (const entry of entries) {
                    if (entry.isIntersecting) inBand.add(entry.target.id);
                    else inBand.delete(entry.target.id);
                }

                const highest = [...inBand]
                    .map(id => ({ id, top: document.getElementById(id)?.getBoundingClientRect().top ?? Infinity }))
                    .sort((a, b) => a.top - b.top)[0];

                if (highest) setActiveSection(highest.id.replace('section-', ''));
            },
            // Top of the band sits under the sticky header; the bottom cuts off
            // most of the viewport so only one section can own it at a time.
            { rootMargin: '-160px 0px -65% 0px', threshold: 0 },
        );

        for (const section of sections) {
            const element = document.getElementById(`section-${section.id}`);
            if (element) observer.observe(element);
        }

        return () => observer.disconnect();
    }, [sections, searching]);

    const jumpTo = useCallback((id: string) => {
        document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveSection(id);
    }, []);

    const clearSearch = () => {
        setSearchQuery('');
        searchInput.current?.focus();
    };

    const railSections: MenuSection[] = sections.map(({ id, label, count }) => ({ id, label, count }));
    const currentSection = activeSection ?? sections[0]?.id ?? null;
    const loading = isSearching && allItems.length === 0;

    return (
        <div className="min-h-[calc(100svh-var(--nav-h))] bg-bg">

            {/* ── Sticky header: find, and where you are ──────────────────── */}
            <div className="sticky top-(--nav-h) z-20 border-b border-hairline bg-bg">
                <div className="page-x flex items-center gap-2.5 py-3">
                    <div className="relative flex min-w-0 flex-1 items-center md:max-w-96">
                        <MagnifyingGlassIcon
                            size={17}
                            weight="bold"
                            className={`pointer-events-none absolute left-3.5 transition-colors duration-150 ease-out ${
                                searchFocused ? 'text-primary-ink' : 'text-fg-muted'
                            }`}
                        />
                        <input
                            ref={searchInput}
                            type="text"
                            inputMode="search"
                            enterKeyHint="search"
                            aria-label="Search the menu"
                            placeholder="Search jollof, wraps, drinks"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            className="h-11 w-full rounded-lg border border-hairline bg-surface pl-10 pr-10 text-sm font-medium text-fg outline-none transition-colors duration-150 ease-out placeholder:text-fg-subtle focus:border-hairline-strong"
                        />
                        {searchQuery && (
                            <button
                                onClick={clearSearch}
                                aria-label="Clear search"
                                className="absolute right-2 grid h-7 w-7 place-items-center rounded-lg text-fg-muted transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-fg"
                            >
                                <XIcon size={14} weight="bold" />
                            </button>
                        )}
                    </div>

                    <BranchButton />
                </div>

                {/* The rail belongs to the phone. Desktop reads the same list
                    down the left of the page, where it can stay open. */}
                {!searching && railSections.length > 1 && (
                    <div className="md:hidden">
                        <SectionRail
                            sections={railSections}
                            activeId={currentSection}
                            onJump={jumpTo}
                            orientation="row"
                        />
                    </div>
                )}
            </div>

            {/* ── Body ────────────────────────────────────────────────────── */}
            <div className="page-x flex items-start gap-8 py-6 md:py-8">

                <aside className="sticky top-[calc(var(--nav-h)+5.5rem)] hidden w-52 shrink-0 md:block xl:w-56">
                    {railSections.length > 1 && (
                        <SectionRail
                            sections={railSections}
                            activeId={currentSection}
                            onJump={jumpTo}
                            orientation="column"
                        />
                    )}
                    <BranchCard />
                </aside>

                <main className="min-w-0 flex-1">
                    <div className="mb-6 flex items-baseline justify-between gap-4">
                        <BlockHeading tone="plain" size="md" as="h1">Our menu</BlockHeading>
                        {allItems.length > 0 && (
                            <p className="shrink-0 text-sm text-fg-muted tabular-nums">
                                {allItems.length} items
                            </p>
                        )}
                    </div>

                    {error && allItems.length === 0 ? (
                        <MenuError onRetry={retryFetch} />
                    ) : loading ? (
                        <MenuSkeleton />
                    ) : searching ? (
                        <>
                            <div className="mb-4 flex items-center justify-between gap-4">
                                <p className="min-w-0 truncate text-sm text-fg-muted">
                                    <span className="font-bold text-fg tabular-nums">{searchResults.length}</span>
                                    {searchResults.length === 1 ? ' match for ' : ' matches for '}
                                    <span className="font-bold text-fg">&ldquo;{searchQuery}&rdquo;</span>
                                </p>
                                <button
                                    onClick={clearSearch}
                                    className="shrink-0 text-sm font-bold text-primary-ink transition-opacity duration-150 ease-out hover:opacity-70"
                                >
                                    Clear
                                </button>
                            </div>

                            {searchResults.length === 0 ? (
                                <MenuNoResults query={searchQuery.trim()} onClear={() => setSearchQuery('')} />
                            ) : (
                                <div className="grid gap-2.5 xl:grid-cols-2">
                                    {searchResults.map(item => (
                                        <MenuItemRow key={item.id} item={item} onOpen={setDetailItem} />
                                    ))}
                                </div>
                            )}
                        </>
                    ) : sections.length === 0 ? (
                        <MenuEmpty branchName={selectedBranch?.name} />
                    ) : (
                        <div className="flex flex-col gap-12">
                            {sections.map(section => (
                                <section
                                    key={section.id}
                                    id={`section-${section.id}`}
                                    className="scroll-mt-[calc(var(--nav-h)+8rem)] md:scroll-mt-[calc(var(--nav-h)+6rem)]"
                                >
                                    <div className="mb-4">
                                        <BlockHeading tone="red" size="sm">{section.label}</BlockHeading>
                                    </div>

                                    <div className="grid gap-2.5 xl:grid-cols-2">
                                        {section.items.map(item => (
                                            <MenuItemRow key={item.id} item={item} onOpen={setDetailItem} />
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {detailItem && (
                <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
            )}
        </div>
    );
}

/**
 * Which kitchen this menu belongs to.
 *
 * Not decoration: the menu, the prices and what is sold out all come from one
 * branch, so the branch is part of reading the page correctly.
 */
function BranchButton() {
    const { selectedBranch } = useBranch();
    const { openBranchSelector } = useModal();

    if (!selectedBranch) return null;

    return (
        <button
            onClick={openBranchSelector}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 text-sm font-bold text-fg transition-colors duration-150 ease-out hover:border-hairline-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-fill"
        >
            <StorefrontIcon size={15} weight="fill" className="shrink-0 text-primary-ink" />
            <span className="max-w-24 truncate sm:max-w-40">{selectedBranch.name}</span>
            <CaretDownIcon size={11} weight="bold" className="shrink-0 text-fg-muted" />
        </button>
    );
}

/**
 * The branch, at the foot of the desktop rail.
 *
 * `isOpen` comes off the API. The version of this card that stood here worked
 * it out from `new Date().getHours()`, which is the machine's clock and the
 * exact thing that printed a receipt an hour wrong at Ashaiman.
 */
function BranchCard() {
    const { selectedBranch } = useBranch();
    const { openBranchSelector } = useModal();

    if (!selectedBranch) return null;

    return (
        <div className="mt-6 rounded-2xl border border-hairline bg-surface p-4">
            <p className="truncate text-sm font-bold text-fg">{selectedBranch.name}</p>

            <p className="mt-1 flex items-center gap-1.5 text-xs">
                <span
                    aria-hidden
                    className={`h-2 w-2 shrink-0 rounded-full ${selectedBranch.isOpen ? 'bg-success' : 'bg-danger'}`}
                />
                <span className={`font-bold ${selectedBranch.isOpen ? 'text-success-ink' : 'text-danger-ink'}`}>
                    {selectedBranch.isOpen ? 'Open now' : 'Closed'}
                </span>
            </p>

            <p className="mt-2.5 text-xs leading-relaxed text-fg-muted">{selectedBranch.address}</p>

            <button
                onClick={openBranchSelector}
                className="mt-3 text-xs font-bold text-primary-ink transition-opacity duration-150 ease-out hover:opacity-70"
            >
                Change branch
            </button>
        </div>
    );
}
