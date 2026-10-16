'use client';

import { OWES } from './salesTones';

// A row of figures with no card under them, split by thin lines. It sits
// under a screen's lead block and carries less weight (staff portal D10).
// My Sales, the Dashboard and My Shifts use it.

export type QuietFigure = {
    label: string;
    value: string;
    /** A short line under the figure. Coloured text, never a pill (D11). */
    note?: string;
    /** Amber when money is owed or something waits. */
    noteOwes?: boolean;
};

/** On a phone the figures sit two a row; the last of an odd count takes the whole row. */
export function lastOfOdd(i: number, count: number): string {
    return count % 2 === 1 && i === count - 1 ? 'max-sm:col-span-2' : '';
}

/** `plain`: no lines between the figures, for a row inside a shaded panel. */
export function QuietRow({ figures, label, plain = false }: { figures: QuietFigure[]; label: string; plain?: boolean }) {
    return (
        <dl
            aria-label={label}
            className={`grid grid-cols-2 sm:grid-flow-col sm:auto-cols-fr ${plain ? 'gap-x-6 gap-y-3' : 'gap-px bg-row-line'}`}
        >
            {figures.map((f, i) => (
                <div
                    key={f.label}
                    className={`${plain ? 'flex flex-col gap-1' : 'bg-bg flex flex-col gap-1 px-3 py-2 sm:py-0.5 sm:px-4 sm:first:pl-1 sm:last:pr-1'} ${lastOfOdd(i, figures.length)}`}
                >
                    <dt className="text-xs text-neutral-gray">{f.label}</dt>
                    <dd className="m-0 text-lg font-bold leading-tight tabular-nums text-text-dark">{f.value}</dd>
                    {f.note && (
                        <dd className={`m-0 text-[11px] ${f.noteOwes ? `font-bold ${OWES}` : 'text-neutral-gray'}`}>{f.note}</dd>
                    )}
                </div>
            ))}
        </dl>
    );
}
