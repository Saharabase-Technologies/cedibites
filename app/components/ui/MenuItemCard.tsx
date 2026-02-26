'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { PlusIcon, MinusIcon, FireIcon, StarIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import type { SearchableItem } from '@/app/components/providers/MenuDiscoveryProvider';
import { useCart } from '@/app/components/providers/CartProvider';

interface MenuItemCardProps {
    item: SearchableItem;
    onOpenDetail?: (item: SearchableItem) => void;
}

const formatPrice = (price: number | undefined) => {
    if (price === undefined || price === null || typeof price !== 'number') return 'GHS 0';
    return `GHS ${price.toFixed(0)}`;
};

export default function MenuItemCard({ item, onOpenDetail }: MenuItemCardProps) {
    const { addToCart, removeFromCart, getCartItem } = useCart();

    // Handle sizes
    const sizes = item.sizes ?? [];
    const hasSizes = sizes.length > 0;

    // Handle variants (Plain/Assorted)
    const hasVariants = item.hasVariants && item.variants;
    const variantOptions = hasVariants ? Object.keys(item.variants!) : [];

    const [selectedSize, setSelectedSize] = useState<string>(
        hasSizes ? sizes[0].key : 'regular'
    );
    const [selectedVariant, setSelectedVariant] = useState<string>(
        hasVariants ? variantOptions[0] : 'regular'
    );
    const [imgError, setImgError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

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
    const inCart = !!cartItem;

    const handleToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsLoading(true);
        try {
            if (inCart) {
                await removeFromCart(cartItem.cartItemId);
            } else {
                await addToCart(item, cartItemId);
            }
        } catch (error) {
            console.error('Failed to update cart:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <article
            className="group cursor-pointer relative flex flex-col bg-neutral-light dark:bg-brown/75 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 will-change-transform"
            onClick={() => onOpenDetail?.(item)}
        >
            {/* Image */}
            <div className="relative w-full aspect-4/3 bg-primary/20 dark:bg-brand-dark overflow-hidden shrink-0">
                {!imgError ? (
                    <Image
                        src={item.image || '/menu_placeholder.png'}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <Image
                        src="/menu_placeholder.png"
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover"
                    />
                )}

                <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {item.popular && (
                        <span className="flex items-center gap-1 bg-primary text-white text-[10px] font-semibold px-2 py-0.5 rounded-full leading-none">
                            <FireIcon weight="fill" size={10} /> Popular
                        </span>
                    )}
                    {item.isNew && (
                        <span className="flex items-center gap-1 bg-secondary text-white text-[10px] font-semibold px-2 py-0.5 rounded-full leading-none">
                            <StarIcon weight="fill" size={10} /> New
                        </span>
                    )}
                </div>

                {item.category && (
                    <span className="absolute bottom-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm bg-neutral-gray/80 text-white">
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
                    {item.description && (
                        <p className="mt-0.5 text-xs text-neutral-gray line-clamp-2 leading-snug">
                            {item.description}
                        </p>
                    )}
                </div>

                {/* Variant pills (Plain/Assorted) */}
                {hasVariants && (
                    <div className="flex gap-1 flex-wrap" onClick={e => e.stopPropagation()}>
                        {variantOptions.map((variant) => (
                            <button
                                key={variant}
                                onClick={(e) => { e.stopPropagation(); setSelectedVariant(variant); }}
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border transition-colors duration-150 capitalize
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
                {hasSizes && (
                    <div className="flex gap-1 flex-wrap" onClick={e => e.stopPropagation()}>
                        {sizes.map((s) => (
                            <button
                                key={s.key}
                                onClick={(e) => { e.stopPropagation(); setSelectedSize(s.key); }}
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border transition-colors duration-150
                                    ${selectedSize === s.key
                                        ? 'bg-neutral-gray text-white border-neutral-gray'
                                        : 'border-neutral-gray/30 text-neutral-gray hover:border-primary/60'
                                    }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Price + toggle button */}
                <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                    <span className="text-base font-bold text-primary leading-none">
                        {formatPrice(activePrice)}
                    </span>
                    <button
                        onClick={handleToggle}
                        disabled={isLoading}
                        className={`w-8 h-8 cursor-pointer flex items-center justify-center rounded-full transition-all duration-200 active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed
                            ${inCart
                                ? 'bg-secondary hover:bg-error text-white'
                                : 'bg-primary hover:bg-primary-hover text-white'
                            }`}
                        aria-label={inCart ? `Remove ${item.name} from cart` : `Add ${item.name} to cart`}
                    >
                        {isLoading ? (
                            <SpinnerGapIcon weight="bold" size={14} className="animate-spin" />
                        ) : inCart ? (
                            <MinusIcon weight="bold" size={14} />
                        ) : (
                            <PlusIcon weight="bold" size={14} />
                        )}
                    </button>
                </div>
            </div>
        </article>
    );
}