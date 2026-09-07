'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    ArrowLeftIcon, ArrowRightIcon, MinusIcon, PlusIcon, TrashIcon, XIcon,
} from '@phosphor-icons/react';
import { useCart, type CartItem } from '@/app/components/providers/CartProvider';
import { useModal } from '@/app/components/providers/ModalProvider';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { useBranchSwitch, BranchList, BranchConflictPanel } from './BranchSwitch';
import BottomSheet from './BottomSheet';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';
import { photoForMenuItem } from '@/lib/constants/branchPhotos';

const formatPrice = (p: number | string | null | undefined) => {
    const n = typeof p === 'number' ? p : Number(p);
    if (!Number.isFinite(n)) return '₵0';
    return `₵${Number.isInteger(n) ? n : n.toFixed(2)}`;
};

type DrawerView = 'cart' | 'branch-select';

/**
 * The order, before you pay for it.
 *
 * Rebuilt on the shared sheet, so it drags, locks the page, keeps its action
 * bar clear of the home indicator and traps focus exactly like the item sheet
 * does. That consistency is the point: two sheets in one app that behave
 * differently is worse than either behaving badly.
 *
 * The look follows the menu. Every line used to be a card with its own tinted
 * ground, the branch sat in a red-tinted bordered box, both warnings had their
 * own coloured boxes, "Add more items" was a dashed rectangle and the totals
 * had a red figure over a bordered panel. That is six containers and four reds
 * on a panel whose whole job is a short list and one button.
 *
 * Rows on hairlines, warnings on the quiet ground, and one red: the button that
 * takes you to checkout.
 */
