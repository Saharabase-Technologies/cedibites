'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SpinnerIcon } from '@phosphor-icons/react';
import { PageHeader } from '@/app/inventory/_components/PageHeader';
import { InventoryModal } from '@/app/inventory/_components/InventoryModal';
import { Toggle } from '@/app/inventory/_components/FormPrimitives';
import { TONE } from '@/app/inventory/_components/status-tokens';
import { OverrideDialog } from '@/app/components/opening/OverrideDialog';
import { STATUS_LABEL, dayLabel, statusTone } from '@/app/components/opening/openingFormat';
import { openingService } from '@/lib/api/services/opening.service';
import { toast } from '@/lib/utils/toast';
import type { AdminOpeningRow } from '@/types/opening';
import { OpeningsTabs } from './_components/OpeningsTabs';
import { describeOpening } from './_components/describe';

/**
 * How every branch started the day.
 *
 * The first thing on the page is the branches that are not open when they
 * should be, because that is the one thing here head office may need to act on.
 */
export default function AdminOpeningsPage() {
    const queryClient = useQueryClient();
    const [date, setDate] = useState<string | null>(null);
    const [overriding, setOverriding] = useState<AdminOpeningRow | null>(null);
    const [switching, setSwitching] = useState<AdminOpeningRow | null>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['openings', date],
        queryFn: () => openingService.listForDay(date ?? undefined),
        refetchInterval: 60_000,
    });

    const isToday = !date || date === data?.today;
    const rows = data?.branches ?? [];
    // Late first, then waiting, then everything else, as the day wants them.
    const order = (r: AdminOpeningRow) =>
        r.is_late && !r.opened_at ? 0 : r.status === 'open_with_problems' ? 1 : r.status === 'in_progress' || r.status === 'not_started' ? 2 : 3;
    const sorted = [...rows].sort((a, b) => order(a) - order(b) || a.branch.name.localeCompare(b.branch.name));

    async function setRequirement(row: AdminOpeningRow, required: boolean) {
        try {
            await openingService.setRequirement(row.branch.id, required);
            toast.success(required ? `${row.branch.name} now opens with the checklist.` : `${row.branch.name} no longer uses the checklist.`);
            queryClient.invalidateQueries({ queryKey: ['openings'] });
            queryClient.invalidateQueries({ queryKey: ['branches'] });
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setSwitching(null);
        }
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
            <PageHeader
                title="Openings"
                subtitle={data ? `How each branch started ${isToday ? 'today' : dayLabel(data.business_date)}.` : undefined}
            />
            <OpeningsTabs />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <label htmlFor="opening-day" className="text-sm font-body text-text-dark">Day</label>
                <input
                    id="opening-day"
                    type="date"
                    value={date ?? data?.today ?? ''}
                    max={data?.today}
                    onChange={(e) => setDate(e.target.value || null)}
                    className="min-h-11 rounded-xl border border-[#e3e1de] bg-[#f5f4f2] px-3 text-sm font-body text-text-dark tabular-nums focus:outline-none focus:border-primary"
                />
                {!isToday && (
                    <button type="button" onClick={() => setDate(null)} className="min-h-11 text-sm font-semibold font-body text-primary hover:underline cursor-pointer">
                        Back to today
                    </button>
                )}
            </div>

            {isLoading && <SpinnerIcon className="h-6 w-6 animate-spin text-primary" />}
            {error && <p className="text-sm font-body text-rose-700">{(error as Error).message}</p>}

            {rows.length > 0 && (
                <ul className="divide-y divide-[#f0e8d8] rounded-2xl border border-[#f0e8d8] bg-neutral-card px-4">
                    {sorted.map((row) => {
                        const tone = statusTone(row.status, row.is_late);
                        const canOverride = isToday && row.required && row.schedule.trading_day && !row.opened_at;
                        return (
                            <li key={row.branch.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                                <div className="min-w-0 flex-1 basis-72">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-base font-semibold font-body text-text-dark">{row.branch.name}</p>
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold font-body ${tone.bg} ${tone.text}`}>
                                            {row.is_late && !row.opened_at ? 'Late' : STATUS_LABEL[row.status]}
                                        </span>
                                        {row.is_late && row.opened_at && (
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold font-body ${TONE.problemSettled.bg} ${TONE.problemSettled.text}`}>
                                                Opened late
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-sm font-body text-neutral-gray">{describeOpening(row)}</p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    {canOverride && (
                                        <button type="button" onClick={() => setOverriding(row)}
                                            className="min-h-11 rounded-xl border border-[#e3ddd0] bg-white px-4 text-sm font-semibold font-body text-text-dark hover:border-neutral-gray/50 cursor-pointer">
                                            Open without the checklist
                                        </button>
                                    )}
                                    {row.id && (
                                        <Link href={`/admin/openings/${row.id}`}
                                            className="min-h-11 inline-flex items-center rounded-xl px-4 text-sm font-semibold font-body text-primary hover:underline">
                                            View
                                        </Link>
                                    )}
                                    {isToday && (
                                        <div className="min-h-11 flex items-center">
                                            <Toggle
                                                checked={row.requires_opening_checklist}
                                                onChange={(on) => (on ? setSwitching(row) : setRequirement(row, false))}
                                                label="Uses the checklist"
                                            />
                                        </div>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {overriding && (
                <OverrideDialog
                    branchId={overriding.branch.id}
                    branchName={overriding.branch.name}
                    isOpen
                    onClose={() => setOverriding(null)}
                />
            )}

            <InventoryModal isOpen={switching !== null} onClose={() => setSwitching(null)} title={`Switch ${switching?.branch.name ?? ''} onto the checklist?`}>
                <p className="text-sm font-body text-text-dark">
                    From now on {switching?.branch.name} sells nothing each day until its manager opens it with the checklist.
                </p>
                <p className="mt-2 text-sm font-body text-text-dark">
                    If it is trading right now, its till locks at once until someone opens it. Check that it has a manager
                    assigned first.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={() => setSwitching(null)}
                        className="min-h-11 rounded-xl px-4 text-sm font-semibold font-body text-neutral-gray hover:text-text-dark cursor-pointer">
                        Cancel
                    </button>
                    <button type="button" onClick={() => switching && setRequirement(switching, true)}
                        className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold font-body text-white hover:bg-primary/90 cursor-pointer">
                        Switch it on
                    </button>
                </div>
            </InventoryModal>
        </div>
    );
}
