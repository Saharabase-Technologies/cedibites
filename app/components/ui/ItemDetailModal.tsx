'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { CheckIcon, MinusIcon, PlusIcon, XIcon } from '@phosphor-icons/react';
import type { SearchableItem } from '@/app/components/providers/MenuDiscoveryProvider';
import { useMenuDiscovery } from '@/app/components/providers/MenuDiscoveryProvider';
import { useCart, DEFAULT_SIZE_KEY, makeCartItemId } from '@/app/components/providers/CartProvider';
import { photoForMenuItem } from '@/lib/constants/branchPhotos';
import BottomSheet from './BottomSheet';

interface ItemDetailModalProps {
    item: SearchableItem | null;
    onClose: () => void;
    /**
     * Which option to open on. Search lists one row per option now, so tapping
     * "Assorted" has to land on Assorted rather than on whichever option the
     * backend happened to return first.
     */
    initialSizeKey?: string;
}

const formatPrice = (price: number | string | null | undefined) => {
    const n = typeof price === 'number' ? price : Number(price);
    if (!Number.isFinite(n)) return '₵0';
    return `₵${Number.isInteger(n) ? n : n.toFixed(2)}`;
};

/**
 * One dish, and the choice you make about it.
 *
 * The sheet mechanics moved into BottomSheet the moment the cart wanted the
 * same ones: the handle, the drag, the scroll lock, the focus trap, the safe
 * area, the body that scrolls inside itself. Two copies is how two sheets in
 * one app end up behaving differently on the same phone.
 *
 * What stays here is the dish: the picture, the options and the button.
 *
 * The variant selector that used to sit here is gone. `variants` is never
 * populated: MenuDiscoveryProvider's transform says so in as many words, and
 * every option on this menu arrives as a size.
 */
