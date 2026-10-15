'use client';

import { useMemo, useState } from 'react';
import { InventoryModal, SegmentedTabs, FormField, TextInput, PrimaryButton } from '@/app/inventory/_components';
import type { PriceBoard } from '@/lib/api/services/menuPrices.service';
import { serverNow } from '@/lib/utils/serverClock';
import { formatWhen, ghanaDateAndTime, waitingChanges } from './format';

type When = 'now' | 'at';

/**
 * The last look before the switch: every waiting change, old beside new, then
 * now or at a set time.
 *
 * The time is Ghana time, which is also the server's. The default for a set
 * time is tomorrow at 06:00, before the tills open, counted from the server's
 * clock rather than this computer's.
 */
export function PublishModal({
    board,
    initialWhen,
    onClose,
    onPublishNow,
    onSchedule,
}: {
    board: PriceBoard;
    initialWhen: When;
    onClose: () => void;
    onPublishNow: () => Promise<void>;
    onSchedule: (at: string) => Promise<void>;
}) {
    const groups = useMemo(() => waitingChanges(board), [board]);
    const count = board.waiting_count;

    const initial = useMemo(() => {
        if (board.scheduled) return ghanaDateAndTime(new Date(board.scheduled.publish_at));
        const tomorrow = new Date(serverNow().getTime() + 24 * 60 * 60 * 1000);
        return { date: ghanaDateAndTime(tomorrow).date, time: '06:00' };
    }, [board.scheduled]);

    const [when, setWhen] = useState<When>(initialWhen);
    const [date, setDate] = useState(initial.date);
    const [time, setTime] = useState(initial.time);
    const [busy, setBusy] = useState(false);

    // "2026-10-20T06:00:00Z" reads as Ghana time because Ghana is UTC+0.
    const chosen = date && time ? `${date}T${time}:00Z` : '';

    async function confirm() {
        setBusy(true);
        try {
            if (when === 'now') {
                await onPublishNow();
            } else {
                await onSchedule(`${date} ${time}`);
            }
        } finally {
            setBusy(false);
        }
    }

    const changes = `${count} change${count === 1 ? '' : 's'}`;

    return (
        <InventoryModal isOpen onClose={onClose} title="Put new prices live" size="lg">
            <p className="text-sm font-body text-neutral-gray mb-4">
                Check each line. Old is on the left, new on the right.
            </p>

            <div className="border border-[#f0e8d8] rounded-xl max-h-[40vh] overflow-y-auto mb-5">
                {groups.map(group => (
                    <div key={group.dishId} className="border-b border-[#f0e8d8] last:border-0 px-4 py-3">
                        <p className="text-sm font-semibold font-body text-text-dark mb-1">{group.dish}</p>
                        <ul className="space-y-1">
                            {group.lines.map(line => (
                                <li key={line.key} className="grid grid-cols-[1fr_auto] gap-x-3 text-sm font-body">
                                    <span className="text-neutral-gray min-w-0">
                                        {line.line !== group.dish && <span className="text-text-dark">{line.line} </span>}
                                        <span className="text-xs">{line.what}</span>
                                    </span>
                                    <span className="text-right tabular-nums whitespace-nowrap">
                                        <span className="text-neutral-gray line-through decoration-neutral-gray/50">{line.from}</span>
                                        <span className="text-neutral-gray mx-1.5" aria-label="becomes">→</span>
                                        <span className="font-semibold text-text-dark">{line.to}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="mb-4">
                <SegmentedTabs<When>
                    options={[
                        { value: 'now', label: 'Now' },
                        { value: 'at', label: 'At a set time' },
                    ]}
                    value={when}
                    onChange={setWhen}
                />
            </div>

            {when === 'at' ? (
                <div className="grid grid-cols-2 gap-3 mb-2">
                    <FormField label="Day" htmlFor="publish-date">
                        <TextInput id="publish-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </FormField>
                    <FormField label="Time, Ghana" htmlFor="publish-time">
                        <TextInput id="publish-time" type="time" value={time} onChange={e => setTime(e.target.value)} />
                    </FormField>
                </div>
            ) : (
                <p className="text-sm font-body text-neutral-gray mb-2">
                    Every open till and menu reloads at that moment.
                </p>
            )}

            <PrimaryButton className="mt-4" loading={busy} disabled={when === 'at' && !chosen} onClick={confirm}>
                {when === 'now'
                    ? `Put ${changes} live now`
                    : chosen
                        ? `Set for ${formatWhen(chosen)}`
                        : 'Pick a day and a time'}
            </PrimaryButton>
        </InventoryModal>
    );
}
