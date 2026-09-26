'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowCounterClockwiseIcon, CaretLeftIcon, CaretRightIcon, DoorOpenIcon, KeyIcon } from '@phosphor-icons/react';
import {
    DataTable,
    FilterBar,
    InventoryModal,
    PageHeader,
    RowActionsMenu,
    type DataTableColumn,
    type RowAction,
} from '@/app/inventory/_components';
import { OverrideDialog } from '@/app/components/opening/OverrideDialog';
import { clock, dayLabel } from '@/app/components/opening/openingFormat';
import { openingService } from '@/lib/api/services/opening.service';
import { toast } from '@/lib/utils/toast';
import type { AdminOpeningRow } from '@/types/opening';
import { KillSwitchNotice } from './KillSwitchNotice';
import { OpeningStatusBadge } from './OpeningStatusBadge';
import { OpeningsTabs } from './OpeningsTabs';
import { closedThatDay, describeOpening, graceRanOut, isLateNow, offChecklist, summarise, urgency, who } from './describe';

/** "2026-09-25" moved by whole days, without asking the device what day it is. */
function shiftDay(iso: string, days: number): string {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

/**
 * How every branch on the checklist started one day, today by default.
 *
 * The rows come in the order head office needs them: late first, then
 * problems still to fix, then the rest. The day lives in the address, so a
 * branch opened from here comes back to the same day.
 */
export function MorningsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const queryClient = useQueryClient();
    const day = params.get('day');

    const [overriding, setOverriding] = useState<AdminOpeningRow | null>(null);
    const [resetting, setResetting] = useState<AdminOpeningRow | null>(null);

    const { data, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: ['openings', day],
        queryFn: () => openingService.listForDay(day ?? undefined),
        // Today moves; a past day does not.
        refetchInterval: (query) => (!day || day === query.state.data?.today ? 60_000 : false),
        placeholderData: keepPreviousData,
    });

    const today = data?.today;
    // The day asked for, not the one still on screen while it loads.
    const shown = day ?? today ?? '';
    const isToday = !day || day === today;
    const stale = isFetching && !isLoading && data?.business_date !== shown;
    const all = data?.branches ?? [];
    const rows = all.filter((r) => !offChecklist(r, isToday));
    const off = all.filter((r) => offChecklist(r, isToday));
    const killed = all.some((r) => r.requires_opening_checklist && !r.required);

    function go(next: string | null) {
        const target = next && next !== today ? `${pathname}?day=${next}` : pathname;
        router.replace(target, { scroll: false });
    }

    async function reset(row: AdminOpeningRow) {
        try {
            await openingService.reset(row.branch.id);
            toast.success(`${row.branch.name} can be opened again.`);
            queryClient.invalidateQueries({ queryKey: ['openings'] });
            queryClient.invalidateQueries({ queryKey: ['opening'] });
            queryClient.invalidateQueries({ queryKey: ['branches'] });
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setResetting(null);
        }
    }

    const canOverride = (r: AdminOpeningRow) => isToday && r.required && r.schedule.trading_day && !r.opened_at;

    const columns: DataTableColumn<AdminOpeningRow>[] = [
        {
            key: 'branch',
            header: 'Branch',
            sortValue: (r) => r.branch.name.toLowerCase(),
            cell: (r) => <p className="font-semibold text-text-dark">{r.branch.name}</p>,
        },
        {
            key: 'status',
            header: 'Status',
            sortValue: (r) => urgency(r),
            cell: (r) => <OpeningStatusBadge opening={r} />,
        },
        {
            key: 'opened',
            header: 'Opened',
            hideBelow: 'sm',
            sortValue: (r) => r.opened_at ?? `~${r.schedule.opens_at ?? ''}`,
            cell: (r) => <OpenedCell row={r} />,
        },
        {
            key: 'checklist',
            header: 'Checklist',
            hideBelow: 'md',
            sortValue: (r) => (r.completed_at ? 2 : r.started_at ? 1 : 0),
            cell: (r) => <ChecklistCell row={r} />,
        },
        {
            key: 'problems',
            header: 'Problems',
            hideBelow: 'sm',
            sortValue: (r) => r.problems.outstanding * 100 + r.problems.total,
            cell: (r) => <ProblemsCell row={r} />,
        },
        {
            key: 'actions',
            header: '',
            align: 'right',
            cell: (r) => {
                const actions: RowAction[] = [];
                if (canOverride(r) && !isLateNow(r)) {
                    actions.push({ label: 'Open without the checklist', icon: <KeyIcon size={15} />, onClick: () => setOverriding(r) });
                }
                if (isToday && data?.can_reset && (r.started_at || r.opened_at)) {
                    actions.push({ label: 'Reset for testing', icon: <ArrowCounterClockwiseIcon size={15} />, onClick: () => setResetting(r), destructive: true });
                }
                return (
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* Offered out loud only once it is late, the moment head
                            office may need it. Before that it waits in the menu. */}
                        {canOverride(r) && isLateNow(r) && (
                            <button
                                type="button"
                                onClick={() => setOverriding(r)}
                                className="min-h-11 whitespace-nowrap rounded-xl border border-[#e3ddd0] bg-neutral-card px-3.5 font-body text-xs font-semibold text-text-dark transition-colors hover:border-neutral-gray/50 cursor-pointer"
                            >
                                Open without the checklist
                            </button>
                        )}
                        {/* The slot is kept when empty so the buttons line up. */}
                        {actions.length > 0 ? <RowActionsMenu actions={actions} /> : <span className="w-7" aria-hidden />}
                    </div>
                );
            },
        },
    ];

    // A blank line while loading holds the header's height; the last day's
    // summary under the new day's date would be wrong, briefly but plainly.
    const subtitle = isLoading || stale ? ' ' : error && !data ? 'The openings could not be loaded.' : rows.length ? summarise(rows, isToday) : ' ';

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
            <PageHeader title="Openings" subtitle={subtitle} />
            <OpeningsTabs />

            <KillSwitchNotice rows={all} />

            <FilterBar>
                <div className="flex items-center gap-1">
                    <StepButton label="The day before" onClick={() => shown && go(shiftDay(shown, -1))} disabled={!shown}>
                        <CaretLeftIcon size={16} weight="bold" />
                    </StepButton>
                    <label htmlFor="opening-day" className="sr-only">Day</label>
                    <input
                        id="opening-day"
                        type="date"
                        value={shown}
                        max={today}
                        onChange={(e) => e.target.value && go(e.target.value)}
                        className="min-h-11 rounded-xl border border-[#f0e8d8] bg-neutral-card px-3 font-body text-sm text-text-dark tabular-nums transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                    />
                    <StepButton label="The day after" onClick={() => shown && go(shiftDay(shown, 1))} disabled={!shown || isToday}>
                        <CaretRightIcon size={16} weight="bold" />
                    </StepButton>
                </div>
                <p className="font-body text-sm font-semibold text-text-dark">
                    {shown ? (isToday ? `Today, ${dayLabel(shown)}` : dayLabel(shown)) : ''}
                </p>
                {!isToday && (
                    <button
                        type="button"
                        onClick={() => go(null)}
                        className="ml-auto min-h-11 rounded-xl px-3 font-body text-sm font-semibold text-primary hover:underline cursor-pointer"
                    >
                        Back to today
                    </button>
                )}
            </FilterBar>

            {error && !data ? (
                <div className="rounded-2xl border border-[#f0e8d8] bg-neutral-card px-6 py-12 text-center">
                    <p className="font-body text-sm font-semibold text-text-dark">The openings could not be loaded.</p>
                    <p className="mt-1 font-body text-sm text-neutral-gray">{(error as Error).message}</p>
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="mt-4 min-h-11 rounded-xl border border-[#e3ddd0] bg-neutral-card px-4 font-body text-sm font-semibold text-text-dark hover:border-neutral-gray/50 cursor-pointer"
                    >
                        Try again
                    </button>
                </div>
            ) : (
                <div className={`transition-opacity duration-150 ${stale ? 'opacity-60' : ''}`} aria-busy={stale}>
                    {/* A phone has no room for five columns: each branch is its sentence. */}
                    <div className="sm:hidden">
                        <PhoneList
                            rows={rows}
                            isLoading={isLoading}
                            empty={<Empty isToday={isToday} killed={killed} day={shown} />}
                            canOverride={canOverride}
                            canReset={(r) => !!(isToday && data?.can_reset && (r.started_at || r.opened_at))}
                            onOverride={setOverriding}
                            onReset={setResetting}
                        />
                    </div>
                    <div className="hidden sm:block">
                        <DataTable
                            data={rows}
                            columns={columns}
                            rowKey={(r) => r.branch.id}
                            isLoading={isLoading}
                            defaultSortKey="status"
                            pageSize={25}
                            onRowClick={(r) => r.id && router.push(`/admin/openings/${r.id}`)}
                            emptyState={<Empty isToday={isToday} killed={killed} day={shown} />}
                        />
                    </div>
                </div>
            )}

            {isToday && rows.length > 0 && off.length > 0 && (
                <p className="mt-3 font-body text-sm text-neutral-gray">
                    {who(off)} {off.length === 1 ? 'sells' : 'sell'} without the checklist.{' '}
                    <Link href="/admin/openings/branches" className="font-semibold text-primary hover:underline">
                        Choose branches
                    </Link>
                </p>
            )}

            {overriding && (
                <OverrideDialog
                    branchId={overriding.branch.id}
                    branchName={overriding.branch.name}
                    isOpen
                    onClose={() => setOverriding(null)}
                />
            )}

            <InventoryModal isOpen={resetting !== null} onClose={() => setResetting(null)} title={`Reset ${resetting?.branch.name ?? ''} for testing?`}>
                <p className="font-body text-sm text-text-dark">
                    Today&apos;s opening is thrown away: every answer, every photo, and the time it opened. The till locks
                    again until someone opens the branch, so the morning can be run from the start.
                </p>
                <p className="mt-2 font-body text-sm text-neutral-gray">This only works on beta. Production refuses it.</p>
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={() => setResetting(null)}
                        className="min-h-11 rounded-xl px-4 font-body text-sm font-semibold text-neutral-gray hover:text-text-dark cursor-pointer">
                        Cancel
                    </button>
                    <button type="button" onClick={() => resetting && reset(resetting)}
                        className="min-h-11 rounded-xl bg-primary px-5 font-body text-sm font-semibold text-white hover:bg-primary/90 cursor-pointer">
                        Reset it
                    </button>
                </div>
            </InventoryModal>
        </div>
    );
}

