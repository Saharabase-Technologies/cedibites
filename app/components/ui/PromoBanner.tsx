'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon } from '@phosphor-icons/react';
import { BRANCH_PHOTOS, type BranchPhoto } from '@/lib/constants/branchPhotos';
import { cheapestPrice } from '@/lib/utils/itemPrice';
import { formatGHS } from '@/lib/utils/currency';
import BlockHeading from './BlockHeading';
import ItemDetailModal from './ItemDetailModal';
import { useMenuDiscovery, type SearchableItem } from '../providers/MenuDiscoveryProvider';

// ============================================
// THE CARDS
//
// Chosen by us, which is what makes them editorial rather than promotional. What
// is NOT written here any more is money. Every figure on this rail used to be
// typed in beside the copy — GHS 95, GHS 110, GHS 145 — so a price change in the
// admin never reached it, and nothing on the page could tell you whether any of
// the three was still true.
//
// Now each card names the dish it is about in `find`, and the price is whatever
// the live menu says that dish costs today. A card whose dish this branch does
// not sell keeps its photograph and its words and simply shows no figure, which
// is the honest version of not knowing.
//
// A photograph is attached only where it is honestly a picture of the meal in
// the headline. Nothing in the set has a full chicken in it, so no card claims
// one.
// ============================================
interface Banner {
    id: number;
    headline: string;
    /** One line under the headline. Never a price. */
    line: string;
    cta: string;
    photo?: BranchPhoto;
    /**
     * Words to find this card's dish in the menu, most specific first.
     *
     * The combos were renamed on 2026-09-06 from "3 Drums" to "3 pieces of
     * Chicken" and the environments are not always on the same wording, so both
     * spellings are looked for. Order matters more than the words do: "jollof"
     * on its own is a ₵65 plate, not a box of jollof with chicken on it.
     */
    find?: string[];
    /**
     * A word to find in the menu's own category names. When it hits, the button
     * opens the menu already filtered to that category instead of dropping you
     * at the top of the whole list.
     */
    category?: string;
}

const BANNERS: Banner[] = [
    {
        id: 1,
        headline: 'Jollof and 3 pieces of chicken',
        line: 'Street package',
        cta: 'Order it',
        photo: BRANCH_PHOTOS.jollofDrumsticks,
        find: ['jollof / noodles + 3 pieces', 'jollof / noodles + 3 drum', '+ 3 pieces of chicken', '+ 3 drum'],
    },
    {
        id: 2,
        headline: 'Cedi wraps',
        line: 'Grilled, three sauces on the side',
        cta: 'See the wraps',
        photo: BRANCH_PHOTOS.wraps,
        find: ['cedi wrap', 'wrap'],
        category: 'wrap',
    },
    {
        id: 3,
        headline: 'Banku and grilled tilapia',
        line: 'Grilled whole, with lime',
        cta: 'Order it',
        photo: BRANCH_PHOTOS.tilapia,
        find: ['banku'],
    },
    {
        id: 4,
        headline: 'Fried rice and 7 pieces of chicken',
        line: 'Big budget meal',
        cta: 'See it',
        photo: BRANCH_PHOTOS.friedRiceDrumsticks,
        find: ['+ 7 pieces of chicken', '+ 7 drum'],
    },
];

/**
 * Deals, as a rail you push rather than a card that moves on its own.
 *
 * Two rewrites got this here. It first auto-advanced every five seconds and
 * carried six things per slide, including a row of dots AND a "1 / 4" counter,
 * with a CTA button that had no handler on it.
 *
 * Then the headline sat on top of the photograph behind a scrim. On a 224px card
 * that scrim had to run to 85% black for the caps to survive, and under 85%
 * black a plate of jollof is a black rectangle. It read as a broken image, which
 * for a deal card is worse than having no image at all.
 *
 * So the photograph gets its own half and is never dimmed. The type sits on
 * solid ink underneath it, where it needs no scrim to be legible. A card with no
 * photograph puts the headline block in that top half instead, so it reads as a
 * decision rather than as something that failed to load.
 */