export default function ItemDetailModal({ item, onClose, initialSizeKey }: ItemDetailModalProps) {
    const { addToCart, removeFromCart, getCartItem, updateQuantity, isLinePending } = useCart();
    const { isOptionSoldOut } = useMenuDiscovery();

    /**
     * The dish outlives the prop by one animation.
     *
     * Closing sets `item` to null straight away and the sheet needs another
     * quarter second to leave. Without holding on to the last one, the panel
     * would empty itself and then slide an empty box off the screen.
     */
    const [shown, setShown] = useState<SearchableItem | null>(item);
    const [selectedSize, setSelectedSize] = useState<string>(DEFAULT_SIZE_KEY);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        if (!item) return;

        setShown(item);
        setImgError(false);
        setSelectedSize(
            initialSizeKey && item.sizes?.some(s => s.key === initialSizeKey)
                ? initialSizeKey
                : item.sizes?.[0]?.key ?? DEFAULT_SIZE_KEY,
        );
    }, [item, initialSizeKey]);

    if (!shown) return null;

    const sizes = shown.sizes ?? [];
    const hasSizes = sizes.length > 0;

    const activeSize = hasSizes ? sizes.find(s => s.key === selectedSize) : undefined;
    const activePrice = hasSizes ? activeSize?.price ?? 0 : shown.price ?? 0;
    const cartItemId = hasSizes ? selectedSize : DEFAULT_SIZE_KEY;

    const cartItem = getCartItem(shown.id, cartItemId);
    const qty = cartItem?.quantity ?? 0;
    const soldOut = isOptionSoldOut(activeSize?.id);
    const pending = isLinePending(makeCartItemId(shown.id, cartItemId));

    const image = activeSize?.image ?? shown.image ?? shown.thumbnail ?? photoForMenuItem(shown.name)?.src;
    const hasPhoto = Boolean(image) && !imgError;
    const tag = shown.tags?.[0];

    const header = hasPhoto ? (
        /* Capped, because a full-width 16:9 photograph is 242px on a large
           handset, and that is an option row and a half of the sheet. */
        <div className="relative aspect-16/9 max-h-52 w-full overflow-hidden bg-surface-sunken">
            <Image
                src={image!}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 448px"
                className="object-cover"
                onError={() => setImgError(true)}
                priority
            />
            {tag && (
                <span className="absolute left-3 top-3 rounded-md bg-accent px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-fg">
                    {tag.name}
                </span>
            )}
            <button
                onClick={onClose}
                aria-label="Close"
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg bg-black/45 text-white transition-colors duration-150 ease-out hover:bg-black/65"
            >
                <XIcon size={17} weight="bold" />
            </button>
        </div>
    ) : (
        /* No photograph, so no empty band. The close button moves in beside the
           name rather than floating over a grey rectangle. */
        <div className="flex items-start justify-end px-5 pt-2">
            <button
                onClick={onClose}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-lg text-fg-muted transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-fg"
            >
                <XIcon size={17} weight="bold" />
            </button>
        </div>
    );

    const footer = (
        <div className="flex items-center gap-3 px-5 pb-5 pt-4">
            {soldOut ? (
                <p className="flex-1 text-sm font-bold text-fg-muted">
                    {sizes.length > 1 ? 'Sold out. Try another choice.' : 'Sold out today.'}
                </p>
            ) : qty > 0 ? (
                <>
                    <div className="flex h-13 items-center gap-1 rounded-xl bg-surface-sunken px-1">
                        <button
                            onClick={() => (qty <= 1
                                ? removeFromCart(cartItem!.cartItemId)
                                : updateQuantity(cartItem!.cartItemId, qty - 1))}
                            disabled={pending}
                            aria-label={qty <= 1 ? 'Remove from the order' : 'One fewer'}
                            className="grid h-11 w-10 place-items-center rounded-lg text-fg transition-colors duration-150 ease-out hover:bg-bg"
                        >
                            <MinusIcon size={15} weight="bold" />
                        </button>
                        <span aria-live="polite" className="min-w-6 text-center text-base font-bold tabular-nums text-fg">
                            {qty}
                        </span>
                        <button
                            onClick={() => updateQuantity(cartItem!.cartItemId, qty + 1)}
                            disabled={pending}
                            aria-label="One more"
                            className="grid h-11 w-10 place-items-center rounded-lg text-fg transition-colors duration-150 ease-out hover:bg-bg"
                        >
                            <PlusIcon size={15} weight="bold" />
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="h-13 flex-1 rounded-xl bg-primary-fill text-sm font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95"
                    >
                        Done · {formatPrice(activePrice * qty)}
                    </button>
                </>
            ) : (
                <button
                    onClick={() => addToCart(shown, cartItemId)}
                    disabled={pending}
                    className="h-13 flex-1 rounded-xl bg-primary-fill text-sm font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95 disabled:opacity-60"
                >
                    {pending ? 'Adding…' : `Add to order · ${formatPrice(activePrice)}`}
                </button>
            )}
        </div>
    );

    return (
        <BottomSheet
            open={Boolean(item)}
            onClose={onClose}
            label={shown.name}
            wide="dialog"
            header={header}
            footer={footer}
        >
            <div className="px-5 pb-5 pt-4">
                <h2 className="text-xl font-bold leading-tight text-fg">{shown.name}</h2>

                {!hasPhoto && tag && (
                    <p className="mt-1.5 text-[11px] font-bold uppercase tracking-widest text-accent-ink">
                        {tag.name}
                    </p>
                )}

                {shown.description && (
                    <p className="mt-2 text-sm leading-relaxed text-fg-muted">{shown.description}</p>
                )}

                {sizes.length > 1 && (
                    <div className="mt-6">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-fg-muted">Choose one</p>

                        {/* A list, not a row of chips. "Assorted Fried Rice" does
                            not fit in a chip and the chips truncated it. Filled
                            rather than outlined: eleven bordered boxes in a sheet
                            is the noise the menu just got rid of. */}
                        <div role="radiogroup" aria-label="Choose one" className="mt-2.5 flex flex-col gap-2">
                            {sizes.map(size => {
                                const chosen = size.key === selectedSize;
                                const optionSoldOut = isOptionSoldOut(size.id);
                                const inCart = getCartItem(shown.id, size.key)?.quantity ?? 0;

                                return (
                                    <button
                                        key={size.key}
                                        role="radio"
                                        aria-checked={chosen}
                                        disabled={optionSoldOut}
                                        onClick={() => setSelectedSize(size.key)}
                                        /* The chosen row is the filled one and the
                                           rest sit on the sheet's own ground. A
                                           selected state has to be unmistakable,
                                           and this is the way to do it without
                                           putting an outline round every option. */
                                        className={`flex min-h-13 items-center gap-3 rounded-xl px-4 text-left transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg ${
                                            optionSoldOut ? 'opacity-50' : chosen ? 'bg-surface-sunken' : 'hover:bg-surface-sunken/60'
                                        }`}
                                    >
                                        <span
                                            aria-hidden
                                            className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors duration-150 ease-out ${
                                                chosen ? 'border-fg bg-fg text-bg' : 'border-hairline-strong'
                                            }`}
                                        >
                                            {chosen && <CheckIcon size={11} weight="bold" />}
                                        </span>

                                        <span className={`min-w-0 flex-1 text-sm text-fg ${chosen ? 'font-bold' : 'font-medium'}`}>
                                            {size.label}
                                            {inCart > 0 && (
                                                <span className="ml-2 text-[11px] font-bold text-fg-muted">
                                                    {inCart} in cart
                                                </span>
                                            )}
                                        </span>

                                        <span className="shrink-0 text-sm font-bold tabular-nums text-fg">
                                            {optionSoldOut ? 'Sold out' : formatPrice(size.price)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </BottomSheet>
    );
}
