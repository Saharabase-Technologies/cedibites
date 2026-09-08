'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRightIcon } from '@phosphor-icons/react';
import { useAuth } from '../providers/AuthProvider';
import { useMenuDiscovery, type SearchableItem } from '../providers/MenuDiscoveryProvider';
import { useOrders } from '@/lib/api/hooks/useOrders';
import { BRANCH_PHOTOS, matchMenuItem } from '@/lib/constants/branchPhotos';
import BlockHeading from './BlockHeading';
import ItemDetailModal from './ItemDetailModal';

const REPEATABLE = new Set(['completed', 'delivered']);

const formatPrice = (p: number | string | null | undefined) => {
    const n = typeof p === 'number' ? p : Number(p);
    return `₵${Number.isNaN(n) ? '0.00' : n.toFixed(2)}`;
};


/**
 * One slide. The photograph is the dish's own, never a stock shot.
 *
 * The two states are deliberately different shapes. With a photograph it is a
 * tall frame with a scrim and the type sitting in the bottom of it. Without
 * one it is a short ink panel with the type in normal flow.
 *
 * That second state used to be the first one with `bg-fg` behind it, which
 * produced a square black rectangle with a caption in the bottom eighth and
 * seven eighths of nothing. The standing rule is that a card which looks like
 * a broken image is broken, whatever the reasoning behind it. A panel that is
 * only as tall as the words it holds reads as a decision.
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
            {/* A scrim, not decoration: the caps have to survive whatever is
                behind them, and these photographs are bright. */}
            <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/35 to-black/5" />
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
 * Home used to open with a greeting, a row of ten-plus category chips, a
 * reorder rail, a rotating promo and fourteen menu cards, all at the same
 * weight. This is the one element that is allowed to be loud.
 *
 * For somebody who has eaten here it is their last order, one tap from being
 * back in the cart. For everybody else it is the dish the kitchen actually
 * sells most of, photographed, with the headline block over it.
 */
export default function HomeHero() {
    const { isLoggedIn } = useAuth();
    const { orders, isLoading: ordersLoading } = useOrders({ per_page: 12 });
    const { allItems, isSearching } = useMenuDiscovery();
    const [detailItem, setDetailItem] = useState<SearchableItem | null>(null);

    const lastBasket = useMemo(
        () => orders.find(o => REPEATABLE.has(o.status) && (o.items?.length ?? 0) > 0) ?? null,
        [orders],
    );

    // The lead photograph is a real shot from the branch counter. Where the menu
    // has a dish it is honestly a picture of, the slide becomes that dish: real
    // name, real price, opens its sheet. Where it does not, it stays a caption
    // and sends you to the menu rather than claiming something is orderable.
    const photo = BRANCH_PHOTOS.drumsticks;
    const photoItem = useMemo(() => matchMenuItem(photo, allItems), [photo, allItems]);

    if (isLoggedIn && ordersLoading) return <Skeleton />;
    // The photograph does not need the menu, so a cold visit with no branch
    // chosen yet still opens on something rather than on nothing.
    if (isLoggedIn && !lastBasket && isSearching && allItems.length === 0) return <Skeleton />;

    const price = photoItem ? (photoItem.sizes?.[0]?.price ?? photoItem.price ?? 0) : null;
    const dishSlide = (
        <Frame
            key="dish"
            image={photo.src}
            alt={photo.alt}
            href={photoItem ? undefined : '/menu'}
            onClick={photoItem ? () => setDetailItem(photoItem) : undefined}
        >
            <BlockHeading tone="red" size="lg" as={lastBasket ? 'h2' : 'h1'}>
                {photoItem?.name ?? photo.title}
            </BlockHeading>

            <p className="mt-3 max-w-md text-sm leading-snug text-white/80 sm:text-base">
                {photo.line}
            </p>

            <span className="mt-4 inline-flex h-12 items-center gap-2 rounded-lg bg-primary-fill px-5 text-sm font-bold text-white">
                {price !== null ? formatPrice(price) : 'See the menu'}
                <ArrowRightIcon size={15} weight="bold" />
            </span>
        </Frame>
    );

    return (
        <section className="page-x">
            {/* One slide for now. The reorder card that sat in front of this is
                being redesigned rather than dropped, so the deck stays: with a
                single slide it renders as a plain block with no dots. */}
            <Deck>{[dishSlide]}</Deck>

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
