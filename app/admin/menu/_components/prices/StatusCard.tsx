'use client';

import type { PriceBoard } from '@/lib/api/services/menuPrices.service';
import { formatWhen } from './format';
import { Pill } from './Pill';

const BUTTON_PRIMARY =
    'inline-flex items-center justify-center px-4 min-h-11 rounded-xl bg-primary text-white text-sm font-semibold font-body hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const BUTTON_QUIET =
    'inline-flex items-center justify-center px-4 min-h-11 rounded-xl border border-[#e3e1de] bg-white text-text-dark text-sm font-medium font-body hover:bg-neutral-light transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * Where the waiting changes stand, and the one button that matters.
 *
 * Three states: nothing waiting, changes waiting, and a time set.
 */
export function StatusCard({
    board,
    busy,
    onPublish,
    onCancelSchedule,
    onClearAll,
}: {
    board: PriceBoard;
    busy: boolean;
    onPublish: (when: 'now' | 'at') => void;
    onCancelSchedule: (id: number) => void;
    onClearAll: () => void;
}) {
    const waiting = board.waiting_count;
    const scheduled = board.scheduled;
    const changes = `${waiting} change${waiting === 1 ? '' : 's'}`;

    let title: string;
    let detail: string;

    if (scheduled) {
        title = `Goes live on ${formatWhen(scheduled.publish_at)}`;
        detail = waiting > 0
            ? `${changes} waiting. Anything you add before then goes too.`
            : 'Nothing is waiting yet. If that is still so at that time, nothing changes.';
    } else if (waiting > 0) {
        title = `${changes} waiting`;
        detail = 'The till and the website still charge today’s prices.';
    } else {
        title = 'Nothing is waiting';
        detail = 'Type a new price beside any dish below.';
    }

    return (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 mb-5 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-lg font-semibold font-brand text-text-dark">{title}</h2>
                    {scheduled ? (
                        <Pill tone="decided">Time set</Pill>
                    ) : waiting > 0 ? (
                        <Pill tone="waiting">Not live</Pill>
                    ) : null}
                </div>
                <p className="text-sm font-body text-neutral-gray">{detail}</p>
                {scheduled?.scheduled_by && (
                    <p className="text-xs font-body text-neutral-gray mt-1">Set by {scheduled.scheduled_by}.</p>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                {waiting > 0 && (
                    <button type="button" className={BUTTON_PRIMARY} disabled={busy} onClick={() => onPublish('now')}>
                        {scheduled ? 'Go live now' : 'Put new prices live'}
                    </button>
                )}
                {scheduled && waiting > 0 && (
                    <button type="button" className={BUTTON_QUIET} disabled={busy} onClick={() => onPublish('at')}>
                        Change the time
                    </button>
                )}
                {scheduled && (
                    <button type="button" className={BUTTON_QUIET} disabled={busy} onClick={() => onCancelSchedule(scheduled.id)}>
                        Call off
                    </button>
                )}
                {waiting > 0 && !scheduled && (
                    <button type="button" className={BUTTON_QUIET} disabled={busy} onClick={onClearAll}>
                        Clear all
                    </button>
                )}
            </div>
        </div>
    );
}

export { BUTTON_PRIMARY, BUTTON_QUIET };
