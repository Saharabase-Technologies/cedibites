'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRightIcon, CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { useMenuDiscovery } from '../providers/MenuDiscoveryProvider';
import { useModal } from '../providers/ModalProvider';
import BlockHeading from './BlockHeading';
import { availableStaples } from '@/lib/constants/staples';

/**
 * Six ways into the menu, by the name of the food.
 *
 * This replaced a six-item grid of orderable dishes. Two things were wrong with
 * that. The items have no photographs in the admin, so every card was a pink
 * rectangle with a price under it. And a menu of roughly sixty lines has too
 * many variations of the same dish for six of them to mean anything: showing
 * "Fried Rice" at ₵60 says nothing about the assorted one, or the one with
 * seven drums and korkoor.
 *
 * A tile is not a product, so it needs no per-item photograph. It is the word
 * somebody would have typed. Tapping it runs that search and every variation
 * comes back at once, priced, ready to choose between.
 *
 * Two columns on a phone, where a grid shows six tiles at once and a thumb can
 * reach all of them. One scrolling row from `md` up, because six squares across
 * a desktop would each be a postage stamp.
 *
 * The desktop rail gets buttons. The scrollbar is hidden, and a hidden scrollbar
 * with no controls is a rail a mouse cannot move. It also gets scroll-padding:
 * scroll-snap-align aligns a tile to the scrollport edge, not to where the
 * gutter puts the content, so without it the first tile snaps flush against the
 * page edge on load. Same defect the deals strip had.
 */
export default function StapleGrid() {
    const { allItems, setSearchQuery, isSearching } = useMenuDiscovery();
    const { openSearch } = useModal();

    const railRef = useRef<HTMLDivElement>(null);
    const [atStart, setAtStart] = useState(true);
    const [atEnd, setAtEnd] = useState(false);

    const staples = useMemo(() => availableStaples(allItems), [allItems]);

    const readEdges = useCallback(() => {
        const el = railRef.current;
        if (!el) return;
        setAtStart(el.scrollLeft <= 1);
        // A pixel of slack: fractional layout widths mean scrollLeft rarely
        // lands exactly on the maximum.
        setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 1);
    }, []);

    useEffect(() => {
        readEdges();
        const el = railRef.current;
        if (!el) return;
        const observer = new ResizeObserver(readEdges);
        observer.observe(el);
        return () => observer.disconnect();
    }, [readEdges, staples.length]);

    const page = (direction: 1 | -1) => {
        const el = railRef.current;
        if (!el) return;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        // Just short of a full viewport, so the tile at the edge stays partly
        // visible and the movement reads as continuous rather than as a cut.
        el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' });
    };

    const open = (term: string) => {
        setSearchQuery(term);
        openSearch();
    };

    if (isSearching && allItems.length === 0) {
        return (
            <section className="page-x">
                <div className="mb-5 h-9 w-56 animate-pulse rounded-lg bg-surface-sunken" />
                <div className="grid grid-cols-2 gap-3 md:flex">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="aspect-square animate-pulse rounded-2xl bg-surface-sunken md:w-48 md:shrink-0" />
                    ))}
                </div>
            </section>
        );
    }

    if (staples.length === 0) return null;

    const arrow = 'grid h-10 w-10 place-items-center rounded-lg border border-hairline bg-surface text-fg transition-colors duration-150 ease-out hover:border-hairline-strong disabled:pointer-events-none disabled:opacity-35';

    return (
        <section>
            <div className="page-x mb-5 flex items-center justify-between gap-4">
                <BlockHeading tone="red" size="lg">What are you eating?</BlockHeading>

                {/* Touch scrolls the rail directly, so these would be furniture
                    on a phone. */}
                <div className="hidden shrink-0 items-center gap-2 md:flex">
                    <button onClick={() => page(-1)} disabled={atStart} aria-label="Scroll back" className={arrow}>
                        <CaretLeftIcon size={16} weight="bold" />
                    </button>
                    <button onClick={() => page(1)} disabled={atEnd} aria-label="Scroll forward" className={arrow}>
                        <CaretRightIcon size={16} weight="bold" />
                    </button>
                </div>
            </div>

            <div
                ref={railRef}
                onScroll={readEdges}
                className="page-x no-scrollbar grid grid-cols-2 gap-3 pb-2 md:flex md:snap-x md:snap-mandatory md:scroll-px-10 md:overflow-x-auto md:pb-6 xl:scroll-px-16"
            >
                {staples.map(staple => (
                    <button
                        key={staple.term}
                        onClick={() => open(staple.term)}
                        aria-label={`Show every ${staple.label} on the menu`}
                        className="card-lift card-lift-tap relative aspect-square overflow-hidden rounded-2xl bg-chrome text-left transition-shadow duration-150 ease-out md:w-48 md:shrink-0 md:snap-start lg:w-56"
                    >
                        {staple.photo && (
                            <>
                                <Image
                                    src={staple.photo.src}
                                    alt=""
                                    fill
                                    sizes="(max-width: 768px) 45vw, (max-width: 1024px) 25vw, 15vw"
                                    className="object-cover"
                                />
                                {/* Confined to the bottom third. The label is one or two
                                    words, so it needs a strip to sit on, not a wash over
                                    the whole photograph. */}
                                <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-transparent" />
                            </>
                        )}

                        <span className="font-brand absolute inset-x-0 bottom-0 p-3 text-lg leading-tight tracking-wide text-white md:text-xl">
                            {staple.label}
                        </span>
                    </button>
                ))}
            </div>

            <div className="page-x">
                <Link
                    href="/menu"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-ink transition-opacity duration-150 ease-out hover:opacity-70"
                >
                    See the full menu
                    <ArrowRightIcon size={14} weight="bold" />
                </Link>
            </div>
        </section>
    );
}
