'use client';

import React from 'react';
import { ArrowLeftIcon } from '@phosphor-icons/react';

export interface ScreenHeaderProps {
    title: string;
    /** Omit and no back arrow is drawn, for a screen there is no going back from. */
    onBack?: () => void;
    backLabel?: string;
    /** Sits at the right of the bar. A step count, an action, anything short. */
    right?: React.ReactNode;
    /** 0 to 1. Drawn as a line across the foot of the bar. Omit for none. */
    progress?: number;
    /** For a screen that owns the whole screen at some widths only, like the account's. */
    className?: string;
}

/**
 * The bar at the top of a screen you can leave.
 *
 * `Navbar` returns null on the full-screen routes, which is right: a payment
 * flow should not offer a tab bar and a branch switcher halfway through. But it
 * left checkout with no chrome at all and no way back except the browser, which
 * on a phone installed to the home screen is no way at all.
 *
 * So the app header is replaced rather than removed. Back on the left, where a
 * thumb and every native app expect it, the name of the screen beside it, and
 * an optional line across the bottom for how far through you are.
 *
 * Sticky rather than fixed, so it cannot cover the first field, and padded for
 * the status bar on a notched phone.
 */
export default function ScreenHeader({ title, onBack, backLabel, right, progress, className = '' }: ScreenHeaderProps) {
    return (
        <header className={`sticky top-0 z-30 border-b border-hairline bg-surface pt-safe ${className}`}>
            <div className="flex h-14 items-center gap-1 px-2 md:h-16 md:px-4">
                {onBack && (
                    <button
                        onClick={onBack}
                        aria-label={backLabel ?? 'Go back'}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-fg transition-colors duration-150 ease-out hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
                    >
                        <ArrowLeftIcon size={19} weight="bold" />
                    </button>
                )}

                <h1 className={`min-w-0 flex-1 truncate text-base font-bold text-fg md:text-lg ${onBack ? '' : 'pl-2'}`}>
                    {title}
                </h1>

                {right && <div className="shrink-0 pr-1">{right}</div>}
            </div>

            {progress !== undefined && (
                <div aria-hidden className="h-0.5 w-full bg-surface-sunken">
                    <div
                        className="h-full bg-fg transition-[width] duration-300 ease-out"
                        style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
                    />
                </div>
            )}
        </header>
    );
}