// ─── Phone ────────────────────────────────────────────────────────────────────

function PhoneList({
    rows,
    isLoading,
    empty,
    canOverride,
    canReset,
    onOverride,
    onReset,
}: {
    rows: AdminOpeningRow[];
    isLoading: boolean;
    empty: React.ReactNode;
    canOverride: (r: AdminOpeningRow) => boolean;
    canReset: (r: AdminOpeningRow) => boolean;
    onOverride: (r: AdminOpeningRow) => void;
    onReset: (r: AdminOpeningRow) => void;
}) {
    if (isLoading) {
        return (
            <div className="space-y-2 rounded-2xl border border-[#f0e8d8] bg-neutral-card p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-light" />
                ))}
            </div>
        );
    }

    if (rows.length === 0) return <div className="rounded-2xl border border-[#f0e8d8] bg-neutral-card">{empty}</div>;

    const sorted = [...rows].sort((a, b) => urgency(a) - urgency(b) || a.branch.name.localeCompare(b.branch.name));

    return (
        <ul className="divide-y divide-[#f0e8d8] overflow-hidden rounded-2xl border border-[#f0e8d8] bg-neutral-card">
            {sorted.map((r) => {
                const head = (
                    <>
                        <span className="flex items-start justify-between gap-3">
                            <span className="font-body text-sm font-semibold text-text-dark">{r.branch.name}</span>
                            <OpeningStatusBadge opening={r} />
                        </span>
                        <span className="mt-1 block font-body text-xs text-neutral-gray">{describeOpening(r)}</span>
                    </>
                );
                const late = canOverride(r) && isLateNow(r);
                const reset = canReset(r);
                return (
                    <li key={r.branch.id}>
                        {r.id ? (
                            <Link href={`/admin/openings/${r.id}`} className="block px-4 py-3.5 transition-colors active:bg-primary/5">
                                {head}
                            </Link>
                        ) : (
                            <div className="px-4 py-3.5">{head}</div>
                        )}
                        {(late || reset) && (
                            <div className="flex flex-wrap gap-2 px-4 pb-3.5">
                                {late && (
                                    <button
                                        type="button"
                                        onClick={() => onOverride(r)}
                                        className="min-h-11 flex-1 rounded-xl border border-[#e3ddd0] bg-neutral-card px-4 font-body text-sm font-semibold text-text-dark cursor-pointer"
                                    >
                                        Open without the checklist
                                    </button>
                                )}
                                {reset && (
                                    <button
                                        type="button"
                                        onClick={() => onReset(r)}
                                        className="min-h-11 rounded-xl px-3 font-body text-sm font-semibold text-rose-700 cursor-pointer"
                                    >
                                        Reset for testing
                                    </button>
                                )}
                            </div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

// ─── Cells ────────────────────────────────────────────────────────────────────

function OpenedCell({ row }: { row: AdminOpeningRow }) {
    if (row.opened_at) {
        return (
            <div>
                <p className="tabular-nums text-text-dark">{clock(row.opened_at)}</p>
                {row.opened_by && <p className="mt-0.5 text-xs text-neutral-gray">by {row.opened_by}</p>}
            </div>
        );
    }
    if (closedThatDay(row) || !row.schedule.opens_at) return <Dash />;
    return <p className="whitespace-nowrap tabular-nums text-neutral-gray">Due {clock(row.schedule.opens_at)}</p>;
}

function ChecklistCell({ row }: { row: AdminOpeningRow }) {
    if (row.completed_at) {
        return (
            <div>
                <p className="whitespace-nowrap tabular-nums text-text-dark">Finished {clock(row.completed_at)}</p>
                {row.completed_by && <p className="mt-0.5 text-xs text-neutral-gray">by {row.completed_by}</p>}
            </div>
        );
    }
    if (row.started_at) {
        return (
            <div>
                <p className="whitespace-nowrap tabular-nums text-text-dark">
                    {row.progress.answered} of {row.progress.total} answered
                </p>
                <p className="mt-0.5 text-xs text-neutral-gray">
                    {row.opened_at ? 'Still to finish' : `Started ${clock(row.started_at)}`}
                </p>
            </div>
        );
    }
    if (closedThatDay(row)) return <Dash />;
    return <p className="text-neutral-gray">Not started</p>;
}

function ProblemsCell({ row }: { row: AdminOpeningRow }) {
    const { outstanding, total } = row.problems;
    if (outstanding > 0) {
        const overdue = graceRanOut(row);
        return (
            <div>
                <p className={`whitespace-nowrap font-semibold tabular-nums ${overdue ? 'text-rose-700' : 'text-amber-700'}`}>
                    {outstanding} to fix
                </p>
                {row.grace_ends_at && (
                    <p className="mt-0.5 whitespace-nowrap text-xs text-neutral-gray">
                        {overdue ? `Hour ran out at ${clock(row.grace_ends_at)}` : `by ${clock(row.grace_ends_at)}`}
                    </p>
                )}
            </div>
        );
    }
    if (total > 0) return <p className="whitespace-nowrap tabular-nums text-neutral-gray">{total}, all fixed</p>;
    if (row.completed_at) return <p className="text-neutral-gray">None</p>;
    return <Dash />;
}

function Dash() {
    return <span className="text-neutral-gray/60">-</span>;
}

function StepButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-neutral-gray transition-colors hover:bg-neutral-light hover:text-text-dark cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
        >
            {children}
        </button>
    );
}

function Empty({ isToday, killed, day }: { isToday: boolean; killed: boolean; day: string }) {
    if (killed && isToday) {
        return (
            <div className="px-6 py-14 text-center">
                <p className="font-body text-sm font-semibold text-text-dark">Nothing to watch while openings are switched off.</p>
            </div>
        );
    }

    if (!isToday) {
        return (
            <div className="px-6 py-14 text-center">
                <p className="font-body text-sm font-semibold text-text-dark">No branch used the checklist {day ? `on ${dayLabel(day)}` : 'that day'}.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center px-6 py-14 text-center">
            <DoorOpenIcon size={40} weight="thin" className="mb-3 text-neutral-gray/40" />
            <p className="font-body text-sm font-semibold text-text-dark">No branch opens with the checklist yet.</p>
            <p className="mt-1 max-w-sm font-body text-sm text-neutral-gray">
                A branch switched on sells nothing each day until its manager opens it.
            </p>
            <Link
                href="/admin/openings/branches"
                className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-body text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
                Choose branches
            </Link>
        </div>
    );
}
