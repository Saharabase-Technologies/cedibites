'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { MinusIcon, PlusIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import type { SearchableItem } from '@/app/components/providers/MenuDiscoveryProvider';
import { useMenuDiscovery } from '@/app/components/providers/MenuDiscoveryProvider';
import { useCart, makeCartItemId } from '@/app/components/providers/CartProvider';
import { photoForMenuItem } from '@/lib/constants/branchPhotos';

/**
 * Whole cedis when the price is whole, which almost every price here is.
 * "₵65.00" spends four characters saying nothing. The exception is real:
 * a bottle of water is ₵7 and the test item somebody left live is ₵0.10.
 */
function cedis(value: number | string | null | undefined): string {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return '₵0';
    return `₵${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

/**
 * A dish, as one line of a menu.
 *
 * The version before this gave every option its own bordered button with a plus
 * inside it. Across 43 dishes that came to 62 buttons and 62 outlines on one
 * screen, inside 43 more outlines, and the food disappeared behind its own
 * controls.
 *
 * The prices stayed and the buttons went. With only eleven photographs on this
 * menu the prices are what tells two rows apart, so they are still on the face
 * of the row, as a line of text rather than as a row of boxes. The action
 * collapses to one control on the right, which is the only red on the row:
 *
 *   one price     it adds that price, then becomes the line's quantity control
 *   several       it opens the sheet, where you choose and then add
 *
 * Rows carry no border of their own. They sit on hairlines inside one card per
 * section, so a section reads as a list rather than as a stack of boxes.
 */
export default function MenuItemRow({
    item,
    onOpen,
}: {
    item: SearchableItem;
    onOpen: (item: SearchableItem) => void;
}) {
    const { isItemSoldOut } = useMenuDiscovery();
    const { addToCart, removeFromCart, updateQuantity, getCartItem, isLinePending } = useCart();
    const [imageFailed, setImageFailed] = useState(false);

    const sizes = item.sizes ?? [];
    const soldOut = isItemSoldOut(item);
    const only = sizes.length === 1 ? sizes[0] : null;

    // The dish's own photograph if it ever gets one, otherwise the brand shot
    // that is honestly a picture of it. `photoForMenuItem` refuses far more
    // often than it matches, which is the point of it.
    const image = item.thumbnail ?? item.image ?? photoForMenuItem(item.name)?.src;

    // Everything of this dish already in the order, counted across its options.
    const inCart = sizes.reduce(
        (total, size) => total + (getCartItem(item.id, size.key)?.quantity ?? 0),
        0,
    );

    const onlyLine = only ? getCartItem(item.id, only.key) : undefined;
    const onlyQuantity = onlyLine?.quantity ?? 0;
    const pending = only ? isLinePending(makeCartItemId(item.id, only.key)) : false;

    /**
     * The prices, as a sentence rather than as a set of controls.
     *
     * "Plain ₵65 · Assorted ₵85 · Seafood ₵105" is the line a printed menu
     * carries. It answers what the chips answered without asking the eye to
     * parse three bordered boxes to do it.
     */
    const priceLine = only
        ? cedis(only.price)
        : sizes.map(size => `${size.label} ${cedis(size.price)}`).join('   ·   ');

    return (
        <article className={`flex items-center gap-3.5 px-4 py-3.5 ${soldOut ? 'opacity-50' : ''}`}>

            {/* The column keeps its width whether or not there is a picture, so
                every name on the page starts at the same place. Empty is left
                empty: thirty-two grey squares would be their own kind of noise,
                and the silence is what makes the eleven real photographs count. */}
            <button
                onClick={() => onOpen(item)}
                tabIndex={-1}
                aria-hidden={!image}
                className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg sm:h-16 sm:w-16"
            >
                {image && !imageFailed && (
                    <Image
                        src={image}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                        onError={() => setImageFailed(true)}
                    />
                )}
            </button>

            <button
                onClick={() => onOpen(item)}
                className="min-w-0 flex-1 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
                <span className="flex items-baseline gap-2">
                    <h3 className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-fg">
                        {item.name}
                    </h3>

                    {soldOut ? (
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-fg-muted">
                            Sold out
                        </span>
                    ) : item.tags?.[0] ? (
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-accent-ink">
                            {item.tags[0].name}
                        </span>
                    ) : null}
                </span>

                {item.description && (
                    <span className="mt-0.5 line-clamp-1 block text-[13px] leading-snug text-fg-muted">
                        {item.description}
                    </span>
                )}

                <span className="mt-1 block truncate text-[13px] font-medium leading-snug text-fg">
                    {priceLine}
                </span>
            </button>

            {!soldOut && (
                <div className="shrink-0">
                    {only && onlyQuantity > 0 ? (
                        <div className="flex h-11 items-center gap-0.5 rounded-lg bg-primary-fill px-0.5 text-white">
                            <button
                                onClick={() => (onlyQuantity <= 1
                                    ? removeFromCart(onlyLine!.cartItemId)
                                    : updateQuantity(onlyLine!.cartItemId, onlyQuantity - 1))}
                                disabled={pending}
                                aria-label={onlyQuantity <= 1 ? `Remove ${item.name}` : `One fewer ${item.name}`}
                                className="grid h-10 w-8 place-items-center rounded-lg transition-colors duration-150 ease-out hover:bg-white/15"
                            >
                                <MinusIcon size={13} weight="bold" />
                            </button>

                            <span className="min-w-4 text-center text-sm font-bold tabular-nums">
                                {onlyQuantity}
                            </span>

                            <button
                                onClick={() => updateQuantity(onlyLine!.cartItemId, onlyQuantity + 1)}
                                disabled={pending}
                                aria-label={`One more ${item.name}`}
                                className="grid h-10 w-8 place-items-center rounded-lg transition-colors duration-150 ease-out hover:bg-white/15"
                            >
                                <PlusIcon size={13} weight="bold" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => (only ? addToCart(item, only.key) : onOpen(item))}
                            disabled={pending}
                            aria-label={only ? `Add ${item.name}, ${cedis(only.price)}` : `Choose an option for ${item.name}`}
                            className="relative grid h-11 w-11 place-items-center rounded-lg bg-primary-fill text-white transition-[filter] duration-150 ease-out hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-fill disabled:opacity-50"
                        >
                            {pending
                                ? <SpinnerGapIcon size={16} className="animate-spin" />
                                : <PlusIcon size={16} weight="bold" />}

                            {/* A dish with several options is chosen on the sheet,
                                so this cannot be a stepper. It can still say how
                                many of the dish are already in the order. */}
                            {inCart > 0 && (
                                <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-fg px-1 text-[10px] font-bold tabular-nums text-bg">
                                    {inCart}
                                </span>
                            )}
                        </button>
                    )}
                </div>
            )}
        </article>
    );
}
