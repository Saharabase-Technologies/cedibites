'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { CheckIcon, MinusIcon, PlusIcon, XIcon } from '@phosphor-icons/react';
import type { SearchableItem } from '@/app/components/providers/MenuDiscoveryProvider';
import { useMenuDiscovery } from '@/app/components/providers/MenuDiscoveryProvider';
import { useCart, DEFAULT_SIZE_KEY, makeCartItemId } from '@/app/components/providers/CartProvider';
import { photoForMenuItem } from '@/lib/constants/branchPhotos';

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

/** Past this, letting go closes it. Roughly a thumb's travel. */
const DISMISS_DISTANCE = 110;
/** Or a flick: pixels per millisecond, downward. */
const DISMISS_VELOCITY = 0.45;
const ANIMATION_MS = 260;

/**
 * The item sheet.
 *
 * Rebuilt to behave like a sheet on a phone rather than a box that happens to
 * be at the bottom of the screen. What it was missing:
 *
 * - **The page scrolled underneath it.** The old file had a comment saying the
 *   ModalProvider handled the scroll lock globally, and it does, but only for
 *   its own modals. This one is opened from local page state, so nothing was
 *   locking anything and the menu slid about behind the sheet.
 * - **Nothing to grab.** No handle, and no way to swipe it away, so the only
 *   exit was a small X in the corner.
 * - **Nowhere for the content to go.** The panel could not scroll inside
 *   itself, so on a short screen a long dish pushed the Add button off the
 *   bottom of the display.
 * - **No safe area.** The action bar sat under the home indicator.
 * - **No focus handling.** Tab walked straight out of the sheet and into the
 *   menu behind it.
 *
 * Dragging is deliberately limited to the header. A sheet that also drags from
 * its body has to arbitrate every gesture against the scroll position, and gets
 * it wrong at the boundary; the handle is what a thumb reaches for anyway.
 *
 * The variant selector that used to sit here is gone. `variants` is never
 * populated: MenuDiscoveryProvider's transform says so in as many words, and
 * every option on this menu arrives as a size.
 */
