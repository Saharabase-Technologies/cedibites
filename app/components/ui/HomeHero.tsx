'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRightIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { useAuth } from '../providers/AuthProvider';
import { useMenuDiscovery, type SearchableItem } from '../providers/MenuDiscoveryProvider';
import { useOrders } from '@/lib/api/hooks/useOrders';
import { useReorder } from '@/lib/hooks/useReorder';
import { BRANCH_PHOTOS, matchMenuItem } from '@/lib/constants/branchPhotos';
import { serverNow } from '@/lib/utils/serverClock';
import BlockHeading from './BlockHeading';
import ItemDetailModal from './ItemDetailModal';
import type { Order as ApiOrder } from '@/types/api';

const REPEATABLE = new Set(['completed', 'delivered']);

const formatPrice = (p: number | string | null | undefined) => {
    const n = typeof p === 'number' ? p : Number(p);
    return `₵${Number.isNaN(n) ? '0.00' : n.toFixed(2)}`;
};

function whenText(iso: string): string {
    const days = Math.floor((serverNow().getTime() - new Date(iso).getTime()) / 86_400_000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 14) return 'last week';
    if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function basketLine(order: ApiOrder): string {
    const names = (order.items ?? []).map(i => i.menu_item_snapshot?.name ?? i.menu_item?.name ?? 'Item');
    if (names.length === 0) return 'Your order';
    if (names.length <= 2) return names.join(' and ');
    return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

/** The photograph is the dish's own. Nothing here is a stock shot or a stand-in. */
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
    const body = (
        <>
            {image && !imgError ? (
                <Image
                    src={image}
                    alt={alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 1100px"
                    className="object-cover"
                    priority
                    onError={() => setImgError(true)}
                />
            ) : (
                // No broken frame. With no photograph the panel closes over it
                // and the type carries the whole thing, which is how the brand's
                // own layouts read anyway.
                <div className="absolute inset-0 bg-fg" />
            )}
            {/* A scrim, not decoration: the caps have to survive whatever is
                behind them, and these photographs are bright. */}
            <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/35 to-black/5" />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">{children}</div>
        </>
    );

    const cls = 'relative block w-full overflow-hidden rounded-2xl aspect-square sm:aspect-[16/7] text-left';
    if (href) return <Link href={href} className={cls}>{body}</Link>;
    return <button onClick={onClick} className={cls}>{body}</button>;
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
    const { reorder, reorderingId } = useReorder();
    const { allItems, isSearching } = useMenuDiscovery();
    const [detailItem, setDetailItem] = useState<SearchableItem | null>(null);

    const lastBasket = useMemo(
        () => orders.find(o => REPEATABLE.has(o.status) && (o.items?.length ?? 0) > 0) ?? null,
        [orders],
    );

    // The hero photograph for a reorder is the first dish in that basket.
    const basketImage = useMemo(() => {
        if (!lastBasket) return undefined;
        for (const line of lastBasket.items ?? []) {
            const found = allItems.find(i => i.id === String(line.menu_item_id));
            if (found?.image) return found.image;
        }
        return undefined;
    }, [lastBasket, allItems]);

    // The lead photograph is a real shot from the branch counter. Where the menu
    // has a dish it is honestly a picture of, the hero becomes that dish: real
    // name, real price, opens its sheet. Where it does not, it stays a caption
    // and sends you to the menu rather than claiming something is orderable.
    const photo = BRANCH_PHOTOS.drumsticks;
    const photoItem = useMemo(
        () => matchMenuItem(photo, allItems),
        [photo, allItems],
    );

    if (isLoggedIn && ordersLoading) return <Skeleton />;
    // The photograph does not need the menu, so a cold visit with no branch
    // chosen yet still opens on something rather than on nothing.
    if (isLoggedIn && !lastBasket && isSearching && allItems.length === 0) return <Skeleton />;

    // ── Returning customer ────────────────────────────────────────────────
    if (lastBasket) {
        const busy = reorderingId === lastBasket.id;
        return (
            <section className="page-x">
                <Frame image={basketImage} onClick={() => !busy && reorder(lastBasket)}>
                    <BlockHeading tone="red" size="lg" as="h1">Order it again</BlockHeading>

                    <p className="mt-3 max-w-lg text-sm font-semibold leading-snug text-white sm:text-base">
                        {basketLine(lastBasket)}
                    </p>
                    <p className="mt-1 text-sm text-white/70">
                        {formatPrice(lastBasket.total)} · {whenText(lastBasket.created_at)}
                    </p>

                    <span className="mt-4 inline-flex h-12 items-center gap-2 rounded-lg bg-primary-fill px-5 text-sm font-bold text-white">
                        {busy ? (
                            <><SpinnerGapIcon size={16} className="animate-spin" /> Adding to cart</>
                        ) : (
                            <>Add it to my cart <ArrowRightIcon size={15} weight="bold" /></>
                        )}
                    </span>
                </Frame>

                <div className="mt-2 flex justify-end">
                    <Link
                        href="/orders"
                        className="text-sm font-bold text-primary-ink transition-opacity duration-150 ease-out hover:opacity-70"
                    >
                        All my orders
                    </Link>
                </div>
            </section>
        );
    }

    // ── Everybody else ────────────────────────────────────────────────────
    const price = photoItem ? (photoItem.sizes?.[0]?.price ?? photoItem.price ?? 0) : null;

    return (
        <section className="page-x">
            <Frame
                image={photo.src}
                alt={photo.alt}
                href={photoItem ? undefined : '/menu'}
                onClick={photoItem ? () => setDetailItem(photoItem) : undefined}
            >
                <BlockHeading tone="red" size="lg" as="h1">
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
