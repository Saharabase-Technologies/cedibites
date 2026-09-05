'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon } from '@phosphor-icons/react';
import { BRANCH_PHOTOS, type BranchPhoto } from '@/lib/constants/branchPhotos';
import BlockHeading from './BlockHeading';
import { useMenuDiscovery } from '../providers/MenuDiscoveryProvider';

// ============================================
// BANNER DATA — swap these out for real promos
//
// Hardcoded, prices included. Nothing here reads from the menu, so a price
// change in the admin does not reach this file. The copy is untouched from what
// was already shipping; the numbers are worth checking.
//
// A photograph is attached only where it is honestly a picture of the meal in
// the headline. Nothing in the eight shots has a full chicken in it, so that
// card takes the headline block instead of borrowing a picture of a different
// meal, which is the sort of thing somebody notices at the counter.
// ============================================
interface Banner {
    id: number;
    headline: string;
    subheadline: string;
    cta: string;
    photo?: BranchPhoto;
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
        headline: 'Jollof + 3 Drumsticks',
        subheadline: 'Street Package • GHS 95',
        cta: 'Order Now',
        photo: BRANCH_PHOTOS.jollofDrumsticks,
    },
    {
        // A category shortcut rather than a priced package, which is why this
        // one carries no GHS figure. Add one here if wraps get a bundle price.
        id: 2,
        headline: 'Wraps',
        subheadline: 'Grilled, three sauces on the side',
        cta: 'See the wraps',
        photo: BRANCH_PHOTOS.wraps,
        category: 'wrap',
    },
    {
        id: 3,
        headline: 'Banku & Grilled Tilapia',
        subheadline: 'GHS 110 • Freshly grilled',
        cta: 'Try It Now',
        photo: BRANCH_PHOTOS.tilapia,
    },
    {
        id: 4,
        headline: 'Fried Rice + 7 Drums + Korkoor',
        subheadline: 'Big Budget Meal • GHS 145',
        cta: 'See Menu',
        photo: BRANCH_PHOTOS.friedRiceDrumsticks,
    },
];

/**
 * Deals, as a rail you push rather than a card that moves on its own.
 *
 * Two rewrites got this here. It first auto-advanced every five seconds and
 * carried six things per slide, including a row of dots AND a "1 / 4" counter,
 * with a CTA button that had no handler on it.
 *
 * Then the headline sat on top of the photograph behind a scrim. On a 224px
 * card that scrim had to run to 85% black for the caps to survive, and under
 * 85% black a plate of jollof is a black rectangle. It read as a broken image,
 * which for a deal card is worse than having no image at all.
 *
 * So the photograph gets its own half and is never dimmed. The type sits on
 * solid ink underneath it, where it needs no scrim to be legible. A card with
 * no photograph puts the headline block in that top half instead, so it reads
 * as a decision rather than as something that failed to load.
 */
export default function PromoBanner() {
    const router = useRouter();
    const { categories, setSelectedCategory } = useMenuDiscovery();

    // Smart categories are computed rollups like Most Popular, not real sections
    // of the menu, so they are not what a deal card should land on.
    const openCategory = (word: string) => {
        const hit = categories.find(
            c => !c.id.startsWith('smart:') && c.label.toLowerCase().includes(word),
        );
        if (hit) setSelectedCategory(hit.id);
        router.push('/menu');
    };

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
                {BANNERS.map(banner => (
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
                                    {banner.subheadline}
                                </p>
                            </div>

                            {/* Yellow, not red. Red is the primary action colour and
                                it was already on the hero, the cart and every
                                heading block; four more red buttons in a row made
                                the screen one note. Black on #ffdd0b is 12.9:1,
                                which is the strongest pairing in the palette. */}
                            {banner.category ? (
                                <button
                                    onClick={() => openCategory(banner.category!)}
                                    className="mt-auto inline-flex h-11 w-fit items-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-on-accent transition-[filter] duration-150 ease-out hover:brightness-95"
                                >
                                    {banner.cta}
                                    <ArrowRightIcon weight="bold" size={14} />
                                </button>
                            ) : (
                                <Link
                                    href="/menu"
                                    className="mt-auto inline-flex h-11 w-fit items-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-on-accent transition-[filter] duration-150 ease-out hover:brightness-95"
                                >
                                    {banner.cta}
                                    <ArrowRightIcon weight="bold" size={14} />
                                </Link>
                            )}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}
