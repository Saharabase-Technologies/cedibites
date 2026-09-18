'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { lockScroll, unlockScroll } from '@/lib/utils/scrollLock';

/** Past this, letting go closes it. Roughly a thumb's travel. */
const DISMISS_DISTANCE = 110;
/** Or a flick: pixels per millisecond, downward. */
const DISMISS_VELOCITY = 0.45;
const ANIMATION_MS = 260;

export interface BottomSheetProps {
    open: boolean;
    onClose: () => void;
    /** Announced to a screen reader as the name of the dialog. */
    label: string;
    /**
     * What it becomes when there is room. A cart belongs down the side of a
     * desktop where the page stays visible beside it; a single dish belongs in
     * the middle.
     */
    wide?: 'drawer' | 'dialog';
    /** Below this width it is a sheet you can drag. Must match `wide`. */
    sheetUntil?: string;
    /** Sits in the draggable region, under the handle. */
    header?: React.ReactNode;
    /** Pinned to the bottom, clear of the home indicator. */
    footer?: React.ReactNode;
    children: React.ReactNode;
}

/**
 * One sheet, for everything that slides up from the bottom of a phone.
 *
 * The mechanics here were written for the item sheet and are the reason it
 * stopped feeling like a box that happens to sit at the bottom of the screen: a
 * handle you can drag, a page that does not scroll underneath, a body that
 * scrolls inside itself so the action bar can never be pushed off, an action
 * bar clear of the home indicator, focus that stays inside, and Escape.
 *
 * They live here rather than in each component because the second thing to want
 * them was the cart, and a second copy is how two sheets end up behaving
 * differently on the same phone.
 *
 * Dragging is limited to the header. A sheet that also drags from its body has
 * to arbitrate every gesture against the scroll position and gets it wrong at
 * the boundary; the handle is what a thumb reaches for anyway.
 */
export default function BottomSheet({
    open,
    onClose,
    label,
    wide = 'dialog',
    sheetUntil = '(max-width: 639px)',
    header,
    footer,
    children,
}: BottomSheetProps) {
    const [rendered, setRendered] = useState(open);
    const [visible, setVisible] = useState(false);
    const [dragY, setDragY] = useState(0);
    const [dragging, setDragging] = useState(false);

    const panel = useRef<HTMLDivElement>(null);
    const returnFocusTo = useRef<HTMLElement | null>(null);
    const drag = useRef({ startY: 0, startedAt: 0, active: false });

    // ── Mounted long enough to animate out ──────────────────────────────────
    useEffect(() => {
        if (open) {
            setRendered(true);
            setDragY(0);
            const raf = requestAnimationFrame(() => setVisible(true));
            return () => cancelAnimationFrame(raf);
        }

        setVisible(false);
        const t = setTimeout(() => setRendered(false), ANIMATION_MS);
        return () => clearTimeout(t);
    }, [open]);

    /**
     * The page stays where it was.
     *
     * Keyed on `open`, not `rendered`. The sheet is fixed-position, so it can
     * finish sliding out over a page that is already free to scroll, and the
     * 260ms it spends animating is 260ms the lock used to hold on past the tap
     * that closed it. On the cart's checkout button that tap also navigates,
     * which left the body pinned while a whole new route mounted under it.
     */
    useEffect(() => {
        if (!open) return;
        lockScroll();
        return unlockScroll;
    }, [open]);

    // ── Escape, and focus that stays inside ─────────────────────────────────
    useEffect(() => {
        if (!rendered) return;

        returnFocusTo.current = document.activeElement as HTMLElement | null;
        panel.current?.focus({ preventScroll: true });

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { onClose(); return; }
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
    }, [rendered, onClose]);

    // ── Dragging the header ─────────────────────────────────────────────────
    const isSheet = useCallback(() => window.matchMedia(sheetUntil).matches, [sheetUntil]);

    const onPointerDown = (e: React.PointerEvent) => {
        if (!isSheet()) return;
        drag.current = { startY: e.clientY, startedAt: performance.now(), active: true };
        setDragging(true);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!drag.current.active) return;
        // Downward only. Dragging a sheet up is how you get one stuck to the top
        // of the screen with nothing behind it.
        setDragY(Math.max(0, e.clientY - drag.current.startY));
    };

    const onPointerUp = () => {
        if (!drag.current.active) return;

        const travelled = dragY;
        const speed = travelled / Math.max(1, performance.now() - drag.current.startedAt);

        drag.current.active = false;
        setDragging(false);

        if (travelled > DISMISS_DISTANCE || speed > DISMISS_VELOCITY) onClose();
        else setDragY(0);
    };

    if (!rendered) return null;

    const drawer = wide === 'drawer';

    /**
     * Where it sits, as classes rather than an inline transform.
     *
     * The drawer leaves to the right on a desktop and downward on a phone, and
     * a breakpoint cannot be expressed in a style attribute. The drag offset
     * rides in on a custom property instead, so the two do not fight over the
     * same declaration.
     */
    const placement = visible
        ? (drawer
            ? 'translate-y-[var(--drag)] md:translate-x-0 md:translate-y-0'
            : 'translate-y-[var(--drag)]')
        : (drawer
            ? 'translate-y-full md:translate-x-full md:translate-y-0'
            : 'translate-y-full');

    return (
        <div
            className={`fixed inset-0 z-50 flex justify-center ${
                drawer ? 'items-end md:items-stretch md:justify-end' : 'items-end sm:items-center'
            }`}
            role="dialog"
            aria-modal="true"
            aria-label={label}
        >
            <button
                aria-label="Close"
                tabIndex={-1}
                onClick={onClose}
                className="absolute inset-0 cursor-default bg-black/55 transition-opacity duration-[260ms] ease-out"
                style={{ opacity: visible ? 1 : 0 }}
            />

            <div
                ref={panel}
                tabIndex={-1}
                className={`relative flex w-full flex-col overflow-hidden bg-bg outline-none ${placement} ${
                    drawer
                        ? 'max-h-[92dvh] rounded-t-3xl md:h-full md:max-h-none md:w-105 md:rounded-none'
                        : 'max-h-[92dvh] rounded-t-3xl sm:max-h-[88dvh] sm:max-w-md sm:rounded-3xl'
                }`}
                style={{
                    ['--drag' as string]: `${dragY}px`,
                    transition: dragging ? 'none' : `transform ${ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                }}
            >
                <div
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    className={`shrink-0 touch-none ${drawer ? 'md:touch-auto' : 'sm:touch-auto'}`}
                >
                    <div className={`flex justify-center pb-1 pt-2.5 ${drawer ? 'md:hidden' : 'sm:hidden'}`}>
                        <span aria-hidden className="h-1 w-10 rounded-full bg-fg/15" />
                    </div>
                    {header}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    {children}
                </div>

                {footer && (
                    <div className="shrink-0 bg-surface pb-safe">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
