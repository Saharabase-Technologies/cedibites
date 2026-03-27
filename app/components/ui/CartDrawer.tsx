'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    XIcon, TrashIcon, PlusIcon, MinusIcon, ShoppingBagIcon,
    ArrowRightIcon, TagIcon, MapPinIcon, CaretRightIcon,
    WarningCircleIcon, CheckCircleIcon, StorefrontIcon
} from '@phosphor-icons/react';
import { useCart, CartItem } from '@/app/components/providers/CartProvider';
import { useModal } from '@/app/components/providers/ModalProvider';
import { useBranch, Branch, BranchWithDistance } from '@/app/components/providers/BranchProvider';
import { useLocation } from '@/app/components/providers/LocationProvider';
import { useAuth } from '../providers/AuthProvider';

const formatPrice = (p: number | string | null | undefined) => {
    const n = typeof p === 'number' ? p : Number(p);
    return `₵${Number.isNaN(n) ? '0.00' : n.toFixed(2)}`;
};

type DrawerView = 'cart' | 'branch-select' | 'branch-conflict';

export default function CartDrawer() {
    const { isCartOpen, closeCart } = useModal();
    const { displayItems: items, removeFromCart, updateQuantity, totalItems, subtotal,
        validateCartForBranch, removeUnavailableItems } = useCart();
    const { selectedBranch, setSelectedBranch, branches, getBranchesWithDistance } = useBranch();
    const { coordinates } = useLocation();

    const [view, setView] = useState<DrawerView>('cart');
    const [pendingBranch, setPendingBranch] = useState<Branch | null>(null);
    const [conflictResult, setConflictResult] = useState<{ available: CartItem[]; unavailable: CartItem[] } | null>(null);

    const total = subtotal;

    // Reset to cart view when drawer closes
    useEffect(() => {
        if (!isCartOpen) setTimeout(() => setView('cart'), 300);
    }, [isCartOpen]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCart(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [closeCart]);

    // Branches sorted by distance (or unsorted if no coords)
    const sortedBranches: BranchWithDistance[] = coordinates
        ? getBranchesWithDistance(coordinates.latitude, coordinates.longitude)
        : branches.map(b => ({ ...b, distance: 0, deliveryTime: '–', isWithinRadius: true }));

    const handleBranchSelect = useCallback((branch: Branch) => {
        if (branch.id === selectedBranch?.id) { setView('cart'); return; }

        if (items.length === 0) {
            setSelectedBranch(branch);
            setView('cart');
            return;
        }

        const result = validateCartForBranch(branch.menuItemIds);
        if (result.unavailable.length === 0) {
            setSelectedBranch(branch);
            setView('cart');
        } else {
            setPendingBranch(branch);
            setConflictResult(result);
            setView('branch-conflict');
        }
    }, [selectedBranch, items, validateCartForBranch, setSelectedBranch]);

    const handleRemoveUnavailableAndSwitch = useCallback(() => {
        if (!pendingBranch || !conflictResult) return;
        removeUnavailableItems(conflictResult.unavailable.map(i => i.cartItemId));
        setSelectedBranch(pendingBranch);
        setPendingBranch(null);
        setConflictResult(null);
        setView('cart');
    }, [pendingBranch, conflictResult, removeUnavailableItems, setSelectedBranch]);

    const handleKeepCurrentBranch = useCallback(() => {
        setPendingBranch(null);
        setConflictResult(null);
        setView('cart');
    }, []);

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300
                    ${isCartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={closeCart}
            />

            {/* Drawer */}
            <div
                className={`fixed z-50 bg-neutral-light dark:bg-brand-darker flex flex-col transition-transform duration-300 ease-out shadow-2xl
                    bottom-0 left-0 right-0 rounded-t-3xl max-h-[92dvh]
                    md:bottom-auto md:top-0 md:left-auto md:right-0 md:h-full md:w-105 md:rounded-none md:rounded-l-3xl md:max-h-full
                    ${isCartOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-full'}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-neutral-gray/10 shrink-0">
                    <div className="flex items-center gap-3">
                        {view !== 'cart' ? (
                            <button onClick={() => setView('cart')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-gray/15 transition-colors">
                                <ArrowRightIcon size={16} weight="bold" className="text-text-dark dark:text-text-light rotate-180" />
                            </button>
                        ) : (
                            '')}
                        <h2 className="text-lg font-bold text-text-dark dark:text-text-light">
                            {view === 'cart' && 'Your Order'}
                            {view === 'branch-select' && 'Change Branch'}
                            {view === 'branch-conflict' && 'Heads Up!'}
                        </h2>
                        {view === 'cart' && totalItems > 0 && (
                            <span className="text-base font-bold text-text-dark  rounded-full dark:text-white">({totalItems})
                            </span>
                        )}
                    </div>
                    <button onClick={closeCart} className="w-9 cursor-pointer h-9 flex items-center justify-center rounded-full hover:bg-neutral-gray/15 transition-colors">
                        <XIcon size={20} weight="bold" className="text-text-dark dark:text-text-light" />
                    </button>
                </div>

                {/* ── CART VIEW ── */}
                {view === 'cart' && (
                    <>
                        {selectedBranch && (
                            <button
                                onClick={() => setView('branch-select')}
                                className="mx-5 mt-4 flex items-center gap-3 bg-primary/8 border border-primary/20 rounded-2xl p-3 hover:bg-primary/12 transition-colors group"
                            >
                                <MapPinIcon weight="fill" size={16} className="text-primary shrink-0" />
                                <div className="flex-1 text-left min-w-0">
                                    <p className="text-xs text-neutral-gray">Ordering from</p>
                                    <p className="text-sm font-bold text-text-dark dark:text-text-light truncate">{selectedBranch.name} Branch</p>
                                </div>
                                <span className="text-xs font-semibold text-primary group-hover:underline shrink-0">Change</span>
                                <CaretRightIcon size={14} className="text-primary shrink-0" />
                            </button>
                        )}

                        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 flex flex-col gap-3">
                            {items.length === 0 ? <EmptyCart /> : (
                                <>
                                    {items.map(ci => (
                                        <CartItemRow key={ci.cartItemId} cartItem={ci}
                                            onRemove={() => removeFromCart(ci.cartItemId)}
                                            onIncrease={() => updateQuantity(ci.cartItemId, ci.quantity + 1)}
                                            onDecrease={() => {
                                                if (ci.quantity <= 1) removeFromCart(ci.cartItemId);
                                                else updateQuantity(ci.cartItemId, ci.quantity - 1);
                                            }}
                                        />
                                    ))}
                                    <button onClick={closeCart} className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed border-neutral-gray/25 text-neutral-gray hover:border-primary/40 hover:text-primary transition-colors text-sm font-medium">
                                        <PlusIcon weight="bold" size={14} /> Add more items
                                    </button>
                                </>
                            )}
                        </div>

                        {items.length > 0 && (
                            <div className="shrink-0 px-5 pb-6 pt-4 border-t border-neutral-gray/10 flex flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-neutral-gray">Subtotal</span>
                                        <span className="font-semibold text-text-dark dark:text-text-light">{formatPrice(subtotal)}</span>
                                    </div>
                                    <div className="h-px bg-neutral-gray/15 my-1" />
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-text-dark dark:text-text-light">Total</span>
                                        <span className="text-xl font-bold text-primary">{formatPrice(total)}</span>
                                    </div>
                                </div>
                                <Link href="/checkout" onClick={closeCart} className="flex items-center justify-between bg-brown dark:bg-brand-dark hover:bg-brown-light text-white font-bold px-6 py-4 rounded-2xl transition-all active:scale-[0.98] group">
                                    <span>Checkout</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-primary font-bold">{formatPrice(total)}</span>
                                        <ArrowRightIcon weight="bold" size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </Link>
                            </div>
                        )}
                    </>
                )}

                {/* ── BRANCH SELECT VIEW ── */}
                {view === 'branch-select' && (
                    <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 flex flex-col gap-3">
                        <p className="text-sm text-neutral-gray">Sorted by distance. Switching checks your cart for availability.</p>
                        {sortedBranches.map(branch => {
                            const isCurrent = branch.id === selectedBranch?.id;
                            return (
                                <button key={branch.id} onClick={() => handleBranchSelect(branch)} disabled={!branch.isOpen}
                                    className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all
                                        ${isCurrent ? 'border-primary bg-primary/8' : 'border-neutral-gray/15 hover:border-primary/30'}
                                        ${!branch.isOpen ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5
                                        ${isCurrent ? 'bg-primary text-white' : 'bg-neutral-gray/15 text-neutral-gray'}`}>
                                        <StorefrontIcon weight="fill" size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className={`text-sm font-bold ${isCurrent ? 'text-primary' : 'text-text-dark dark:text-text-light'}`}>
                                                {branch.name} Branch
                                            </p>
                                            {isCurrent && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-white">Current</span>}
                                            {!branch.isOpen && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-gray/20 text-neutral-gray">Closed</span>}
                                        </div>
                                        <p className="text-xs text-neutral-gray mt-0.5 truncate">{branch.address}</p>
                                        <div className="flex items-center gap-2 mt-1.5 text-xs text-neutral-gray flex-wrap">
                                            {coordinates && <span>{branch.distance.toFixed(1)} km</span>}
                                            <span>·</span>
                                            <span>{branch.deliveryTime}</span>
                                            <span>·</span>
                                            <span>₵{branch.deliveryFee} delivery</span>
                                        </div>
                                    </div>
                                    {!isCurrent && branch.isOpen && <CaretRightIcon size={16} className="text-neutral-gray shrink-0 mt-1" />}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* ── BRANCH CONFLICT VIEW ── */}
                {view === 'branch-conflict' && conflictResult && pendingBranch && (
                    <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 flex flex-col gap-5">

                        <div className="flex items-start gap-3 bg-warning/10 border border-warning/25 rounded-2xl p-4">
                            <WarningCircleIcon weight="fill" size={20} className="text-warning shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-text-dark dark:text-text-light">
                                    Some items aren't at {pendingBranch.name} Branch
                                </p>
                                <p className="text-xs text-neutral-gray mt-1">
                                    {conflictResult.unavailable.length} item{conflictResult.unavailable.length !== 1 ? 's' : ''} won't be available there.
                                </p>
                            </div>
                        </div>

                        {/* Unavailable */}
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-semibold text-neutral-gray uppercase tracking-wide">Won't be available</p>
                            {conflictResult.unavailable.map(ci => (
                                <div key={ci.cartItemId} className="flex items-center gap-3 bg-error/5 border border-error/15 rounded-xl p-3">
                                    <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-error/10 shrink-0">
                                        {ci.item.image ? <Image src={ci.item.image} alt={ci.item.name} fill sizes="40px" className="object-cover" /> : <div className="w-full h-full" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-text-dark dark:text-text-light truncate">{ci.item.name}</p>
                                        <p className="text-xs text-neutral-gray">{ci.sizeLabel} · Qty: {ci.quantity}</p>
                                    </div>
                                    <XIcon size={14} weight="bold" className="text-error shrink-0" />
                                </div>
                            ))}
                        </div>

                        {/* Available */}
                        {conflictResult.available.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <p className="text-xs font-semibold text-neutral-gray uppercase tracking-wide">Still available</p>
                                {conflictResult.available.map(ci => (
                                    <div key={ci.cartItemId} className="flex items-center gap-3 bg-secondary/5 border border-secondary/15 rounded-xl p-3">
                                        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-secondary/10 shrink-0">
                                            {ci.item.image ? <Image src={ci.item.image} alt={ci.item.name} fill sizes="40px" className="object-cover" /> : <div className="w-full h-full" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-text-dark dark:text-text-light truncate">{ci.item.name}</p>
                                            <p className="text-xs text-neutral-gray">{ci.sizeLabel} · Qty: {ci.quantity}</p>
                                        </div>
                                        <CheckCircleIcon size={14} weight="fill" className="text-secondary shrink-0" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 3 action options */}
                        <div className="flex flex-col gap-3 pt-2">
                            <button onClick={handleRemoveUnavailableAndSwitch} className="w-full flex items-center justify-between bg-primary hover:bg-primary-hover text-white font-bold px-5 py-4 rounded-2xl transition-all active:scale-[0.98]">
                                <span>Remove {conflictResult.unavailable.length} item{conflictResult.unavailable.length !== 1 ? 's' : ''} & Switch</span>
                                <ArrowRightIcon weight="bold" size={16} />
                            </button>
                            <button onClick={handleKeepCurrentBranch} className="w-full border-2 border-neutral-gray/20 text-text-dark dark:text-text-light font-bold px-5 py-3.5 rounded-2xl hover:border-primary/40 hover:text-primary transition-all">
                                Keep {selectedBranch?.name} Branch
                            </button>
                            <button onClick={() => setView('branch-select')} className="w-full text-sm font-semibold text-neutral-gray hover:text-primary transition-colors py-2">
                                Pick a different branch
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

function CartItemRow({ cartItem, onRemove, onIncrease, onDecrease }: {
    cartItem: CartItem; onRemove: () => void; onIncrease: () => void; onDecrease: () => void;
}) {
    const [imgError, setImgError] = React.useState(false);
    return (
        <div className="flex items-center gap-3 bg-white/60 dark:bg-white/5 rounded-2xl p-3">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-primary/10 shrink-0">
                {cartItem.item.image && !imgError ? <Image src={cartItem.item.image} alt={cartItem.item.name} fill sizes="64px" className="object-cover" onError={() => setImgError(true)} /> : <div className="w-full h-full" />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-dark dark:text-text-light leading-tight truncate">{cartItem.item.name}</p>
                <p className="text-xs text-neutral-gray mt-0.5">{cartItem.sizeLabel}</p>
                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 bg-neutral-gray/10 rounded-full px-1 py-0.5">
                        <button onClick={onDecrease} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-primary/20 active:scale-90 transition-all">
                            <MinusIcon weight="bold" size={10} className="text-text-dark dark:text-text-light" />
                        </button>
                        <span className="text-xs font-bold text-text-dark dark:text-text-light w-4 text-center tabular-nums">{cartItem.quantity}</span>
                        <button onClick={onIncrease} className="w-6 h-6 flex items-center justify-center rounded-full bg-primary text-white active:scale-90 transition-all">
                            <PlusIcon weight="bold" size={10} />
                        </button>
                    </div>
                    <span className="text-sm font-bold text-primary">{formatPrice(cartItem.price * cartItem.quantity)}</span>
                </div>
            </div>
            <button onClick={onRemove} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-error/15 text-neutral-gray hover:text-error transition-colors shrink-0">
                <TrashIcon weight="bold" size={15} />
            </button>
        </div>
    );
}

function EmptyCart() {
    const { closeCart } = useModal();
    return (
        <div className="flex flex-col items-center justify-center flex-1 py-16 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingBagIcon weight="fill" size={36} className="text-primary/40" />
            </div>
            <div>
                <p className="font-bold text-text-dark dark:text-text-light">Your cart is empty</p>
                <p className="text-sm text-neutral-gray mt-1">Add something delicious to get started</p>
            </div>
            <button onClick={closeCart} className="bg-primary text-white font-bold px-6 py-3 rounded-2xl hover:bg-primary-hover transition-all active:scale-95 text-sm">
                Browse Menu
            </button>
        </div>
    );
}
