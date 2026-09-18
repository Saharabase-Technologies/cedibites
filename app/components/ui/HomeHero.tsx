'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRightIcon } from '@phosphor-icons/react';
import { useBranch } from '../providers/BranchProvider';
import { useMenuDiscovery, type SearchableItem } from '../providers/MenuDiscoveryProvider';
import { useSmartCategories } from '@/lib/api/hooks/useSmartCategories';
import { BRANCH_PHOTOS, photoForMenuItem } from '@/lib/constants/branchPhotos';
import { HERO_BANNERS, type HeroBanner } from '@/lib/constants/heroBanners';
import { cheapestPrice } from '@/lib/utils/itemPrice';
import { formatGHS } from '@/lib/utils/currency';
import BlockHeading from './BlockHeading';
import ItemDetailModal from './ItemDetailModal';

/**
 * One slide. The photograph is the dish's own, never a stock shot.
 *
 * The two states are deliberately different shapes. With a photograph it is a
 * frame with the type sitting in the bottom of it. Without one it is a short ink
 * panel with the type in normal flow.
 *
 * That second state used to be the first one with `bg-fg` behind it, which
 * produced a square black rectangle with a caption in the bottom eighth and
 * seven eighths of nothing. The standing rule is that a card which looks like a
 * broken image is broken, whatever the reasoning behind it. A panel that is only
 * as tall as the words it holds reads as a decision.
 */
function Frame({
    image, alt = '', children, onClick, href,
}: {
    image?: string;
    alt?: string;
    children: React.ReactNode;
    onClick?: () => void;
    href?: string;
}) {
    const [imgError, setImgError] = useState(false);
    const hasPhoto = Boolean(image) && !imgError;

    const body = hasPhoto ? (
        <>
            <Image
                src={image!}
                alt={alt}
                fill
                sizes="(max-width: 768px) 100vw, 1100px"
                className="object-cover"
                priority
                onError={() => setImgError(true)}
            />
            {/*
              * Held to the bottom half.
              *
              * It used to wash the whole frame from 85% black at the foot to 5%
              * at the head, which dimmed the food to carry type that only sits
              * in the last third. The type still gets its 85%; the plate keeps
              * its own light.
              */}
            <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 via-55% to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">{children}</div>
        </>
    ) : (
        <div className="flex h-full min-h-55 flex-col justify-end bg-fg p-5 sm:p-6">{children}</div>
    );

    // With a photograph the aspect sets the height, so `h-full` is left off:
    // the two would fight, and the deck takes its height from this slide.
    const cls = hasPhoto
        ? 'relative block w-full overflow-hidden rounded-2xl aspect-square sm:aspect-[16/7] text-left'
        : 'relative block h-full w-full overflow-hidden rounded-2xl text-left';

    if (href) return <Link href={href} className={cls}>{body}</Link>;
    return <button onClick={onClick} className={cls}>{body}</button>;
}

/**
 * The small yellow control at the foot of a slide.
 *
 * Yellow, not red. The red block heading is already in this corner, and two
 * reds in one corner is one note. Black on #ffdd0b is 12.9:1, the strongest
 * pairing in the palette, and it holds over a photograph where white on red
 * would not.
 *
 * Small on purpose. The 48px price slab that used to sit here read as the point
 * of the slide; the photograph and the dish are the point.
 */
function SlideAction({ children }: { children: React.ReactNode }) {
    return (
        <span className="mt-3.5 inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13px] font-bold text-on-accent">
            {children}
            <ArrowRightIcon size={13} weight="bold" aria-hidden />
        </span>
    );
}

/**
 * The dish this branch has sold most of.
 *
 * The red block carries the claim and the dish carries its own name underneath,
 * in the body face. American Captain does not set item names: "ASSORTED FRIED
 * RICE / JOLLOF / NOODLES + FULL CHICKEN + KƆKƆƆ" in condensed caps is a wall.
 *
 * The price is the cheapest way to buy it, said as "From" whenever the dish has
 * more than one size, which nearly all of them do.
 */
