'use client';

import { CheckIcon } from '@phosphor-icons/react';

export interface WizardStep {
    key: string;
    label: string;
    /** One line saying what this step is for, shown under the heading. */
    blurb: string;
}

/**
 * The step rail and frame for building a campaign.
 *
 * A campaign is four unrelated decisions — what to call it, who gets it, what it
 * says, and whether to spend the money — and stacking them in one modal made a
 * scroll where the cost was below the fold. Split across steps, each one has
 * room to explain itself, and the last one exists purely so nobody sends
 * without reading the total.
 *
 * Completed steps are clickable; steps ahead are not. You can always go back and
 * change your mind, and never skip past a decision you have not made.
 */
export function WizardShell({
    steps,
    current,
    furthest,
    onStepClick,
    children,
    footer,
}: {
    steps: WizardStep[];
    current: number;
    /** The highest step reached so far — everything up to here is navigable. */
    furthest: number;
    onStepClick: (index: number) => void;
    children: React.ReactNode;
    footer: React.ReactNode;
}) {
    const step = steps[current];

    /*
     * Steps run across the top, not down a side rail.
     *
     * The rail cost 220px of every row on the widest screens and gave nothing
     * back — four short labels do not need a column. The message step in
     * particular is a textarea beside a cost panel, and the panel was the thing
     * being squeezed: the total we are about to spend is the one figure on this
     * page nobody should have to hunt for.
     */
    return (
        <div className="max-w-3xl mx-auto">

            {/* ── Steps ─────────────────────────────────────────────────── */}
            <nav aria-label="Campaign steps" className="mb-5">
                <ol className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1">
                    {steps.map((s, i) => {
                        const done = i < furthest;
                        const active = i === current;
                        const reachable = i <= furthest;

                        return (
                            <li key={s.key} className="flex items-center gap-1 sm:gap-2 shrink-0">
                                <button
                                    type="button"
                                    disabled={!reachable}
                                    aria-current={active ? 'step' : undefined}
                                    onClick={() => reachable && onStepClick(i)}
                                    className={`
                                        flex items-center gap-2 px-3 py-2 rounded-xl
                                        text-sm font-medium font-body transition-colors whitespace-nowrap
                                        ${active ? 'bg-neutral-card text-text-dark shadow-sm' : ''}
                                        ${!active && reachable ? 'text-neutral-gray hover:text-text-dark cursor-pointer' : ''}
                                        ${!reachable ? 'text-neutral-gray/40 cursor-not-allowed' : ''}
                                    `}
                                >
                                    <span
                                        className={`
                                            flex items-center justify-center w-6 h-6 rounded-full shrink-0
                                            text-[11px] font-semibold
                                            ${active ? 'bg-primary text-white' : ''}
                                            ${done && !active ? 'bg-secondary/15 text-secondary' : ''}
                                            ${!done && !active ? 'bg-neutral-light text-neutral-gray' : ''}
                                        `}
                                    >
                                        {done && !active ? <CheckIcon size={12} weight="bold" /> : i + 1}
                                    </span>
                                    {/* The number carries the meaning on a phone;
                                        the label is what needs the room. */}
                                    <span className="hidden sm:inline">{s.label}</span>
                                </button>

                                {i < steps.length - 1 && (
                                    <span aria-hidden className="w-4 sm:w-8 h-px bg-[#e8dfcc] shrink-0" />
                                )}
                            </li>
                        );
                    })}
                </ol>
            </nav>

            {/* ── Step body ─────────────────────────────────────────────── */}
            <div className="min-w-0">
                {/* Depth from shadow rather than an outline — the same card the
                    staff section uses. Borders on a cream page read as clutter
                    once there are several of them stacked. */}
                <div className="bg-neutral-card rounded-2xl shadow-sm p-5 md:p-7">
                    <h2 className="text-text-dark text-lg font-semibold font-body">{step.label}</h2>
                    <p className="text-neutral-gray text-sm font-body mt-1 mb-6">{step.blurb}</p>

                    {children}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 mt-5">{footer}</div>
            </div>
        </div>
    );
}