export default function ItemDetailModal({ item, onClose, initialSizeKey }: ItemDetailModalProps) {
    const { addToCart, removeFromCart, getCartItem, updateQuantity, isLinePending } = useCart();
    const { isOptionSoldOut } = useMenuDiscovery();

    const sizes: NonNullable<SearchableItem['sizes']> = item?.sizes ?? [];
    const hasSizes = sizes.length > 0;

    const [selectedSize, setSelectedSize] = useState<string>(DEFAULT_SIZE_KEY);
    const [imgError, setImgError] = useState(false);
    const [visible, setVisible] = useState(false);
    const [dragY, setDragY] = useState(0);
    const [dragging, setDragging] = useState(false);

    const panel = useRef<HTMLDivElement>(null);
    const returnFocusTo = useRef<HTMLElement | null>(null);
    const drag = useRef({ startY: 0, startedAt: 0, active: false });

    // ── Opening ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!item) { setVisible(false); return; }

        const wanted = initialSizeKey && item.sizes?.some(s => s.key === initialSizeKey)
            ? initialSizeKey
            : item.sizes?.[0]?.key ?? DEFAULT_SIZE_KEY;

        setSelectedSize(wanted);
        setImgError(false);
        setDragY(0);

        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, [item, initialSizeKey]);

    const handleClose = useCallback(() => {
        setVisible(false);
        setTimeout(onClose, ANIMATION_MS);
    }, [onClose]);

    // ── The page stays where it was ─────────────────────────────────────────
    useEffect(() => {
        if (!item) return;

        // Whatever it was, not necessarily "". A cart drawer may already have
        // locked the body, and clearing it outright would unlock the page for
        // a modal that is still open.
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, [item]);

    // ── Escape, and focus that stays inside ─────────────────────────────────
    useEffect(() => {
        if (!item) return;

        returnFocusTo.current = document.activeElement as HTMLElement | null;
        panel.current?.focus({ preventScroll: true });

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { handleClose(); return; }
            if (e.key !== 'Tab' || !panel.current) return;

            const focusable = panel.current.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
            );
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            returnFocusTo.current?.focus?.({ preventScroll: true });
        };
    }, [item, handleClose]);

    // ── Dragging the header ─────────────────────────────────────────────────
    const onPointerDown = (e: React.PointerEvent) => {
        // Only the sheet drags. On a wide screen this is a centred dialog and
        // pulling it towards the bottom of the window means nothing.
        if (window.matchMedia('(min-width: 640px)').matches) return;

        drag.current = { startY: e.clientY, startedAt: performance.now(), active: true };
        setDragging(true);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!drag.current.active) return;
        // Downward only. Dragging a sheet up is how you get a sheet stuck to
        // the top of the screen with nothing behind it.
        setDragY(Math.max(0, e.clientY - drag.current.startY));
    };

    const onPointerUp = () => {
        if (!drag.current.active) return;

        const travelled = dragY;
        const speed = travelled / Math.max(1, performance.now() - drag.current.startedAt);

        drag.current.active = false;
        setDragging(false);

        if (travelled > DISMISS_DISTANCE || speed > DISMISS_VELOCITY) handleClose();
        else setDragY(0);
    };

    if (!item) return null;

    const activeSize = hasSizes ? sizes.find(s => s.key === selectedSize) : undefined;
    const activePrice = hasSizes ? activeSize?.price ?? 0 : item.price ?? 0;
    const cartItemId = hasSizes ? selectedSize : DEFAULT_SIZE_KEY;

    const cartItem = getCartItem(item.id, cartItemId);
    const qty = cartItem?.quantity ?? 0;
    const soldOut = isOptionSoldOut(activeSize?.id);
    const pending = isLinePending(makeCartItemId(item.id, cartItemId));

    const image = activeSize?.image ?? item.image ?? item.thumbnail ?? photoForMenuItem(item.name)?.src;
    const hasPhoto = Boolean(image) && !imgError;
    const tag = item.tags?.[0];

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label={item.name}
        >
            <button
                aria-label="Close"
                tabIndex={-1}
                onClick={handleClose}
                className="absolute inset-0 cursor-default bg-black/55 transition-opacity duration-[260ms] ease-out"
                style={{ opacity: visible ? 1 : 0 }}
            />

            <div
                ref={panel}
                tabIndex={-1}
                className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-bg outline-none sm:max-h-[88dvh] sm:max-w-md sm:rounded-3xl"
                style={{
                    transform: visible ? `translateY(${dragY}px)` : 'translateY(100%)',
                    transition: dragging ? 'none' : `transform ${ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                }}
            >
                {/* ── The part you grab ──────────────────────────────────── */}
                <div
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    className="shrink-0 touch-none sm:touch-auto"
                >
                    <div className="flex justify-center pb-1 pt-2.5 sm:hidden">
                        <span aria-hidden className="h-1 w-10 rounded-full bg-fg/15" />
                    </div>

                    {hasPhoto ? (
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
                                onClick={handleClose}
                                aria-label="Close"
                                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg bg-black/45 text-white transition-colors duration-150 ease-out hover:bg-black/65"
                            >
                                <XIcon size={17} weight="bold" />
                            </button>
                        </div>
                    ) : (
                        /* No photograph, so no empty band. The close button
                           moves in beside the name instead of floating over a
                           grey rectangle. */
                        <div className="flex items-start justify-end px-5 pt-2">
                            <button
                                onClick={handleClose}
                                aria-label="Close"
                                className="grid h-9 w-9 place-items-center rounded-lg text-fg-muted transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-fg"
                            >
                                <XIcon size={17} weight="bold" />
                            </button>
                        </div>
                    )}
                </div>

                {/* ── What scrolls ───────────────────────────────────────── */}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-4">
                    <h2 className="text-xl font-bold leading-tight text-fg">{item.name}</h2>

                    {!hasPhoto && tag && (
                        <p className="mt-1.5 text-[11px] font-bold uppercase tracking-widest text-accent-ink">
                            {tag.name}
                        </p>
                    )}

                    {item.description && (
                        <p className="mt-2 text-sm leading-relaxed text-fg-muted">{item.description}</p>
                    )}

                    {sizes.length > 1 && (
                        <div className="mt-6">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-fg-muted">
                                Choose one
                            </p>

                            {/* A list, not a row of chips. "Assorted Fried Rice"
                                does not fit in a chip and the chips truncated it. */}
                            <div role="radiogroup" aria-label="Choose one" className="mt-2.5 flex flex-col gap-2">
                                {sizes.map(size => {
                                    const chosen = size.key === selectedSize;
                                    const optionSoldOut = isOptionSoldOut(size.id);
                                    const inCart = getCartItem(item.id, size.key)?.quantity ?? 0;

                                    return (
                                        <button
                                            key={size.key}
                                            role="radio"
                                            aria-checked={chosen}
                                            disabled={optionSoldOut}
                                            onClick={() => setSelectedSize(size.key)}
                                            className={`flex min-h-13 items-center gap-3 rounded-xl border px-4 text-left transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg ${
                                                optionSoldOut
                                                    ? 'border-hairline opacity-50'
                                                    : chosen
                                                        ? 'border-fg bg-surface'
                                                        : 'border-hairline bg-surface hover:border-hairline-strong'
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

                                            <span className="min-w-0 flex-1 text-sm font-semibold text-fg">
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

                {/* ── The bar that does the work ─────────────────────────── */}
                <div className="shrink-0 border-t border-hairline bg-surface px-5 pb-safe pt-3.5">
                    <div className="flex items-center gap-3 pb-3.5">
                        {soldOut ? (
                            <p className="flex-1 text-sm font-bold text-fg-muted">
                                {sizes.length > 1 ? 'Sold out. Try another choice.' : 'Sold out today.'}
                            </p>
                        ) : qty > 0 ? (
                            <>
                                <div className="flex h-12 items-center gap-1 rounded-xl bg-surface-sunken px-1">
                                    <button
                                        onClick={() => (qty <= 1
                                            ? removeFromCart(cartItem!.cartItemId)
                                            : updateQuantity(cartItem!.cartItemId, qty - 1))}
                                        disabled={pending}
                                        aria-label={qty <= 1 ? 'Remove from the order' : 'One fewer'}
                                        className="grid h-10 w-10 place-items-center rounded-lg text-fg transition-colors duration-150 ease-out hover:bg-bg"
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
                                        className="grid h-10 w-10 place-items-center rounded-lg text-fg transition-colors duration-150 ease-out hover:bg-bg"
                                    >
                                        <PlusIcon size={15} weight="bold" />
                                    </button>
                                </div>

                                <button
                                    onClick={handleClose}
                                    className="h-12 flex-1 rounded-xl bg-primary-fill text-sm font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95"
                                >
                                    Done · {formatPrice(activePrice * qty)}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => addToCart(item, cartItemId)}
                                disabled={pending}
                                className="h-12 flex-1 rounded-xl bg-primary-fill text-sm font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95 disabled:opacity-60"
                            >
                                {pending ? 'Adding…' : `Add to order · ${formatPrice(activePrice)}`}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
