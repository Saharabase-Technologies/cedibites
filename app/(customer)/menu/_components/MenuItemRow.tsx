'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { MinusIcon, PlusIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import type { SearchableItem } from '@/app/components/providers/MenuDiscoveryProvider';
import { useMenuDiscovery } from '@/app/components/providers/MenuDiscoveryProvider';
import { useCart, makeCartItemId } from '@/app/components/providers/CartProvider';

type Size = NonNullable<SearchableItem['sizes']>[number];

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
 * Two initials, for the tile where a photograph will go.
 *
 * Not one photograph exists on any of the 43 dishes: every `image_url` on the
 * API comes back null. A frame kept empty for a picture that has not been taken
 * is 43 blank squares, so the tile carries the dish's initials until the real
 * shot arrives and takes the same space.
 */
const SKIP_WORDS = new Set(['with', 'and', 'the', 'of', 'a', 'in', 'or']);

function initials(name: string): string {
    const words = name
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter(word => word.length > 0 && !SKIP_WORDS.has(word.toLowerCase()));

    return words.slice(0, 2).map(word => word[0]!.toUpperCase()).join('') || '?';
}

/**
 * One price, and the button that buys it.
 *
 * The prices used to be behind the item sheet: the card showed the cheapest of
 * them and you had to open a modal to learn that Assorted Jollof is ₵85. Since
 * no dish has a photograph, these labels and figures are the only thing telling
 * two rows apart, so they belong on the face of the row.
 *
 * In the cart, the chip becomes the quantity control for that exact option. The
 * red is the same red every other action on this side of the product uses, so
 * a chip that has turned red reads as "this is in your order".
 */
function PriceChip({ item, size, alone }: { item: SearchableItem; size: Size; alone: boolean }) {
    const { addToCart, removeFromCart, updateQuantity, getCartItem, isLinePending } = useCart();
    const { isOptionSoldOut } = useMenuDiscovery();

    const cartItem = getCartItem(item.id, size.key);
    const quantity = cartItem?.quantity ?? 0;
    const pending = isLinePending(makeCartItemId(item.id, size.key));
    const soldOut = isOptionSoldOut(size.id);

    const price = cedis(size.price);

    if (soldOut) {
        return (
            <span className="flex min-h-10 items-center gap-2 rounded-lg border border-dashed border-hairline px-3 text-sm text-fg-subtle">
                {!alone && <span>{size.label}</span>}
                <span className="tabular-nums line-through">{price}</span>
                <span className="text-xs font-bold uppercase tracking-wide">Off today</span>
            </span>
        );
    }

    if (quantity === 0) {
        return (
            <button
                onClick={() => addToCart(item, size.key)}
                disabled={pending}
                aria-label={alone ? `Add ${item.name}, ${price}` : `Add ${size.label} ${item.name}, ${price}`}
                className="flex min-h-10 items-center gap-2 rounded-lg border border-hairline bg-bg px-3 text-sm transition-colors duration-150 ease-out hover:border-hairline-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-fill disabled:opacity-50"
            >
                {!alone && <span className="font-medium text-fg-muted">{size.label}</span>}
                <span className="font-bold tabular-nums text-fg">{price}</span>
                {pending
                    ? <SpinnerGapIcon size={14} className="animate-spin text-fg-muted" />
                    : <PlusIcon size={14} weight="bold" className="text-primary-ink" />}
            </button>
        );
    }

    return (
        <div className="flex min-h-10 items-center gap-0.5 rounded-lg bg-primary-fill pl-0.5 pr-0.5 text-white">
            <button
                onClick={() => (quantity <= 1
                    ? removeFromCart(cartItem!.cartItemId)
                    : updateQuantity(cartItem!.cartItemId, quantity - 1))}
                disabled={pending}
                aria-label={quantity <= 1 ? `Remove ${size.label} ${item.name}` : `One fewer ${size.label} ${item.name}`}
                className="grid h-9 w-9 place-items-center rounded-lg transition-colors duration-150 ease-out hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
                <MinusIcon size={14} weight="bold" />
            </button>

            <span className="min-w-5 text-center text-sm font-bold tabular-nums">{quantity}</span>

            <button
                onClick={() => updateQuantity(cartItem!.cartItemId, quantity + 1)}
                disabled={pending}
                aria-label={`One more ${size.label} ${item.name}`}
                className="grid h-9 w-9 place-items-center rounded-lg transition-colors duration-150 ease-out hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
                <PlusIcon size={14} weight="bold" />
            </button>

            {!alone && (
                <span className="max-w-28 truncate pl-1 pr-2 text-xs font-semibold">{size.label}</span>
            )}
        </div>
    );
}

/**
 * A dish, at full width.
 *
 * It was a card in a two-column grid, and the names on this menu do not fit
 * one: "Assorted Fried Rice / Jollof Rice / Noodles + Full Chicken + Kɔkɔɔ" is
 * sixty-six characters. At half a phone's width that wrapped to four lines
 * above a picture that does not exist. A row gives the name the whole line and
 * puts every price where it can be read without opening anything.
 */
export default function MenuItemRow({
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
    const image = item.thumbnail ?? item.image;
    const tag = item.tags?.[0];

    // "Standard" is what the till calls an option on a dish that only has one.
    // Printing it beside the price tells a customer nothing.
    const alone = sizes.length <= 1;

    return (
        <article
            className={`rounded-2xl border border-hairline bg-surface p-3.5 transition-colors duration-150 ease-out ${
                soldOut ? 'opacity-55' : 'hover:border-hairline-strong'
            }`}
        >
            {/* The picture, the name and the description are one target. Three
                separate tab stops onto the same sheet is three times the work
                for anyone using a keyboard, and a thumbnail that does nothing
                when tapped is the kind of dead spot a phone punishes you for. */}
            <button
                onClick={() => onOpen(item)}
                aria-label={`${item.name}. Open for details`}
                className="flex w-full gap-3.5 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-fill"
            >
                <span className="relative h-18 w-18 shrink-0 overflow-hidden rounded-xl bg-surface-sunken">
                    {image && !imageFailed ? (
                        <Image
                            src={image}
                            alt=""
                            fill
                            sizes="72px"
                            className="object-cover"
                            onError={() => setImageFailed(true)}
                        />
                    ) : (
                        <span className="grid h-full w-full place-items-center text-base font-bold tracking-wide text-fg-subtle">
                            {initials(item.name)}
                        </span>
                    )}
                </span>

                <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-2">
                        <h3 className="min-w-0 flex-1 text-[15px] font-bold leading-snug text-fg">{item.name}</h3>

                        {soldOut ? (
                            <span className="shrink-0 rounded-md bg-surface-sunken px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fg-muted">
                                Sold out
                            </span>
                        ) : tag ? (
                            <span className="shrink-0 rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-ink">
                                {tag.name}
                            </span>
                        ) : null}
                    </span>

                    {item.description && (
                        <span className="mt-1 line-clamp-2 block text-[13px] leading-snug text-fg-muted">
                            {item.description}
                        </span>
                    )}
                </span>
            </button>

            {sizes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {sizes.map(size => (
                        <PriceChip key={size.key} item={item} size={size} alone={alone} />
                    ))}
                </div>
            )}
        </article>
    );
}