export default function CartDrawer() {
    const { isCartOpen, closeCart } = useModal();
    const {
        displayItems: items, removeFromCart, updateQuantity, totalItems, subtotal,
        validateCartForBranch, removeUnavailableItems, isLinePending,
    } = useCart();
    const { selectedBranch } = useBranch();

    const [view, setView] = useState<DrawerView>('cart');

    // The list, the conflict panel and the decision about what happens to the
    // cart are shared with the checkout page's branch sheet.
    const { conflict, removing, selectBranch, removeAndSwitch, keepCurrentBranch, reset } =
        useBranchSwitch({ onSettled: () => setView('cart') });

    // Leaving the branch views drops any unresolved conflict with them. Without
    // this, backing out and coming back re-opened the conflict panel for a
    // branch the customer had already walked away from.
    const backToCart = useCallback(() => { reset(); setView('cart'); }, [reset]);

    // Computed once per render. This ran three separate times inline in the JSX
    // below, over every line in the cart.
    const branchCheck = useMemo(
        () => (selectedBranch ? validateCartForBranch(selectedBranch.menuItemIds) : null),
        [selectedBranch, validateCartForBranch],
    );

    useEffect(() => {
        if (isCartOpen) return;
        const t = setTimeout(() => { reset(); setView('cart'); }, 300);
        return () => clearTimeout(t);
    }, [isCartOpen, reset]);

    const unavailable = branchCheck?.unavailable ?? [];
    const branchShut = Boolean(selectedBranch && (!selectedBranch.isActive || !selectedBranch.isOpen));
    const blocked = branchShut || unavailable.length > 0;

    const header = (
        <div className="flex items-center gap-2 px-5 pb-4 pt-1 md:pt-5">
            {view === 'cart' ? (
                <h2 className="flex-1 text-lg font-bold text-fg">
                    Your order
                    {totalItems > 0 && (
                        <span className="ml-2 text-sm font-semibold tabular-nums text-fg-muted">{totalItems}</span>
                    )}
                </h2>
            ) : (
                <>
                    <button
                        onClick={backToCart}
                        aria-label="Back to your order"
                        className="-ml-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-fg transition-colors duration-150 ease-out hover:bg-surface-sunken"
                    >
                        <ArrowLeftIcon size={17} weight="bold" />
                    </button>
                    <h2 className="flex-1 text-lg font-bold text-fg">
                        {conflict ? 'Not on that menu' : 'Change branch'}
                    </h2>
                </>
            )}

            <button
                onClick={closeCart}
                aria-label="Close"
                className="-mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-fg-muted transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-fg"
            >
                <XIcon size={18} weight="bold" />
            </button>
        </div>
    );

    const footer = view === 'cart' && items.length > 0 ? (
        <div className="px-5 pb-5 pt-4">
            <div className="flex items-baseline justify-between">
                <span className="text-sm text-fg-muted">Subtotal</span>
                <span className="text-lg font-bold tabular-nums text-fg">{formatPrice(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-fg-muted">Delivery, if you choose it, is added at checkout.</p>

            {blocked ? (
                <button
                    onClick={() => setView('branch-select')}
                    className="mt-4 flex min-h-13 w-full items-center justify-center rounded-xl bg-primary-fill px-5 text-sm font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95"
                >
                    Change branch to carry on
                </button>
            ) : (
                <Link
                    href="/checkout"
                    onClick={closeCart}
                    className="mt-4 flex min-h-13 w-full items-center justify-between rounded-xl bg-primary-fill px-5 text-sm font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95"
                >
                    <span>Go to checkout</span>
                    <span className="flex items-center gap-2 tabular-nums">
                        {formatPrice(subtotal)}
                        <ArrowRightIcon size={16} weight="bold" />
                    </span>
                </Link>
            )}
        </div>
    ) : null;

    return (
        <BottomSheet
            open={isCartOpen}
            onClose={closeCart}
            label="Your order"
            wide="drawer"
            sheetUntil="(max-width: 767px)"
            header={header}
            footer={footer}
        >
            {view !== 'cart' ? (
                <div className="px-5 pb-5">
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
            ) : items.length === 0 ? (
                <EmptyCart onBrowse={closeCart} />
            ) : (
                <>
                    {selectedBranch && (
                        <div className="flex items-center gap-3 px-5 pb-3">
                            <p className="min-w-0 flex-1 truncate text-sm text-fg-muted">
                                From <span className="font-bold text-fg">{selectedBranch.name}</span>
                            </p>
                            <button
                                onClick={() => setView('branch-select')}
                                className="shrink-0 text-sm font-bold text-fg underline underline-offset-4 transition-opacity duration-150 ease-out hover:opacity-70"
                            >
                                Change
                            </button>
                        </div>
                    )}

                    {branchShut && (
                        <Notice
                            title={selectedBranch?.isActive === false ? 'This branch is not taking orders' : `${selectedBranch?.name} is closed`}
                            body={selectedBranch?.isActive === false
                                ? 'Nothing can be sent from here at the moment.'
                                : 'Nothing leaves the kitchen until it opens again.'}
                            action="Order from another branch"
                            onAction={() => setView('branch-select')}
                        />
                    )}

                    {unavailable.length > 0 && (
                        <Notice
                            title={`${unavailable.length} ${unavailable.length === 1 ? 'thing is' : 'things are'} not on this menu`}
                            body={`${unavailable
                                .map(ci => getOrderItemLineLabel({ name: ci.item.name, sizeLabel: ci.sizeLabel }))
                                .join(', ')} cannot be made at ${selectedBranch?.name}.`}
                            action={`Take ${unavailable.length === 1 ? 'it' : 'them'} out`}
                            onAction={() => removeUnavailableItems(unavailable.map(i => i.cartItemId))}
                            secondary="Change branch instead"
                            onSecondary={() => setView('branch-select')}
                        />
                    )}

                    <ul className="mt-1">
                        {items.map(ci => (
                            <CartLine
                                key={ci.cartItemId}
                                cartItem={ci}
                                pending={isLinePending(ci.cartItemId)}
                                onRemove={() => removeFromCart(ci.cartItemId)}
                                onIncrease={() => updateQuantity(ci.cartItemId, ci.quantity + 1)}
                                onDecrease={() => {
                                    if (ci.quantity <= 1) removeFromCart(ci.cartItemId);
                                    else updateQuantity(ci.cartItemId, ci.quantity - 1);
                                }}
                            />
                        ))}
                    </ul>

                    <div className="px-5 py-4">
                        <button
                            onClick={closeCart}
                            className="text-sm font-bold text-fg underline underline-offset-4 transition-opacity duration-150 ease-out hover:opacity-70"
                        >
                            Add something else
                        </button>
                    </div>
                </>
            )}
        </BottomSheet>
    );
}

/**
 * Something worth stopping for, without a coloured box around it.
 *
 * Both of these used to be tinted, bordered panels, one red and one amber, on a
 * surface that already had a red branch box above it. The words are what carry
 * the weight; the ground is the same quiet grey the rest of the sheet uses.
 */
function Notice({ title, body, action, onAction, secondary, onSecondary }: {
    title: string;
    body: string;
    action: string;
    onAction: () => void;
    secondary?: string;
    onSecondary?: () => void;
}) {
    return (
        <div className="mx-5 mb-3 rounded-xl bg-surface-sunken px-4 py-3.5">
            <p className="text-sm font-bold text-fg">{title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{body}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2">
                <button
                    onClick={onAction}
                    className="text-[13px] font-bold text-fg underline underline-offset-4 transition-opacity duration-150 ease-out hover:opacity-70"
                >
                    {action}
                </button>
                {secondary && onSecondary && (
                    <button
                        onClick={onSecondary}
                        className="text-[13px] font-bold text-fg-muted underline underline-offset-4 transition-colors duration-150 ease-out hover:text-fg"
                    >
                        {secondary}
                    </button>
                )}
            </div>
        </div>
    );
}

/** One line of the order. No card: a hairline is enough to separate two rows. */
function CartLine({ cartItem, pending, onRemove, onIncrease, onDecrease }: {
    cartItem: CartItem;
    pending: boolean;
    onRemove: () => void;
    onIncrease: () => void;
    onDecrease: () => void;
}) {
    const [imgError, setImgError] = useState(false);
    const image = cartItem.item.thumbnail ?? cartItem.item.image ?? photoForMenuItem(cartItem.item.name)?.src;
    const hasPhoto = Boolean(image) && !imgError;

    return (
        <li className={`flex items-center gap-3.5 border-t border-hairline px-5 py-3.5 transition-opacity duration-150 ease-out ${pending ? 'opacity-55' : ''}`}>
            <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-sunken">
                {hasPhoto ? (
                    <Image
                        src={image!}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <Image src="/logo/mark-black.webp" alt="" width={256} height={179} className="w-7 opacity-20" />
                )}
            </span>

            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug text-fg">
                    {getOrderItemLineLabel({ name: cartItem.item.name, sizeLabel: cartItem.sizeLabel })}
                </p>
                <p className="mt-0.5 text-[13px] tabular-nums text-fg-muted">
                    {formatPrice(cartItem.price)} each
                </p>

                <div className="mt-2 flex items-center gap-3">
                    <div className="flex items-center gap-0.5 rounded-lg bg-surface-sunken p-0.5">
                        <button
                            onClick={onDecrease}
                            disabled={pending}
                            aria-label={cartItem.quantity <= 1 ? 'Remove from the order' : 'One fewer'}
                            className="grid h-8 w-8 place-items-center rounded-md text-fg transition-colors duration-150 ease-out hover:bg-bg"
                        >
                            <MinusIcon weight="bold" size={12} />
                        </button>
                        <span aria-live="polite" className="min-w-5 text-center text-sm font-bold tabular-nums text-fg">
                            {cartItem.quantity}
                        </span>
                        <button
                            onClick={onIncrease}
                            disabled={pending}
                            aria-label="One more"
                            className="grid h-8 w-8 place-items-center rounded-md text-fg transition-colors duration-150 ease-out hover:bg-bg"
                        >
                            <PlusIcon weight="bold" size={12} />
                        </button>
                    </div>

                    <span className="ml-auto text-sm font-bold tabular-nums text-fg">
                        {formatPrice(cartItem.price * cartItem.quantity)}
                    </span>

                    <button
                        onClick={onRemove}
                        aria-label={`Remove ${cartItem.item.name} from the order`}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-fg-subtle transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-fg"
                    >
                        <TrashIcon weight="bold" size={14} />
                    </button>
                </div>
            </div>
        </li>
    );
}

function EmptyCart({ onBrowse }: { onBrowse: () => void }) {
    return (
        <div className="flex flex-col items-center px-5 py-16 text-center">
            <Image src="/logo/mark-black.webp" alt="" width={256} height={179} className="w-16 opacity-15" />
            <p className="mt-5 text-base font-bold text-fg">Nothing here yet</p>
            <p className="mt-1 max-w-64 text-sm leading-relaxed text-fg-muted">
                Jollof, wraps, drumsticks and the rest are one tap away.
            </p>
            <button
                onClick={onBrowse}
                className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary-fill px-5 text-sm font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95"
            >
                Open the menu
            </button>
        </div>
    );
}