function MostOrderedSlide({ item, onOpen }: { item: SearchableItem; onOpen: () => void }) {
    const photo = photoForMenuItem(item.name);
    const price = cheapestPrice(item);

    return (
        <Frame image={photo?.src} alt={photo?.alt ?? ''} onClick={onOpen}>
            <BlockHeading tone="red" size="md" as="h1">Most ordered</BlockHeading>

            <p className="mt-2.5 max-w-md text-[17px] font-bold leading-snug text-white sm:text-xl">
                {item.name}
            </p>

            {price && (
                <SlideAction>
                    {price.from ? `From ${formatGHS(price.amount)}` : formatGHS(price.amount)}
                </SlideAction>
            )}
        </Frame>
    );
}

/**
 * What a branch with no sales yet opens on.
 *
 * A new branch, or one whose last thirty days hold no paid order, has no most
 * ordered dish, and inventing one is not an option. This is a photograph of real
 * food with the kitchen's own words on it, and it claims nothing but the menu.
 */
function PhotoSlide() {
    const photo = BRANCH_PHOTOS.drumsticks;

    return (
        <Frame image={photo.src} alt={photo.alt} href="/menu">
            <BlockHeading tone="red" size="md" as="h1">{photo.title}</BlockHeading>

            <p className="mt-2.5 max-w-md text-sm leading-snug text-white/85 sm:text-base">
                {photo.line}
            </p>

            <SlideAction>See the menu</SlideAction>
        </Frame>
    );
}

/** Artwork, whole. See `lib/constants/heroBanners.ts`. */
function BannerSlide({ banner }: { banner: HeroBanner }) {
    const phone = banner.srcPhone ?? banner.src;

    return (
        <Link
            href={banner.href}
            className="relative block aspect-square w-full overflow-hidden rounded-2xl sm:aspect-[16/7]"
        >
            <Image
                src={phone}
                alt={banner.alt}
                fill
                sizes="100vw"
                className="object-cover sm:hidden"
            />
            <Image
                src={banner.src}
                alt={banner.alt}
                fill
                sizes="1100px"
                className="hidden object-cover sm:block"
            />
        </Link>
    );
}

/**
 * The hero, as a deck you push.
 *
 * Full-width slides that snap, with dots under them. Deliberately not the card
 * rail the deals use: those are small cards with the next one peeking, this is
 * one thing at a time at the full width of the page. Two scrollers that behave
 * identically on one screen would read as repetition, which is the reason they
 * are built differently rather than sharing a component.
 *
 * A single slide renders as a plain block with no scroller and no dots. Dots
 * under one slide are a control that does nothing.
 */
function Deck({ children }: { children: React.ReactNode[] }) {
    const slides = children.filter(Boolean);
    const track = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(0);

    const onScroll = useCallback(() => {
        const el = track.current;
        if (!el || el.clientWidth === 0) return;
        setActive(Math.round(el.scrollLeft / el.clientWidth));
    }, []);

    const goTo = useCallback((i: number) => {
        const el = track.current;
        if (!el) return;
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
    }, []);

    if (slides.length <= 1) return <>{slides[0] ?? null}</>;

    return (
        <>
            <div
                ref={track}
                onScroll={onScroll}
                className="no-scrollbar flex snap-x snap-mandatory items-stretch overflow-x-auto overscroll-x-contain"
            >
                {slides.map((slide, i) => (
                    <div key={i} className="w-full shrink-0 snap-start">{slide}</div>
                ))}
            </div>

            <div className="mt-3 flex items-center justify-center gap-1.5">
                {slides.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => goTo(i)}
                        aria-label={`Slide ${i + 1} of ${slides.length}`}
                        aria-current={i === active}
                        className={`h-1.5 rounded-xs transition-all duration-150 ease-out ${
                            i === active ? 'w-6 bg-fg' : 'w-1.5 bg-hairline-strong'
                        }`}
                    />
                ))}
            </div>
        </>
    );
}

