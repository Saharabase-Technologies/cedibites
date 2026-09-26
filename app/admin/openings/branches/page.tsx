'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/app/inventory/_components/PageHeader';
import { Toggle } from '@/app/inventory/_components/FormPrimitives';
import { clock } from '@/app/components/opening/openingFormat';
import { openingService } from '@/lib/api/services/opening.service';
import { serverNow } from '@/lib/utils/serverClock';
import { toast } from '@/lib/utils/toast';
import type { AdminOpeningRow } from '@/types/opening';
import { KillSwitchNotice } from '../_components/KillSwitchNotice';
import { OpeningsTabs } from '../_components/OpeningsTabs';

/**
 * Which branches open with the checklist.
 *
 * Switching one on can lock a till that is selling, so it is confirmed under
 * the row, saying what will happen to that branch now. Switching off is one
 * tap: it only ever lets a branch sell.
 */
export default function OpeningBranchesPage() {
    const queryClient = useQueryClient();
    const [confirming, setConfirming] = useState<number | null>(null);
    const [busy, setBusy] = useState<number | null>(null);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['openings', null],
        queryFn: () => openingService.listForDay(),
        refetchInterval: 60_000,
    });

    const rows = [...(data?.branches ?? [])].sort((a, b) => a.branch.name.localeCompare(b.branch.name));
    const on = rows.filter((r) => r.requires_opening_checklist).length;

    async function setRequirement(row: AdminOpeningRow, required: boolean) {
        setBusy(row.branch.id);
        try {
            await openingService.setRequirement(row.branch.id, required);
            toast.success(required ? `${row.branch.name} now opens with the checklist.` : `${row.branch.name} no longer uses the checklist.`);
            await queryClient.invalidateQueries({ queryKey: ['openings'] });
            queryClient.invalidateQueries({ queryKey: ['branches'] });
            setConfirming(null);
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setBusy(null);
        }
    }

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
            <PageHeader title="Openings" subtitle="A branch switched on sells nothing each day until its manager opens it." />
            <OpeningsTabs />

            <KillSwitchNotice rows={rows} />

            <div className="max-w-3xl overflow-hidden rounded-2xl border border-[#f0e8d8] bg-neutral-card">
                <div className="flex items-center justify-between gap-4 border-b border-[#f0e8d8] px-5 py-3">
                    <p className="font-body text-[10px] font-bold uppercase tracking-wider text-neutral-gray">Branch</p>
                    <p className="font-body text-[10px] font-bold uppercase tracking-wider text-neutral-gray">Uses the checklist</p>
                </div>

                {isLoading && (
                    <div className="space-y-2 p-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-12 animate-pulse rounded-lg bg-neutral-light" />
                        ))}
                    </div>
                )}

                {error && !data && (
                    <div className="px-6 py-10 text-center">
                        <p className="font-body text-sm font-semibold text-text-dark">The branches could not be loaded.</p>
                        <button
                            type="button"
                            onClick={() => refetch()}
                            className="mt-3 min-h-11 rounded-xl border border-[#e3ddd0] bg-neutral-card px-4 font-body text-sm font-semibold text-text-dark hover:border-neutral-gray/50 cursor-pointer"
                        >
                            Try again
                        </button>
                    </div>
                )}

                <ul className="divide-y divide-[#f0e8d8]">
                    {rows.map((row) => (
                        <li key={row.branch.id} className="px-5 py-3">
                            <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="font-body text-sm font-semibold text-text-dark">{row.branch.name}</p>
                                    <p className="mt-0.5 font-body text-xs text-neutral-gray tabular-nums">{hours(row)}</p>
                                </div>
                                <div className="flex min-h-11 items-center">
                                    <Toggle
                                        checked={row.requires_opening_checklist}
                                        disabled={busy === row.branch.id}
                                        ariaLabel={`${row.branch.name} uses the checklist`}
                                        onChange={(next) => (next ? setConfirming(row.branch.id) : setRequirement(row, false))}
                                    />
                                </div>
                            </div>

                            {confirming === row.branch.id && !row.requires_opening_checklist && (
                                <div className="mt-3 rounded-xl bg-neutral-light/70 p-4">
                                    <p className="font-body text-sm text-text-dark">{consequence(row)}</p>
                                    <p className="mt-1 font-body text-sm text-neutral-gray">Check it has a manager assigned first.</p>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setRequirement(row, true)}
                                            disabled={busy === row.branch.id}
                                            className="min-h-11 rounded-xl bg-primary px-5 font-body text-sm font-semibold text-white transition-colors hover:bg-primary/90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {busy === row.branch.id ? 'Switching on...' : `Switch ${row.branch.name} on`}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirming(null)}
                                            className="min-h-11 rounded-xl px-4 font-body text-sm font-semibold text-neutral-gray hover:text-text-dark cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>

                {data && (
                    <p className="border-t border-[#f0e8d8] px-5 py-2.5 font-body text-xs text-neutral-gray">
                        {on === 0 ? 'None switched on yet.' : `${on} of ${rows.length} switched on.`}
                    </p>
                )}
            </div>
        </div>
    );
}

/** Today's hours, as the branch has them set. */
function hours(row: AdminOpeningRow): string {
    const s = row.schedule;
    if (!s.trading_day) return 'Closed today.';
    if (!s.opens_at) return 'No opening time set for today.';
    return s.closes_at ? `Open ${clock(s.opens_at)} to ${clock(s.closes_at)} today.` : `Opens at ${clock(s.opens_at)} today.`;
}

/** What switching this branch on does to it right now, from the server's clock. */
function consequence(row: AdminOpeningRow): string {
    const s = row.schedule;
    const now = serverNow();
    const trading = s.trading_day && s.opens_at && new Date(s.opens_at) <= now && (!s.closes_at || now < new Date(s.closes_at));

    if (trading) {
        return `${row.branch.name} is selling now. Its till locks the moment it is switched on, until someone opens it with the checklist.`;
    }
    if (s.trading_day && s.opens_at && now < new Date(s.opens_at)) {
        const from = s.checklist_from && now < new Date(s.checklist_from) ? `at ${clock(s.checklist_from)}` : 'now';
        return `From today, ${row.branch.name} sells nothing until it is opened. Its manager can start the checklist ${from}.`;
    }
    return `From its next trading day, ${row.branch.name} sells nothing until its manager opens it with the checklist.`;
}
