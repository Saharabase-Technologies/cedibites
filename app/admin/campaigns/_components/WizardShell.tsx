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

    return (
        <div className="grid lg:grid-cols-[220px_1fr] gap-6 lg:gap-10">

            {/* ── Step rail ─────────────────────────────────────────────── */}
            <nav aria-label="Campaign steps" className="lg:pt-1">
                <ol className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
                    {steps.map((s, i) => {
                        const done = i < furthest;
                        const active = i === current;
                        const reachable = i <= furthest;

                        return (
                            <li key={s.key} className="shrink-0 lg:w-full">
                                <button
                                    type="button"
                                    disabled={!reachable}
                                    onClick={() => reachable && onStepClick(i)}
                                    className={`
                                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                                        text-sm font-medium font-body transition-colors
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
                                            ${done && !active ? 'bg-emerald-100 text-emerald-700' : ''}
                                            ${!done && !active ? 'bg-neutral-light text-neutral-gray' : ''}
                                        `}
                                    >
                                        {done && !active ? <CheckIcon size={12} weight="bold" /> : i + 1}
                                    </span>
                                    {s.label}
                                </button>
                            </li>
                        );
                    })}
                </ol>
            </nav>

            {/* ── Step body ─────────────────────────────────────────────── */}
            <div className="min-w-0">
                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 md:p-7">
                    <h2 className="text-text-dark text-lg font-semibold font-body">{step.label}</h2>
                    <p className="text-neutral-gray text-sm font-body mt-1 mb-6">{step.blurb}</p>

                    {children}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 mt-5">{footer}</div>
            </div>
        </div>
    );
}
