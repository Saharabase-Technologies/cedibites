'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { XIcon, PlusIcon, MinusIcon, ShoppingCartIcon } from '@phosphor-icons/react';
import type { SearchableItem } from '@/app/components/providers/MenuDiscoveryProvider';
import { useCart } from '@/app/components/providers/CartProvider';

interface ItemDetailModalProps {
    item: SearchableItem | null;
    onClose: () => void;
}

const formatPrice = (price: number | string | null | undefined) => {
    const n = typeof price === 'number' ? price : Number(price);
    return `₵${Number.isNaN(n) ? '0.00' : n.toFixed(2)}`;
};

export default function ItemDetailModal({ item, onClose }: ItemDetailModalProps) {
    const { addToCart, removeFromCart, getCartItem, updateQuantity } = useCart();

    const sizes: { key: string; label: string; price: number; image?: string }[] = item?.sizes ?? [];
    const hasSizes = sizes.length > 0;

    const hasVariants = !!(item?.hasVariants && item?.variants);
    const variantOptions = hasVariants ? Object.keys(item!.variants!) : [];

    const [selectedSize, setSelectedSize] = useState<string>(hasSizes ? sizes[0].key : 'regular');
    const [selectedVariant, setSelectedVariant] = useState<string>(hasVariants ? variantOptions[0] : 'plain');
    const [imgError, setImgError] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (item) {
            setSelectedSize(item.sizes?.[0]?.key ?? 'regular');
            const vOpts = item.hasVariants && item.variants ? Object.keys(item.variants) : [];
            setSelectedVariant(vOpts[0] ?? 'plain');
            setImgError(false);
            requestAnimationFrame(() => setVisible(true));
        } else {
            setVisible(false);
        }
    }, [item]);

    const handleClose = useCallback(() => {
        setVisible(false);
        setTimeout(onClose, 280);
    }, [onClose]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleClose]);

    // ── NO scroll lock here — ModalProvider handles it globally ──

    if (!item) return null;

    let activePrice = 0;
    if (hasVariants && item.variants) {
        activePrice = item.variants[selectedVariant as 'plain' | 'assorted'] ?? 0;
    } else if (hasSizes) {
        const activeSize = sizes.find(s => s.key === selectedSize);
        activePrice = activeSize?.price ?? 0;
    } else {
        activePrice = item.price ?? 0;
    }

    const cartItemId = hasVariants ? selectedVariant : selectedSize;
    const activeSize = hasSizes ? sizes.find(s => s.key === selectedSize) : undefined;
    const activeImage = activeSize?.image ?? item.image;
    const cartItem = getCartItem(item.id, cartItemId);
    const qty = cartItem?.quantity ?? 0;
    const lineTotal = activePrice * qty;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={handleClose}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                style={{ opacity: visible ? 1 : 0 }}
            />

            {/* Panel */}
            <div
                className="relative bg-neutral-light dark:bg-brand-darker w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl transition-transform duration-300 ease-out"
                style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Image */}
                <div className="relative w-full aspect-video bg-brand-dark overflow-hidden shrink-0">
                    {activeImage && !imgError ? (
                        <Image src={activeImage} alt={item.name} fill sizes="(max-width: 640px) 100vw, 448px" className="object-cover" onError={() => setImgError(true)} priority />
                    ) : (
                        <div className="w-full h-full" />
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />
                    {item.tags && item.tags.length > 0 && (
                        <div className="absolute top-3 left-3 flex gap-2">
                            {item.tags.map(tag => (
                                <span key={tag.slug} className="flex items-center gap-1 bg-primary text-white text-[11px] font-bold px-2.5 py-1 rounded-full capitalize">
                                    {tag.name}
                                </span>
                            ))}
                        </div>
                    )}
                    <button onClick={handleClose} className="absolute cursor-pointer top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors">
                        <XIcon size={18} weight="bold" className="text-white" />
                    </button>
                    {item.category && (
                        <span className="absolute bottom-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white">
                            {item.category}
                        </span>
                    )}
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col gap-5">
                    <div>
                        <h2 className="text-xl font-bold text-text-dark dark:text-text-light leading-tight">{item.name}</h2>
                        {item.description && (
                            <p className="mt-1.5 text-sm text-neutral-gray leading-relaxed">{item.description}</p>
                        )}
                    </div>

                    {/* Variant selector (Plain / Assorted) */}
                    {hasVariants && (
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-semibold text-neutral-gray uppercase tracking-wide">Choose Type</p>
                            <div className="flex gap-2 flex-wrap">
                                {variantOptions.map((variant) => {
                                    const vQty = getCartItem(item.id, variant)?.quantity ?? 0;
                                    const isSelected = selectedVariant === variant;
                                    const vPrice = item.variants?.[variant as 'plain' | 'assorted'] ?? 0;
                                    return (
                                        <button
                                            key={variant}
                                            onClick={() => setSelectedVariant(variant)}
                                            className={`relative flex flex-col items-center px-5 py-2.5 rounded-2xl border-2 transition-all duration-150 min-w-20
                                                ${isSelected ? 'border-primary bg-primary/10' : 'border-neutral-gray/20 hover:border-primary/40'}`}
                                        >
                                            <span className={`text-sm font-semibold capitalize ${isSelected ? 'text-primary' : 'text-text-dark dark:text-text-light'}`}>{variant}</span>
                                            <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-neutral-gray'}`}>₵{vPrice}</span>
                                            {vQty > 0 && (
                                                <span className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">
                                                    {vQty}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Size selector */}
                    {hasSizes && (
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-semibold text-neutral-gray uppercase tracking-wide">Choose Size</p>
                            <div className="flex gap-2 flex-wrap">
                                {sizes.map((s) => {
                                    const sQty = getCartItem(item.id, s.key)?.quantity ?? 0;
                                    const isSelected = selectedSize === s.key;
                                    return (
                                        <button
                                            key={s.key}
                                            onClick={() => setSelectedSize(s.key)}
                                            className={`relative flex flex-col items-center px-5 py-2.5 rounded-2xl border-2 transition-all duration-150 min-w-20
                                                ${isSelected ? 'border-primary bg-primary/10' : 'border-neutral-gray/20 hover:border-primary/40'}`}
                                        >
                                            <span className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-text-dark dark:text-text-light'}`}>{s.label}</span>
                                            <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-neutral-gray'}`}>₵{s.price}</span>
                                            {sQty > 0 && (
                                                <span className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">
                                                    {sQty}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Counter + total */}
                    <div className="flex items-center justify-between gap-4 pt-1 pb-1">
                        <div>
                            <p className="text-xs text-neutral-gray">
                                {qty > 0 ? `${qty} × ${formatPrice(activePrice)}` : formatPrice(activePrice)}
                            </p>
                            <p className="text-2xl font-bold text-primary leading-none">
                                {qty > 0 ? formatPrice(lineTotal) : formatPrice(activePrice)}
                            </p>
                        </div>
                        {qty > 0 ? (
                            <div className="flex items-center gap-3 bg-primary/10 rounded-2xl px-2 py-1.5">
                                <button
                                    onClick={() => { if (qty <= 1) removeFromCart(cartItem!.cartItemId); else updateQuantity(cartItem!.cartItemId, qty - 1); }}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary text-white active:scale-90 transition-transform"
                                >
                                    <MinusIcon weight="bold" size={16} />
                                </button>
                                <span className="text-lg font-bold text-text-dark dark:text-text-light w-6 text-center tabular-nums">{qty}</span>
                                <button
                                    onClick={() => updateQuantity(cartItem!.cartItemId, qty + 1)}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary text-white active:scale-90 transition-transform"
                                >
                                    <PlusIcon weight="bold" size={16} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => addToCart(item, cartItemId)}
                                className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold px-6 py-3 rounded-2xl transition-all active:scale-95"
                            >
                                <ShoppingCartIcon weight="fill" size={18} />
                                Add to Cart
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