/**
 * One thing, first, at full width.
 *
 * Home used to open with a greeting, a row of ten-plus category chips, a reorder
 * rail, a rotating promo and fourteen menu cards, all at the same weight. This is
 * the one element that is allowed to be loud.
 *
 * What it shows is now decided by what the branch sells. `most-popular` is a
 * public smart category the API computes from paid orders of the last thirty
 * days, ranked by units, so the first id in it is the dish this kitchen sells
 * most of. The slide before this was a photograph of drumsticks with a comment
 * claiming it was the best seller, chosen by hand, the same for every branch and
 * every customer.
 *
 * The hand-designed banners follow the dish. The customer's own last order is
 * deliberately not here: this page no longer asks the API for anybody's orders,
 * and the chip beside the greeting is what carries a live one.
 */
/**
 * Whether this is the kind of thing a hero can open on.
 *
 * `most-popular` ranks by units sold, and a bottle of water outsells food:
 * East Legon's most ordered item on production is Bel Aqua at ₵7, and Extra Sea
 * Food is filed beside the drumsticks. Neither is what the kitchen is known
 * for, and neither has a photograph. So the hero walks the ranking and takes
 * the first real dish, which keeps the claim true and still opens on food.
 *
 * Sold out is skipped for the same reason the staple tiles skip it: featuring a
 * dish nobody can buy this afternoon is worse than featuring the next one down.
 */
function isHeroDish(item: SearchableItem, soldOut: (item: SearchableItem) => boolean): boolean {
    if (/drink|beverage/i.test(item.category)) return false;
    if (/^(extra|water)\b/i.test(item.name.trim())) return false;
    return !soldOut(item);
}

export default function HomeHero() {
    const { selectedBranch } = useBranch();
    const { allItems, isSearching, isItemSoldOut } = useMenuDiscovery();
    const [detailItem, setDetailItem] = useState<SearchableItem | null>(null);

    /*
     * The same query key the menu provider uses, so this costs no second
     * request. It is read here rather than through the provider because the
     * hero needs to know whether the answer has landed yet: an empty list means
     * "this branch has sold nothing" and must not be confused with "not asked
     * yet", or the hero paints the fallback photograph and then swaps it.
     */
    const branchId = selectedBranch ? parseInt(selectedBranch.id, 10) : undefined;
    const { smartCategories, isLoading: popularLoading } = useSmartCategories(
        Number.isFinite(branchId) ? branchId : undefined,
    );

    const mostOrdered = useMemo(() => {
        const popular = smartCategories.find(c => c.slug === 'most-popular');

        // In rank order. An id missing from `allItems` is a dish this branch
        // has stopped serving since the ranking was computed, so it is walked
        // past like a drink.
        for (const id of popular?.item_ids ?? []) {
            const item = allItems.find(i => i.id === String(id));
            if (item && isHeroDish(item, isItemSoldOut)) return item;
        }

        return null;
    }, [smartCategories, allItems, isItemSoldOut]);

    if (isSearching || popularLoading) return <Skeleton />;

    return (
        <section className="page-x">
            <Deck>
                {[
                    mostOrdered
                        ? <MostOrderedSlide key="most-ordered" item={mostOrdered} onOpen={() => setDetailItem(mostOrdered)} />
                        : <PhotoSlide key="photo" />,
                    ...HERO_BANNERS.map(banner => <BannerSlide key={banner.src} banner={banner} />),
                ]}
            </Deck>

            <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
        </section>
    );
}

function Skeleton() {
    return (
        <section className="page-x">
            <div className="aspect-square w-full animate-pulse rounded-2xl bg-surface-sunken sm:aspect-[16/7]" />
        </section>
    );
}
