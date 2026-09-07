'use client';

import { CheckIcon } from '@phosphor-icons/react';
import type { Stage } from './trackOrder';

/**
 * Where the order has got to.
 *
 * A stage with no recorded time prints no time. That is the whole point of
 * this rewrite: the version before it filled every empty slot with arithmetic
 * off the placed time, so a customer read a delivery time that had never
 * happened.
 *
 * No pulsing on the live stage. The page polls, it is not a feed, and a dot
 * throbbing next to "Being cooked" says nothing the label does not.
 */

const clock = (at: number | null): string | null => {
    if (at === null) return null;
    return new Date(at).toLocaleTimeString('en-GH', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).toLowerCase();
};

export default function Timeline({ stages }: { stages: Stage[] }) {
    return (
        <ol>
            {stages.map((stage, i) => {
                const last = i === stages.length - 1;
                const at = clock(stage.at);

                return (
                    <li key={stage.key} className="relative flex gap-4 pb-6 last:pb-0">
                        {/* The rail, drawn between this marker and the next. */}
                        {!last && (
                            <span
                                aria-hidden
                                className={`absolute left-[11px] top-6 bottom-0 w-px ${
                                    stage.state === 'done' ? 'bg-fg' : 'bg-hairline'
                                }`}
                            />
                        )}

                        <span
                            aria-hidden
                            className={`relative z-10 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                                stage.state === 'done'
                                    ? 'bg-fg text-white'
                                    : stage.state === 'active'
                                        ? 'bg-primary-fill text-white'
                                        : 'border-2 border-hairline-strong bg-bg'
                            }`}
                        >
                            {stage.state === 'done' && <CheckIcon size={12} weight="bold" />}
                            {stage.state === 'active' && <span className="h-2 w-2 rounded-full bg-white" />}
                        </span>

                        <div className="min-w-0 flex-1 pt-px">
                            <div className="flex items-baseline justify-between gap-3">
                                <p className={`text-[15px] font-bold ${
                                    stage.state === 'todo' ? 'text-fg-subtle' : 'text-fg'
                                }`}>
                                    {stage.label}
                                </p>
                                {at && (
                                    <p className="shrink-0 text-[13px] tabular-nums text-fg-muted">{at}</p>
                                )}
                            </div>

                            {stage.state === 'active' && (
                                <p className="mt-1 text-sm leading-relaxed text-fg-muted">{stage.note}</p>
                            )}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
