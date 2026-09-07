'use client';

import React from 'react';

/**
 * The small parts the checkout form is built from.
 *
 * The old page put every group in a white card, and every input inside that
 * card in its own bordered box. Six containers on a screen that asks four
 * questions. A heading and the space above it separate two groups perfectly
 * well, which is what the cart sheet had already worked out.
 */

/**
 * A group heading.
 *
 * American Captain, which is condensed and all caps, so a 13px line reads as a
 * heading without a rule under it or a tint behind it. It is the only place on
 * this screen the brand face appears: item names and body copy stay on
 * Montserrat, where they are legible.
 */
export function Section({ title, children, className = '' }: {
    title: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={className}>
            <h2 className="font-brand text-[15px] uppercase leading-none tracking-[0.04em] text-fg">
                {title}
            </h2>
            <div className="mt-3">{children}</div>
        </section>
    );
}

/** A labelled control. The label is the only description it gets. */
export function Field({ label, error, hint, children }: {
    label: string;
    error?: string;
    hint?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-fg-muted">{label}</label>
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
    'min-h-12 w-full rounded-xl border border-hairline bg-surface px-3.5 text-fg ' +
    'outline-none transition-colors duration-150 ease-out ' +
    'placeholder:text-fg-subtle focus:border-fg';
