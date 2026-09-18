'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { PlusIcon, MinusIcon, TrashIcon } from '@phosphor-icons/react';
import type { SearchableItem } from '@/app/components/providers/MenuDiscoveryProvider';
import { useMenuDiscovery } from '@/app/components/providers/MenuDiscoveryProvider';
import { useCart, DEFAULT_SIZE_KEY, makeCartItemId } from '@/app/components/providers/CartProvider';

interface MenuItemCardProps {
    item: SearchableItem;
    onOpenDetail?: (item: SearchableItem) => void;
    /**
     * Browse mode: picture, name, price, add. Nothing else.
     *
     * The full card carries tags, a category badge, two lines of description,
     * variant pills and size pills, which is eight things to read before you
     * know whether you want it. That belongs on the item sheet, where somebody
     * is deciding. On a home screen showing six dishes it is forty-eight things.
     */
    compact?: boolean;
}

const formatPrice = (price: number | string | null | undefined) => {
    const n = typeof price === 'number' ? price : Number(price);
    return `₵${Number.isNaN(n) ? '0.00' : n.toFixed(2)}`;
};

export default function MenuItemCard({ item, onOpenDetail, compact = false }: MenuItemCardProps) {
    const { addToCart, removeFromCart, updateQuantity, getCartItem, isLinePending } = useCart();
    const { isOptionSoldOut } = useMenuDiscovery();

    // Handle sizes
    const sizes = item.sizes ?? [];
    const hasSizes = sizes.length > 0;

    // Handle variants (Plain/Assorted)
    const hasVariants = item.hasVariants && item.variants;
    const variantOptions = hasVariants ? Object.keys(item.variants!) : [];

    const [selectedSize, setSelectedSize] = useState<string>(
        hasSizes ? sizes[0].key : DEFAULT_SIZE_KEY
    );
    const [selectedVariant, setSelectedVariant] = useState<string>(
        hasVariants ? variantOptions[0] : DEFAULT_SIZE_KEY
    );
    const [imgError, setImgError] = useState(false);

    // Calculate active price
    let activePrice = 0;
    if (hasVariants && item.variants) {
        activePrice = item.variants[selectedVariant as 'plain' | 'assorted'] ?? 0;
    } else if (hasSizes) {
        activePrice = sizes.find((s) => s.key === selectedSize)?.price ?? 0;
    } else {
        activePrice = item.price ?? 0;
    }

    const cartItemId = hasVariants ? selectedVariant : selectedSize;
    const cartItem = getCartItem(item.id, cartItemId);
    const qty = cartItem?.quantity ?? 0;
    const pending = isLinePending(makeCartItemId(item.id, cartItemId));

    const activeSize = hasSizes ? sizes.find(s => s.key === selectedSize) : undefined;
    const activeImage = activeSize?.thumbnail ?? activeSize?.image ?? item.thumbnail ?? item.image;
    const soldOut = isOptionSoldOut(activeSize?.id);

    const stop = (e: React.MouseEvent) => e.stopPropagation();

    const handleAdd = (e: React.MouseEvent) => {
        stop(e);
        addToCart(item, cartItemId);
    };

    // At one, down is remove — anywhere above it, down is one fewer. The card used
    // to turn + into a − that deleted the whole line however many were in it, so
    // there was no way to put two of anything in the cart from the grid, and the
    // control that looked like a decrement was destructive.
    const handleDecrease = (e: React.MouseEvent) => {
        stop(e);
        if (!cartItem) return;
        if (qty <= 1) removeFromCart(cartItem.cartItemId);
        else updateQuantity(cartItem.cartItemId, qty - 1);
    };

    return (
        <article
            className="card-lift card-lift-tap group cursor-pointer relative flex flex-col bg-surface rounded-2xl overflow-hidden transition-shadow duration-150 ease-out"
            onClick={() => onOpenDetail?.(item)}
        >
            {/* Image */}
            <div className="relative w-full aspect-4/3 bg-primary/20 dark:bg-brand-dark overflow-hidden shrink-0">
                {activeImage && !imgError ? (
                    <Image
                        src={activeImage}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="w-full h-full" />
                )}

                {!compact && item.tags && item.tags.length > 0 && (
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {item.tags.map(tag => (
                            <span key={tag.slug} className="flex items-center gap-1 bg-primary text-white text-[10px] font-semibold px-2 py-0.5 rounded-lg leading-none capitalize">
                                {tag.name}
                            </span>
                        ))}
                    </div>
                )}

                {!compact && item.category && (
                    <span className="absolute bottom-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-lg backdrop-blur-sm bg-neutral-gray/80 text-white">
                        {item.category}
                    </span>
                )}
            </div>

            {/* Body */}
            <div className="flex flex-col flex-1 p-3 gap-2">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-text-dark dark:text-text-light leading-tight truncate">
                        {item.name}
                    </h3>
                    {!compact && item.description && (
                        <p className="mt-0.5 text-xs text-neutral-gray line-clamp-2 leading-snug">
                            {item.description}
                        </p>
                    )}
                </div>

                {/* Variant pills (Plain/Assorted) */}
                {!compact && hasVariants && (
                    <div className="flex gap-1 flex-wrap" onClick={e => e.stopPropagation()}>
                        {variantOptions.map((variant) => (
                            <button
                                key={variant}
                                onClick={(e) => { e.stopPropagation(); setSelectedVariant(variant); }}
                                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-medium border transition-colors duration-150 capitalize
                                    ${selectedVariant === variant
                                        ? 'bg-neutral-gray text-white border-neutral-gray'
                                        : 'border-neutral-gray/30 text-neutral-gray hover:border-primary/60'
                                    }`}
                            >
                                {variant}
                            </button>
                        ))}
                    </div>
                )}

                {/* Size pills */}
                {!compact && hasSizes && (
                    <div className="flex gap-1 flex-wrap" onClick={e => e.stopPropagation()}>
                        {sizes.map((s) => {
                            // Still selectable when off, so the price and the reason stay
                            // visible — it is the add control that refuses, not the pill.
                            const sizeSoldOut = isOptionSoldOut(s.id);
                            return (
                                <button
                                    key={s.key}
                                    onClick={(e) => { e.stopPropagation(); setSelectedSize(s.key); }}
                                    title={sizeSoldOut ? `${s.label} is sold out at this branch` : undefined}
                                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-medium border transition-colors duration-150
                                        ${selectedSize === s.key
                                            ? 'bg-neutral-gray text-white border-neutral-gray'
                                            : 'border-neutral-gray/30 text-neutral-gray hover:border-primary/60'
                                        }
                                        ${sizeSoldOut ? 'line-through opacity-50' : ''}`}
                                >
                                    {s.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Price + quantity stepper */}
                <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                    <span className="text-base font-bold text-primary leading-none">
                        {formatPrice(activePrice)}
                    </span>
                    {soldOut ? (
                        <span className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-lg bg-neutral-gray/15 text-neutral-gray">
                            Sold out
                        </span>
                    ) : qty > 0 ? (
                        <div
                            onClick={stop}
                            className={`flex items-center gap-1 rounded-lg bg-primary/10 p-0.5 transition-opacity ${pending ? 'opacity-60' : ''}`}
                        >
                            <button
                                onClick={handleDecrease}
                                disabled={pending}
                                className="w-7 h-7 cursor-pointer flex items-center justify-center rounded-lg bg-white dark:bg-brand-dark text-text-dark dark:text-text-light hover:text-error active:scale-90 transition-all disabled:cursor-not-allowed"
                                aria-label={qty <= 1 ? `Remove ${item.name} from cart` : `Decrease ${item.name} quantity`}
                            >
                                {qty <= 1
                                    ? <TrashIcon weight="bold" size={12} />
                                    : <MinusIcon weight="bold" size={12} />}
                            </button>
                            <span
                                aria-live="polite"
                                className="text-xs font-bold text-text-dark dark:text-text-light w-4 text-center tabular-nums"
                            >
                                {qty}
                            </span>
                            <button
                                onClick={handleAdd}
                                disabled={pending}
                                className="w-7 h-7 cursor-pointer flex items-center justify-center rounded-lg bg-primary hover:bg-primary-hover text-white active:scale-90 transition-all disabled:cursor-not-allowed"
                                aria-label={`Increase ${item.name} quantity`}
                            >
                                <PlusIcon weight="bold" size={12} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleAdd}
                            disabled={pending}
                            className="w-8 h-8 cursor-pointer flex items-center justify-center rounded-lg bg-primary hover:bg-primary-hover text-white transition-all duration-200 active:scale-90 disabled:opacity-60 disabled:cursor-not-allowed"
                            aria-label={`Add ${item.name} to cart`}
                        >
                            <PlusIcon weight="bold" size={14} />
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}
