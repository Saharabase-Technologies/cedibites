'use client';

import { smallActionLook } from '@/app/components/ui/QuietControls';
import React from 'react';

/**
 * The small parts the checkout is built from.
 *
 * The screen is grouped blocks on a grey ground: where and who, how it is paid
 * for, and the order with its money. Inside a block, rows are separated by air
 * alone. The stepped version drew a hairline under every row, so nothing read as
 * a group and the page became a stack of strips at the same weight.
 */

/** A labelled control. The label is the only description it gets. */
export function Field({ label, error, hint, children }: {
    label: string;
    error?: string;
    hint?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-fg-muted">{label}</label>
            {children}
            {error
                ? <p className="text-[13px] font-semibold text-danger-ink">{error}</p>
                : hint}
        </div>
    );
}

/**
 * The shared look of anything you type into.
 *
 * Exported as a string rather than a wrapper component because the address
 * field needs the input itself, not a box around it, to carry the class.
 */
export const controlClass =
    'min-h-13 w-full rounded-xl border border-hairline bg-surface px-4 text-fg ' +
    'outline-none transition-colors duration-150 ease-out ' +
    'placeholder:text-fg-subtle focus:border-fg';

/** One block of related rows, white on the page's grey. */
export function Group({ children }: { children: React.ReactNode }) {
    return (
        <section className="flex flex-col gap-5 rounded-2xl bg-surface p-4">
            {children}
        </section>
    );
}

/**
 * One answer on the review screen, and the way to change it.
 *
 * A small grey label over the answer in bold, on every row. The stepped recap
 * used three grammars in three lines ("Delivery to **X**", "**Somda**, +233…",
 * "2 things from Ashaiman"), so the eye had to learn each line again.
 *
 * The whole row is the button. The word on the right is there so it looks like
 * one: a row that answers a tap but looks like text is only found by accident.
 * It wraps rather than truncates, because a Ghanaian address is long and a cut
 * one is exactly when somebody needed to check it.
 */
export function ReviewRow({ caption, value, placeholder, badge, sub, action, onPress }: {
    caption: string;
    value?: string;
    /** Said in place of the value when there is none yet. */
    placeholder: string;
    badge?: React.ReactNode;
    sub?: React.ReactNode;
    action?: string;
    onPress?: () => void;
}) {
    const body = (
        <>
            <span className="min-w-0 flex-1">
                <span className="block text-[13px] text-fg-muted">{caption}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    {value
                        ? <span className="min-w-0 text-[15px] font-bold leading-snug break-words text-fg">{value}</span>
                        : <span className="text-[15px] font-semibold leading-snug text-fg-subtle">{placeholder}</span>}
                    {badge}
                </span>
                {sub && <span className="mt-1 block text-[13px] leading-snug break-words text-fg-muted">{sub}</span>}
            </span>
            {action && <span className={`${smallActionLook} group-hover:bg-fg/10`}>{action}</span>}
        </>
    );

    if (!onPress) return <div className="flex items-start gap-3">{body}</div>;

    return (
        <button type="button" onClick={onPress} className="group flex w-full items-start gap-3 text-left">
            {body}
        </button>
    );
}
