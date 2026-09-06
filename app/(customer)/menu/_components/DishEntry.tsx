'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { MinusIcon, PlusIcon } from '@phosphor-icons/react';
import type { SearchableItem } from '@/app/components/providers/MenuDiscoveryProvider';
import { useMenuDiscovery } from '@/app/components/providers/MenuDiscoveryProvider';
import { useCart, makeCartItemId } from '@/app/components/providers/CartProvider';
import { photoForMenuItem } from '@/lib/constants/branchPhotos';

type Size = NonNullable<SearchableItem['sizes']>[number];

function cedis(value: number | string | null | undefined): string {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return '₵0';
    return `₵${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

/**
 * One line of the price ladder.
 *
 * The ladder is the whole idea. A board above a counter prints the dish once
 * and its prices in a column beside it, aligned on the currency, and you read
 * down the column to find your money. That is a faster read than three bordered
 * chips in a row, and it costs no outlines, no plus icons and no colour.
 *
 * The line is the control. Tapping it puts that exact option in the order and
 * the line turns red, which is the only red the page has and only ever appears
 * after somebody acts.
 */
function LadderLine({ item, size, showLabel }: { item: SearchableItem; size: Size; showLabel: boolean }) {
    const { addToCart, removeFromCart, updateQuantity, getCartItem, isLinePending } = useCart();
    const { isOptionSoldOut } = useMenuDiscovery();

    const line = getCartItem(item.id, size.key);
    const quantity = line?.quantity ?? 0;
    const pending = isLinePending(makeCartItemId(item.id, size.key));

    if (isOptionSoldOut(size.id)) {
        return (
            <div className="flex min-h-11 items-center justify-between gap-3 px-2.5 text-fg-subtle">
                {showLabel && <span className="truncate text-[13px]">{size.label}</span>}
                <span className="ml-auto text-[13px] tabular-nums line-through">{cedis(size.price)}</span>
            </div>
        );
    }

    if (quantity > 0) {
        return (
            <div className="flex min-h-11 items-center gap-1 rounded-lg bg-primary-fill px-1 text-white">
                <button
                    onClick={() => (quantity <= 1
                        ? removeFromCart(line!.cartItemId)
                        : updateQuantity(line!.cartItemId, quantity - 1))}
                    disabled={pending}
                    aria-label={quantity <= 1 ? `Remove ${size.label} ${item.name}` : `One fewer ${size.label} ${item.name}`}
                    className="grid h-9 w-7 shrink-0 place-items-center rounded-lg transition-colors duration-150 ease-out hover:bg-white/15"
                >
                    <MinusIcon size={13} weight="bold" />
                </button>

                <span className="min-w-4 shrink-0 text-center text-sm font-bold tabular-nums">{quantity}</span>

                <button
                    onClick={() => updateQuantity(line!.cartItemId, quantity + 1)}
                    disabled={pending}
                    aria-label={`One more ${size.label} ${item.name}`}
                    className="grid h-9 w-7 shrink-0 place-items-center rounded-lg transition-colors duration-150 ease-out hover:bg-white/15"
                >
                    <PlusIcon size={13} weight="bold" />
                </button>

                {showLabel && (
                    <span className="ml-auto truncate pr-1.5 text-[11px] font-semibold">{size.label}</span>
                )}
            </div>
        );
    }

    return (
        <button
            onClick={() => addToCart(item, size.key)}
            disabled={pending}
            aria-label={showLabel ? `Add ${size.label} ${item.name}, ${cedis(size.price)}` : `Add ${item.name}, ${cedis(size.price)}`}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2.5 text-left transition-colors duration-150 ease-out hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg active:bg-surface-sunken disabled:opacity-50"
        >
            {showLabel && <span className="truncate text-[13px] text-fg-muted">{size.label}</span>}
            <span className="ml-auto text-[15px] font-bold tabular-nums text-fg">{cedis(size.price)}</span>
        </button>
    );
}

/**
 * A dish on the board.
 *
 * Three things were wrong with the list this replaces, and they were all the
 * same mistake: it was built like a shop catalogue rather than like a menu.
 *
 * A thumbnail column meant every dish without a photograph carried a hole,
 * and only eleven of forty-three have one. The photograph moves above the name
 * and runs the full width, so a dish without one has no gap to explain.
 *
 * Every option had a bordered button with a plus in it. The ladder prints them
 * in a column instead, aligned on the cedi sign, and each line is itself the
 * control. Nothing is outlined and nothing is coloured until you order it.
 *
 * And the name is set in the brand face at board size, because on a menu with
 * almost no photography the names are the picture.
 */
export default function DishEntry({
    item,
    onOpen,
}: {
    item: SearchableItem;
    onOpen: (item: SearchableItem) => void;
}) {
    const { isItemSoldOut } = useMenuDiscovery();
    const [imageFailed, setImageFailed] = useState(false);

    const sizes = item.sizes ?? [];
    const soldOut = isItemSoldOut(item);
    const image = item.image ?? item.thumbnail ?? photoForMenuItem(item.name)?.src;
    const tag = item.tags?.[0];

    // "Standard" is what the till calls the only option on a dish that has one.
    // Printing it above a single price says nothing.
    const showLabels = sizes.length > 1;

    return (
        <article className={soldOut ? 'opacity-50' : ''}>
            {image && !imageFailed && (
                <button
                    onClick={() => onOpen(item)}
                    tabIndex={-1}
                    aria-hidden
                    className="relative mb-3 block aspect-16/9 w-full overflow-hidden rounded-xl bg-surface-sunken"
                >
                    <Image
                        src={image}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, 380px"
                        className="object-cover"
                        onError={() => setImageFailed(true)}
                    />
                </button>
            )}

            <div className="flex items-start gap-4">
                <button
                    onClick={() => onOpen(item)}
                    className="min-w-0 flex-1 rounded-sm pt-0.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
                >
                    <span className="flex items-baseline gap-2">
                        <h3 className="font-brand min-w-0 flex-1 text-xl leading-none tracking-wide text-fg">
                            {item.name}
                        </h3>
                        {soldOut && (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-fg-muted">
                                Sold out
                            </span>
                        )}
                        {!soldOut && tag && (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-accent-ink">
                                {tag.name}
                            </span>
                        )}
                    </span>

                    {item.description && (
                        <span className="mt-1.5 line-clamp-2 block text-[13px] leading-relaxed text-fg-muted">
                            {item.description}
                        </span>
                    )}
                </button>

                {!soldOut && sizes.length > 0 && (
                    <div className="w-32 shrink-0 sm:w-36">
                        {sizes.map(size => (
                            <LadderLine key={size.key} item={item} size={size} showLabel={showLabels} />
                        ))}
                    </div>
                )}
            </div>
        </article>
    );
}
