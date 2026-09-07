'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import type { SearchableItem } from '@/app/components/providers/MenuDiscoveryProvider';
import { useMenuDiscovery } from '@/app/components/providers/MenuDiscoveryProvider';
import { makeCartItemId } from '@/app/components/providers/CartProvider';
import { PlusIcon } from '@phosphor-icons/react';
import { useCart } from '@/app/components/providers/CartProvider';
import { photoForMenuItem } from '@/lib/constants/branchPhotos';

function cedis(value: number | string | null | undefined): string {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return '₵0';
    return `₵${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

/**
 * A dish, as a card.
 *
 * Cards only became workable once the options moved to the sheet. A card that
 * had to hold three labelled prices and three buttons was the reason the first
 * build of this page was unreadable; a card holding a picture, a name and what
 * it costs is the thing cards are actually good at.
 *
 * The problem cards have on this menu is that thirty-two of the forty-three
 * dishes have no photograph, and a grid of mostly empty picture frames is
 * exactly what made the original page look broken.
 *
 * So a card without a photograph does not leave the frame empty. It gives the
 * space to the name, set large, and becomes a typographic card. That is not a
 * workaround invented here: the design system already ships one deliberately
 * typographic deal card, for the same reason, because no full-chicken shot
 * exists.
 *
 * Two kinds of card in one grid is the point rather than a compromise. A row of
 * identical cards at identical weight is the flattest thing a page can do, and
 * here the photography decides which dishes carry the eye.
 */
export default function DishCard({
    item,
    onOpen,
}: {
    item: SearchableItem;
    onOpen: (item: SearchableItem) => void;
}) {
    const { isItemSoldOut } = useMenuDiscovery();
    const { getCartItem, addToCart, isLinePending } = useCart();
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

    const hasPhoto = Boolean(image) && !imageFailed;

    // One option and the button adds it. Several and it opens the sheet, which
    // is where choosing happens. A bottle of water should not need a sheet.
    const only = sizes.length === 1 ? sizes[0] : null;
    const pending = only ? isLinePending(makeCartItemId(item.id, only.key)) : false;

    return (
        <article
            className={`relative flex h-full flex-col overflow-hidden rounded-2xl border border-hairline bg-surface transition-colors duration-150 ease-out hover:border-hairline-strong ${
                soldOut ? 'opacity-55' : ''
            }`}
        >
            {/* The card opens the sheet. The button inside it sits above this
                layer, so the two do not fight over the same tap. */}
            <button
                onClick={() => onOpen(item)}
                aria-label={`${item.name}, ${spread ? 'from ' : ''}${cedis(lowest)}. Open for details`}
                className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            />

            <span className="relative block aspect-4/3 w-full shrink-0 overflow-hidden bg-surface-sunken">
                {hasPhoto ? (
                    <Image
                        src={image!}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                        className="object-cover"
                        onError={() => setImageFailed(true)}
                    />
                ) : (
                    /* The mark, quietly, on the ground the photograph would have
                       used. Eighteen dishes have no picture and a card that
                       simply skipped the panel made the grid ragged; this keeps
                       every card the same shape and says whose kitchen it is
                       rather than announcing a missing file. The stock "No
                       Image Available" plate in public/ is not used: it is
                       somebody else's basil and pasta, and it tells a customer
                       about our filing rather than about the food. */
                    <span className="grid h-full w-full place-items-center">
                        <Image
                            src="/logo/mark-black.webp"
                            alt=""
                            width={256}
                            height={179}
                            className="w-[26%] max-w-24 opacity-20"
                        />
                    </span>
                )}

                {/* Up on the panel, where a flash on a menu board goes. Yellow
                   is the brand's attention colour and it never carries white
                   text, so it takes ink. */}
                {!soldOut && tag && (
                    <span className="absolute left-2.5 top-2.5 z-10 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-fg">
                        {tag.name}
                    </span>
                )}
                {soldOut && (
                    <span className="absolute left-2.5 top-2.5 z-10 rounded-md bg-fg px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-bg">
                        Sold out
                    </span>
                )}
            </span>

            <div className="pointer-events-none relative z-10 flex flex-1 flex-col p-3.5">
                {/* Body face, not the brand face.
                    American Captain is condensed caps and the design system is
                    explicit that it is display type only: at 24px and up in a
                    heavy condensed face it reads, and at a dish name's size it
                    does not. Section headings keep it. A list of forty-three
                    dishes is something to read, not something to look at.

                    The name is still the card when there is no picture, so it
                    takes the room the picture would have had. */}
                <h3 className="relative z-10 line-clamp-2 text-[15px] font-semibold leading-snug text-fg">
                    {item.name}
                </h3>

                {/* Straight under the name. Whether there is anything to decide
                    is the next thing you want after what the dish is, and it
                    comes before what it costs. Tags sit on the picture. */}
                {sizes.length > 1 && (
                    <p className="relative z-10 mt-1.5 truncate text-[10px] font-bold uppercase tracking-widest text-fg-muted">
                        {sizes.length} choices
                    </p>
                )}

                <div className="mt-auto flex items-end justify-between gap-2 pt-3.5">
                    <div className="min-w-0">
                        <p className="text-[15px] font-bold tabular-nums text-fg">
                            {spread && <span className="mr-1 text-[11px] font-semibold text-fg-muted">from</span>}
                            {cedis(lowest)}
                        </p>
                    </div>

                    {/* Ink rather than red. Forty-three red buttons is the page
                        that got thrown away; red on this screen belongs to the
                        section headings and to what is already in the order. */}
                    {!soldOut && (
                        <button
                            onClick={() => (only ? addToCart(item, only.key) : onOpen(item))}
                            disabled={pending}
                            aria-label={only
                                ? `Add ${item.name}, ${cedis(lowest)}`
                                : `Choose from ${sizes.length} options for ${item.name}`}
                            className="pointer-events-auto relative grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-fg text-bg transition-opacity duration-150 ease-out hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:opacity-50"
                        >
                            <PlusIcon size={16} weight="bold" />
                            {inCart > 0 && (
                                <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary-fill px-1 text-[10px] font-bold tabular-nums text-white">
                                    {inCart}
                                </span>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}
