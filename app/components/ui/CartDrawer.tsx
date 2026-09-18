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
import { AttentionBadge, BranchStateBadge, SmallAction } from './QuietControls';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';
import { photoForMenuItem } from '@/lib/constants/branchPhotos';
import { formatGHS } from '@/lib/utils/currency';
import { nextOpening } from '@/lib/utils/branchHours';

type DrawerView = 'cart' | 'branch-select';

/**
 * The order, before you pay for it.
 *
 * Rebuilt on the shared sheet, so it drags, locks the page, keeps its action
 * bar clear of the home indicator and traps focus exactly like the item sheet
 * does. That consistency is the point: two sheets in one app that behave
 * differently is worse than either behaving badly.
 *
 * A closed branch used to be said four times: a Change link beside the branch
 * name, a grey box explaining what closed means, a link inside that box to
 * order from another branch, and a button at the foot that also changed branch.
 * It is one row now, the branch with a Closed badge and the time it opens, and
 * the button at the foot is the way out. A dish this kitchen cannot make gets a
 * badge on its own line, where the customer is looking for it.
 */
export default function CartDrawer() {
    const { isCartOpen, closeCart } = useModal();
    const {
        displayItems: items, removeFromCart, updateQuantity, subtotal,
        validateCartForBranch, removeUnavailableItems,
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
    const unavailableIds = new Set(unavailable.map(ci => ci.cartItemId));
    const branchShut = Boolean(selectedBranch && (!selectedBranch.isActive || !selectedBranch.isOpen));
    const opensWhen = selectedBranch?.isActive && !selectedBranch.isOpen ? nextOpening(selectedBranch.hours) : null;

    const header = (
        <div className="flex items-center gap-2 px-5 pb-4 pt-1 md:pt-5">
            {view === 'cart' ? (
                <h2 className="flex-1 text-lg font-bold text-fg">Your order</h2>
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

    const bigButton =
        'mt-4 flex min-h-15 w-full items-center justify-center gap-2 rounded-2xl bg-primary-fill px-5 text-center ' +
        'text-base font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95';

    const footer = view === 'cart' && items.length > 0 ? (
        <div className="px-5 pb-5 pt-4">
            <div className="flex items-baseline justify-between">
                <span className="text-sm text-fg-muted">Subtotal</span>
                <span className="text-lg font-bold tabular-nums text-fg">{formatGHS(subtotal)}</span>
            </div>

            {branchShut ? (
                <button onClick={() => setView('branch-select')} className={bigButton}>
                    Choose another branch
                </button>
            ) : unavailable.length > 0 ? (
                <button
                    onClick={() => removeUnavailableItems(unavailable.map(i => i.cartItemId))}
                    className={bigButton}
                >
                    Take out what {selectedBranch?.name} can&apos;t make
                </button>
            ) : (
                <Link href="/checkout" onClick={closeCart} className={bigButton}>
                    Go to checkout
                    <ArrowRightIcon size={18} weight="bold" />
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
                        <div className="flex items-start gap-3 px-5 pb-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-[13px] text-fg-muted">From</p>
                                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="text-[15px] font-bold leading-snug text-fg">{selectedBranch.name}</span>
                                    <BranchStateBadge branch={selectedBranch} />
                                </p>
                                {opensWhen && (
                                    <p className="mt-0.5 text-[13px] text-fg-muted">Opens {opensWhen}</p>
                                )}
                            </div>
                            {/* When it is shut, the button at the foot is the way
                                out, and a second control here would say it again. */}
                            {!branchShut && (
                                <SmallAction onClick={() => setView('branch-select')}>Change</SmallAction>
                            )}
                        </div>
                    )}

                    <ul className="flex flex-col px-5 pb-3">
                        {items.map(ci => (
                            <CartLine
                                key={ci.cartItemId}
                                cartItem={ci}
                                notAt={unavailableIds.has(ci.cartItemId) ? selectedBranch?.name : undefined}
                                onIncrease={() => updateQuantity(ci.cartItemId, ci.quantity + 1)}
                                onDecrease={() => {
                                    if (ci.quantity <= 1) removeFromCart(ci.cartItemId);
                                    else updateQuantity(ci.cartItemId, ci.quantity - 1);
                                }}
                            />
                        ))}
                    </ul>
                </>
            )}
        </BottomSheet>
    );
}

/**
 * One line of the order: the dish, what the line costs, and how many.
 *
 * The count is the only control. Minus turns into a bin at one, so a separate
 * bin beside it was a second way to do the same thing. The line total is the
 * figure shown, because it is the one that adds up to the subtotal underneath.
 */
function CartLine({ cartItem, notAt, onIncrease, onDecrease }: {
    cartItem: CartItem;
    /** The branch name, when this dish is not on its menu. */
    notAt?: string;
    onIncrease: () => void;
    onDecrease: () => void;
}) {
    const [imgError, setImgError] = useState(false);
    const image = cartItem.item.thumbnail ?? cartItem.item.image ?? photoForMenuItem(cartItem.item.name)?.src;
    const hasPhoto = Boolean(image) && !imgError;
    const last = cartItem.quantity <= 1;

    return (
        /* No dimming and no disabling while the write is in flight.
           `updateQuantity` is optimistic: the new count is on screen before the
           request leaves, and it returns early for a line the server has not
           given an id yet, so a fast thumb cannot duplicate anything. Greying
           the row out was inventing a wait that was not happening. */
        <li className="flex gap-3.5 py-3">
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
                {notAt && (
                    <p className="mt-1">
                        <AttentionBadge>Not at {notAt}</AttentionBadge>
                    </p>
                )}

                <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-bold tabular-nums text-fg">
                        {formatGHS(cartItem.price * cartItem.quantity)}
                    </span>

                    <div className="flex items-center gap-0.5 rounded-lg bg-surface-sunken p-0.5">
                        <button
                            onClick={onDecrease}
                            aria-label={last ? `Remove ${cartItem.item.name} from the order` : 'One fewer'}
                            className="grid h-9 w-9 place-items-center rounded-md text-fg transition-colors duration-150 ease-out hover:bg-bg"
                        >
                            {last ? <TrashIcon weight="bold" size={14} /> : <MinusIcon weight="bold" size={12} />}
                        </button>
                        <span aria-live="polite" className="min-w-6 text-center text-sm font-bold tabular-nums text-fg">
                            {cartItem.quantity}
                        </span>
                        <button
                            onClick={onIncrease}
                            aria-label="One more"
                            className="grid h-9 w-9 place-items-center rounded-md text-fg transition-colors duration-150 ease-out hover:bg-bg"
                        >
                            <PlusIcon weight="bold" size={12} />
                        </button>
                    </div>
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
