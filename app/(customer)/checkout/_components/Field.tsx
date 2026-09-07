'use client';

import React, { useEffect, useState } from 'react';

/**
 * The small parts the checkout form is built from.
 *
 * The old page put every group in a white card, and every input inside that
 * card in its own bordered box. Six containers on a screen that asks four
 * questions. A heading and the space above it separate two groups perfectly
 * well, which is what the cart sheet had already worked out.
 */

/**
 * The question being asked, set as display type.
 *
 * American Captain is condensed and all caps. That is what makes it right for a
 * heading somebody reads at a glance and wrong for anything small: at the 15px
 * this used to be set at, the counters close up and it stops being legible on a
 * phone. The form asks one question at a time now, so the question can have the
 * size the face actually needs.
 */
export function StepHeading({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="font-brand text-[32px] uppercase leading-[0.92] tracking-[0.01em] text-fg md:text-[40px]">
            {children}
        </h2>
    );
}

/** A group under a heading. */
export function Section({ title, children, className = '' }: {
    title: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={className}>
            <StepHeading>{title}</StepHeading>
            <div className="mt-6">{children}</div>
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

/**
 * One question arriving.
 *
 * Give it a `key` that changes with the question and each one fades up as the
 * last is taken away. 180ms and ease out, then it stops: this is telling you
 * something moved on, not performing.
 *
 * Anybody who has asked their phone to stop animating gets the same change with
 * no travel, which is the whole point of asking.
 */
export function Reveal({ children }: { children: React.ReactNode }) {
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setShown(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    return (
        <div
            className={
                'transition-[opacity,transform] duration-200 ease-out ' +
                'motion-reduce:transition-none motion-reduce:translate-y-0 ' +
                (shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0')
            }
        >
            {children}
        </div>
    );
}
