'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import type { SearchableItem } from '@/app/components/providers/MenuDiscoveryProvider';
import { useMenuDiscovery } from '@/app/components/providers/MenuDiscoveryProvider';
import { useCart } from '@/app/components/providers/CartProvider';
import { photoForMenuItem } from '@/lib/constants/branchPhotos';

function cedis(value: number | string | null | undefined): string {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return '₵0';
    return `₵${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

/**
 * A dish on the board.
 *
 * The version before this printed every option and its price down the right of
 * the dish, as a ladder. On a name like "Fried Rice / Jollof + 3 Drums" that
 * left the name two lines tall beside a column too narrow for its own labels,
 * so the ladder truncated to "Fried Ri…" and the entry read as a mess.
 *
 * The options went to the sheet, which is where a choice belongs. The entry is
 * now four things and no controls: the photograph if one exists, the name, the
 * description, and what it costs. Tapping anywhere on it opens the sheet, and
 * the sheet is where you pick and add.
 *
 * One rule for every dish, whether it has one price or three. A bottle of water
 * costs a tap it did not used to, and in exchange the page holds no buttons at
 * all and nothing on it can truncate.
 */
export default function DishEntry({
    item,
    onOpen,
}: {
    item: SearchableItem;
    onOpen: (item: SearchableItem) => void;
}) {
    const { isItemSoldOut } = useMenuDiscovery();
    const { getCartItem } = useCart();
    const [imageFailed, setImageFailed] = useState(false);

    const sizes = item.sizes ?? [];
    const soldOut = isItemSoldOut(item);
    const image = item.image ?? item.thumbnail ?? photoForMenuItem(item.name)?.src;
    const tag = item.tags?.[0];

    const prices = sizes.map(size => Number(size.price)).filter(Number.isFinite);
    const lowest = prices.length ? Math.min(...prices) : Number(item.price ?? 0);
    const spread = prices.length > 1 && Math.max(...prices) !== lowest;

    // Everything of this dish already in the order, counted across its options.
    const inCart = sizes.reduce(
        (total, size) => total + (getCartItem(item.id, size.key)?.quantity ?? 0),
        0,
    );

    return (
        <article className={soldOut ? 'opacity-50' : ''}>
            <button
                onClick={() => onOpen(item)}
                aria-label={`${item.name}, ${spread ? 'from ' : ''}${cedis(lowest)}. Open to choose`}
                className="block w-full rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fg"
            >
                {image && !imageFailed && (
                    <span className="relative mb-3.5 block aspect-16/9 w-full overflow-hidden rounded-xl bg-surface-sunken">
                        <Image
                            src={image}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 100vw, 420px"
                            className="object-cover"
                            onError={() => setImageFailed(true)}
                        />
                    </span>
                )}

                {/* The name takes the line and the price sits at the end of it,
                    which is the one arrangement that cannot squeeze either. */}
                <span className="flex items-baseline gap-4">
                    <h3 className="font-brand min-w-0 flex-1 text-xl leading-none tracking-wide text-fg">
                        {item.name}
                    </h3>
                    <span className="shrink-0 text-[15px] font-bold tabular-nums text-fg">
                        {spread && <span className="mr-1 text-[11px] font-semibold text-fg-muted">from</span>}
                        {cedis(lowest)}
                    </span>
                </span>

                {item.description && (
                    <span className="mt-2 line-clamp-2 block text-[13px] leading-relaxed text-fg-muted">
                        {item.description}
                    </span>
                )}

                {/* A quiet last line. How many choices there are, whether the
                    kitchen has flagged it, and whether any of it is already in
                    the order. Never a price, so it can never disagree with the
                    figure above it. */}
                {(tag || sizes.length > 1 || inCart > 0 || soldOut) && (
                    <span className="mt-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest">
                        {soldOut && <span className="text-fg-muted">Sold out</span>}
                        {!soldOut && tag && <span className="text-accent-ink">{tag.name}</span>}
                        {!soldOut && tag && sizes.length > 1 && <span aria-hidden className="text-fg-subtle">·</span>}
                        {!soldOut && sizes.length > 1 && (
                            <span className="text-fg-muted">{sizes.length} choices</span>
                        )}
                        {inCart > 0 && (
                            <span className="ml-auto rounded-md bg-primary-fill px-1.5 py-0.5 tracking-wide text-white">
                                {inCart} in cart
                            </span>
                        )}
                    </span>
                )}
            </button>
        </article>
    );
}
