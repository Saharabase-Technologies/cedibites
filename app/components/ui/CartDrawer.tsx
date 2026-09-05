'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    XIcon, TrashIcon, PlusIcon, MinusIcon, ShoppingBagIcon,
    ArrowRightIcon, MapPinIcon, CaretRightIcon,
    WarningCircleIcon, StorefrontIcon
} from '@phosphor-icons/react';
import { useCart, type CartItem } from '@/app/components/providers/CartProvider';
import { useModal } from '@/app/components/providers/ModalProvider';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { useBranchSwitch, BranchList, BranchConflictPanel } from './BranchSwitch';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';

const formatPrice = (p: number | string | null | undefined) => {
    const n = typeof p === 'number' ? p : Number(p);
    return `₵${Number.isNaN(n) ? '0.00' : n.toFixed(2)}`;
};

type DrawerView = 'cart' | 'branch-select' | 'branch-conflict';

export default function CartDrawer() {
    const { isCartOpen, closeCart } = useModal();
    const { displayItems: items, removeFromCart, updateQuantity, totalItems, subtotal,
        validateCartForBranch, removeUnavailableItems, isLinePending } = useCart();
    const { selectedBranch } = useBranch();

    const [view, setView] = useState<DrawerView>('cart');

    // The list, the conflict panel and the decision about what happens to the
    // cart are shared with the checkout page's branch sheet.
    const { conflict, removing, selectBranch, removeAndSwitch, keepCurrentBranch, reset } =
        useBranchSwitch({ onSettled: () => setView('cart') });

    // Leaving the branch views drops any unresolved conflict with them. Without
    // this, backing out and coming back re-opened the conflict panel for a branch
    // the customer had already walked away from.
    const backToCart = useCallback(() => { reset(); setView('cart'); }, [reset]);

    const total = subtotal;

    // Computed once per render. This ran three separate times inline in the JSX
    // below — once for the banner, once to decide whether checkout is blocked,
    // and once more to build the message — over every line in the cart.
    const currentBranchCheck = useMemo(
        () => (selectedBranch ? validateCartForBranch(selectedBranch.menuItemIds) : null),
        [selectedBranch, validateCartForBranch],
    );

    // Reset to cart view when drawer closes
    useEffect(() => {
        if (!isCartOpen) {
            const t = setTimeout(() => { reset(); setView('cart'); }, 300);
            return () => clearTimeout(t);
        }
    }, [isCartOpen, reset]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCart(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [closeCart]);

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
                            <button onClick={backToCart} aria-label="Back to cart" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-gray/15 transition-colors">
                                <ArrowRightIcon size={16} weight="bold" className="text-text-dark dark:text-text-light rotate-180" />
                            </button>
                        ) : (
                            '')}
                        <h2 className="text-lg font-bold text-text-dark dark:text-text-light">
                            {view === 'cart' && 'Your Order'}
                            {view === 'branch-select' && (conflict ? 'Items Not Available' : 'Change Branch')}
                        </h2>
                        {view === 'cart' && totalItems > 0 && (
                            <span className="text-base font-bold text-text-dark  rounded-lg dark:text-white">({totalItems})
                            </span>
                        )}
                    </div>
                    <button onClick={closeCart} className="w-9 cursor-pointer h-9 flex items-center justify-center rounded-lg hover:bg-neutral-gray/15 transition-colors">
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

                        {/* Branch unavailable warning */}
                        {selectedBranch && (!selectedBranch.isActive || !selectedBranch.isOpen) && (
                            <div className="mx-5 mt-3 flex items-start gap-3 bg-error/5 border border-error/20 rounded-2xl p-3.5">
                                <WarningCircleIcon weight="fill" size={18} className="text-error shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-error">
                                        {!selectedBranch.isActive ? 'Branch is inactive' : 'Branch is closed'}
                                    </p>
                                    <p className="text-xs text-error/70 mt-0.5">
                                        {!selectedBranch.isActive
                                            ? 'This branch is not accepting orders right now.'
                                            : 'This branch is currently closed. Check back during operating hours.'}
                                    </p>
                                    <button
                                        onClick={() => setView('branch-select')}
                                        className="mt-2 text-xs font-bold text-primary hover:underline"
                                    >
                                        Switch to another branch →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Unavailable items warning */}
                        {selectedBranch && items.length > 0 && currentBranchCheck && currentBranchCheck.unavailable.length > 0 && (
                            <div className="mx-5 mt-3 flex items-start gap-3 bg-warning/5 border border-warning/20 rounded-2xl p-3.5">
                                <WarningCircleIcon weight="fill" size={18} className="text-warning shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-text-dark dark:text-text-light">
                                        {currentBranchCheck.unavailable.length} item{currentBranchCheck.unavailable.length !== 1 ? 's' : ''} unavailable here
                                    </p>
                                    <p className="text-xs text-neutral-gray mt-0.5">
                                        {currentBranchCheck.unavailable.map(ci => getOrderItemLineLabel({ name: ci.item.name, sizeLabel: ci.sizeLabel })).join(', ')}
                                        {' '}{currentBranchCheck.unavailable.length === 1 ? 'is' : 'are'} not on the {selectedBranch.name} menu.
                                    </p>
                                    <div className="flex flex-wrap items-center gap-3 mt-2">
                                        <button
                                            onClick={() => removeUnavailableItems(currentBranchCheck.unavailable.map(i => i.cartItemId))}
                                            className="text-xs font-bold text-primary hover:underline cursor-pointer"
                                        >
                                            Remove {currentBranchCheck.unavailable.length === 1 ? 'it' : 'them'} and carry on
                                        </button>
                                        <button
                                            onClick={() => setView('branch-select')}
                                            className="text-xs font-bold text-neutral-gray hover:text-primary hover:underline cursor-pointer"
                                        >
                                            Switch branch instead →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 flex flex-col gap-3">
                            {items.length === 0 ? <EmptyCart /> : (
                                <>
                                    {items.map(ci => (
                                        <CartItemRow key={ci.cartItemId} cartItem={ci}
                                            pending={isLinePending(ci.cartItemId)}
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

                        {items.length > 0 && (() => {
                            const branchUnavailable = selectedBranch && (!selectedBranch.isActive || !selectedBranch.isOpen);
                            const hasUnavailableItems = (currentBranchCheck?.unavailable.length ?? 0) > 0;
                            const checkoutBlocked = branchUnavailable || hasUnavailableItems;

                            return (
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
                                {checkoutBlocked ? (
                                    <button
                                        onClick={() => setView('branch-select')}
                                        className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold px-6 py-4 rounded-2xl transition-all active:scale-[0.98]"
                                    >
                                        <StorefrontIcon weight="fill" size={18} />
                                        <span>Switch Branch to Continue</span>
                                    </button>
                                ) : (
                                <Link href="/checkout" onClick={closeCart} className="flex items-center justify-between bg-brown dark:bg-brand-dark hover:bg-brown-light text-white font-bold px-6 py-4 rounded-2xl transition-all active:scale-[0.98] group">
                                    <span>Checkout</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-primary font-bold">{formatPrice(total)}</span>
                                        <ArrowRightIcon weight="bold" size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </Link>
                                )}
                            </div>
                            );
                        })()}
                    </>
                )}

                {/* -- BRANCH SELECT / CONFLICT -- */}
                {view !== 'cart' && (
                    <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                        {conflict
                            ? <BranchConflictPanel
                                conflict={conflict}
                                removing={removing}
                                onRemoveAndSwitch={removeAndSwitch}
                                onKeepCurrent={backToCart}
                                onPickAnother={keepCurrentBranch}
                            />
                            : <BranchList onSelect={selectBranch} />}
                    </div>
                )}
            </div>
        </>
    );
}

function CartItemRow({ cartItem, pending, onRemove, onIncrease, onDecrease }: {
    cartItem: CartItem; pending: boolean; onRemove: () => void; onIncrease: () => void; onDecrease: () => void;
}) {
    const [imgError, setImgError] = React.useState(false);
    return (
        <div className={`flex items-center gap-3 bg-white/60 dark:bg-white/5 rounded-2xl p-3 transition-opacity ${pending ? 'opacity-60' : ''}`}>
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-primary/10 shrink-0">
                {cartItem.item.image && !imgError ? <Image src={cartItem.item.image} alt={cartItem.item.name} fill sizes="64px" className="object-cover" onError={() => setImgError(true)} /> : <div className="w-full h-full" />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-dark dark:text-text-light leading-tight truncate">{getOrderItemLineLabel({ name: cartItem.item.name, sizeLabel: cartItem.sizeLabel })}</p>
                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 bg-neutral-gray/10 rounded-lg px-1 py-0.5">
                        <button onClick={onDecrease} disabled={pending} aria-label="Decrease quantity"
                            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-primary/20 active:scale-90 transition-all disabled:cursor-not-allowed">
                            <MinusIcon weight="bold" size={10} className="text-text-dark dark:text-text-light" />
                        </button>
                        <span aria-live="polite" className="text-xs font-bold text-text-dark dark:text-text-light w-4 text-center tabular-nums">{cartItem.quantity}</span>
                        <button onClick={onIncrease} disabled={pending} aria-label="Increase quantity"
                            className="w-6 h-6 flex items-center justify-center rounded-lg bg-primary text-white active:scale-90 transition-all disabled:cursor-not-allowed">
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
            <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center">
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