export default function PromoBanner() {
    const router = useRouter();
    const { allItems, categories, setSelectedCategory, isItemSoldOut } = useMenuDiscovery();
    const [detailItem, setDetailItem] = useState<SearchableItem | null>(null);

    /**
     * Each card's dish on this branch's menu, and what it costs today.
     *
     * A dish the branch has sold out of is treated as not found: the card keeps
     * its words and loses its figure, rather than pricing something nobody can
     * buy this afternoon.
     */
    const dishes = useMemo(() => {
        const found = new Map<number, SearchableItem>();

        for (const banner of BANNERS) {
            if (!banner.find) continue;
            for (const word of banner.find) {
                const hit = allItems.find(
                    item => item.name.toLowerCase().includes(word) && !isItemSoldOut(item),
                );
                if (hit) { found.set(banner.id, hit); break; }
            }
        }

        return found;
    }, [allItems, isItemSoldOut]);

    // Smart categories are computed rollups like Most Popular, not real sections
    // of the menu, so they are not what a deal card should land on.
    const openCategory = (word: string) => {
        const hit = categories.find(
            c => !c.id.startsWith('smart:') && c.label.toLowerCase().includes(word),
        );
        if (hit) setSelectedCategory(hit.id);
        router.push('/menu');
    };

    const buttonLook = 'inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-on-accent transition-[filter] duration-150 ease-out hover:brightness-95';

    return (
        <section className="page-x">
            {/* Three things are doing separate jobs here and none of them is spare.

                px-5 puts the first card on the page gutter. -mx-5 lets the rail's box
                reach the viewport edge so the card's shadow, which spills 6px to each
                side and 16px below, is not sliced off — overflow-x:auto makes
                overflow-y compute to auto as well, so this box clips whatever its
                children paint outside it.

                scroll-px-5 is the one that is easy to miss. scroll-snap-align:start
                aligns a card to the SCROLLPORT's start edge, which is the padding box
                edge, not where padding-left puts the content. Without it the browser
                snaps 20px on load and parks the first card flush against the viewport,
                and the rail only looks right once you have scrolled it by hand. */}
            <div className="no-scrollbar -mx-5 -mt-4 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pt-4 pb-7 md:-mx-10 md:scroll-px-10 md:px-10">
                {BANNERS.map(banner => {
                    const dish = dishes.get(banner.id);
                    const price = dish ? cheapestPrice(dish) : null;

                    return (
                        <article
                            key={banner.id}
                            className="flex w-[84%] shrink-0 snap-start card-lift flex-col overflow-hidden rounded-2xl bg-surface sm:w-96"
                        >
                            {banner.photo ? (
                                <div className="relative aspect-video w-full shrink-0">
                                    <Image
                                        src={banner.photo.src}
                                        alt={banner.photo.alt}
                                        fill
                                        sizes="(max-width: 640px) 84vw, 384px"
                                        className="object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="flex aspect-video w-full shrink-0 items-center bg-surface-sunken px-4">
                                    <BlockHeading tone="red" size="sm" as="h3">
                                        {banner.headline}
                                    </BlockHeading>
                                </div>
                            )}

                            <div className="flex flex-1 flex-col gap-4 p-4">
                                <div>
                                    {banner.photo && (
                                        <h3 className="font-brand text-xl leading-tight tracking-wide text-fg md:text-2xl">
                                            {banner.headline}
                                        </h3>
                                    )}
                                    <p className={`text-sm text-fg-muted ${banner.photo ? 'mt-1' : ''}`}>
                                        {banner.line}
                                    </p>
                                </div>

                                {/* The money, where the menu knows it, opposite the
                                    button. Yellow on the button, not red: red is the
                                    primary action colour and it was already on the
                                    hero, the cart and every heading block, so four
                                    more red buttons in a row made the screen one
                                    note. Black on #ffdd0b is 12.9:1, the strongest
                                    pairing in the palette. */}
                                <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                                    {price ? (
                                        <span className="text-[15px] font-bold tabular-nums text-fg">
                                            {price.from ? `From ${formatGHS(price.amount)}` : formatGHS(price.amount)}
                                        </span>
                                    ) : <span />}

                                    {dish ? (
                                        <button onClick={() => setDetailItem(dish)} className={buttonLook}>
                                            {banner.cta}
                                            <ArrowRightIcon weight="bold" size={14} aria-hidden />
                                        </button>
                                    ) : banner.category ? (
                                        <button onClick={() => openCategory(banner.category!)} className={buttonLook}>
                                            {banner.cta}
                                            <ArrowRightIcon weight="bold" size={14} aria-hidden />
                                        </button>
                                    ) : (
                                        <Link href="/menu" className={buttonLook}>
                                            {banner.cta}
                                            <ArrowRightIcon weight="bold" size={14} aria-hidden />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>

            <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
        </section>
    );
}
