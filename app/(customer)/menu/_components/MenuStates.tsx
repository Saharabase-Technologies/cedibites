'use client';

import React from 'react';
import { ArrowClockwiseIcon, WifiSlashIcon } from '@phosphor-icons/react';

/**
 * Waiting, in the shape of the thing being waited for.
 *
 * A spinner in the middle of an empty page says only that something is
 * happening. Rows in the shape of the rows that are coming say how much is
 * coming and where it will be, and the page does not jump when it lands.
 */
export function MenuSkeleton() {
    return (
        <div className="flex flex-col gap-2.5" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-hairline bg-surface p-3.5">
                    <div className="flex gap-3.5">
                        <div className="h-20 w-20 shrink-0 animate-pulse rounded-xl bg-surface-sunken" />
                        <div className="flex-1 pt-1">
                            <div className="h-3.5 w-2/5 animate-pulse rounded-sm bg-surface-sunken" />
                            <div className="mt-2.5 h-3 w-4/5 animate-pulse rounded-sm bg-surface-sunken" />
                        </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                        <div className="h-10 w-24 animate-pulse rounded-lg bg-surface-sunken" />
                        <div className="h-10 w-28 animate-pulse rounded-lg bg-surface-sunken" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * The menu did not arrive.
 *
 * Names what happened and what to do about it. "Failed to load menu" with a sad
 * face told a customer neither.
 */
export function MenuError({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="rounded-2xl border border-hairline bg-surface px-5 py-12 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-surface-sunken text-fg-muted">
                <WifiSlashIcon size={22} weight="fill" />
            </span>
            <p className="mt-4 text-base font-bold text-fg">The menu did not load</p>
            <p className="mx-auto mt-1 max-w-72 text-sm leading-relaxed text-fg-muted">
                Your connection dropped, or our kitchen system did. The food is still there.
            </p>
            <button
                onClick={onRetry}
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-fill px-5 text-sm font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-fill"
            >
                <ArrowClockwiseIcon size={15} weight="bold" />
                Try again
            </button>
        </div>
    );
}

/**
 * A search that found nothing.
 *
 * The old copy said "Try different keywords", which is the one thing a person
 * who has just failed at searching already knows. This one hands back the way
 * out: the whole menu is still there, and the button returns to it.
 */
export function MenuNoResults({ query, onClear }: { query: string; onClear: () => void }) {
    return (
        <div className="rounded-2xl border border-hairline bg-surface px-5 py-12 text-center">
            <p className="text-base font-bold text-fg">
                Nothing on the menu matches &ldquo;{query}&rdquo;
            </p>
            <p className="mx-auto mt-1 max-w-80 text-sm leading-relaxed text-fg-muted">
                Try the dish rather than what is in it. Searching for jollof finds three,
                searching for tomato finds none.
            </p>
            <button
                onClick={onClear}
                className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-hairline bg-bg px-5 text-sm font-bold text-fg transition-colors duration-150 ease-out hover:border-hairline-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
                Show the whole menu
            </button>
        </div>
    );
}

/**
 * A branch with nothing on it.
 *
 * Rare, and real: a newly provisioned branch has categories before it has
 * dishes, and the no-stock-no-sale gate can empty a section for a day.
 */
export function MenuEmpty({ branchName }: { branchName?: string }) {
    return (
        <div className="rounded-2xl border border-hairline bg-surface px-5 py-12 text-center">
            <p className="text-base font-bold text-fg">
                {branchName ? `${branchName} has nothing listed yet` : 'Nothing is listed yet'}
            </p>
            <p className="mx-auto mt-1 max-w-80 text-sm leading-relaxed text-fg-muted">
                Another branch may be cooking. Change the branch at the top of this page.
            </p>
        </div>
    );
}
