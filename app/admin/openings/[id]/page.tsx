'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftIcon, ClockIcon, DoorOpenIcon, ListChecksIcon, WarningCircleIcon, WarningIcon } from '@phosphor-icons/react';
import { TONE } from '@/app/inventory/_components/status-tokens';
import { OverrideDialog } from '@/app/components/opening/OverrideDialog';
import { PhotoStrip } from '@/app/components/opening/PhotoStrip';
import { clock, dayLabel } from '@/app/components/opening/openingFormat';
import { openingService } from '@/lib/api/services/opening.service';
import type { BranchOpening, OpeningAnswer } from '@/types/opening';
import { OpeningStatusBadge, Pill } from '../_components/OpeningStatusBadge';
import { graceRanOut } from '../_components/describe';

const VIA = { pos: ' at the till', portal: ' on the staff portal', admin: '' } as const;

/**
 * One branch's morning, as it was recorded: when it was due and when it
 * opened, what was admitted and how it was fixed, and every answer as given.
 */
export default function AdminOpeningDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [overriding, setOverriding] = useState(false);
    const { data: o, isLoading, error } = useQuery({
        queryKey: ['openings', 'detail', id],
        queryFn: () => openingService.show(Number(id)),
        refetchInterval: 60_000,
    });

    if (isLoading) return <DetailSkeleton />;
    if (error || !o) return <DetailMissing message={(error as Error)?.message} />;

    const problems = o.answers.filter((a) => a.answer === 'problem' && a.relevant !== false);
    const sections = groupAnswers(o.answers);
    // Only a live day is ever "not started" or "in progress"; a past one is history.
    const canOverride = o.required && (o.status === 'not_started' || o.status === 'in_progress');

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
            <Link
                href={`/admin/openings?day=${o.business_date}`}
                className="mb-4 inline-flex min-h-11 items-center gap-1.5 font-body text-sm text-neutral-gray transition-colors hover:text-text-dark"
            >
                <ArrowLeftIcon size={14} weight="bold" />
                All branches, {dayLabel(o.business_date)}
            </Link>

            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="font-brand text-2xl font-bold text-text-dark">{o.branch.name}</h1>
                        <OpeningStatusBadge opening={o} />
                        {o.is_override && o.status !== 'opened_by_head_office' && <Pill label="Opened by head office" tone={TONE.waiting} />}
                    </div>
                    <p className="mt-1 font-body text-sm text-neutral-gray">Opening for {dayLabel(o.business_date)}</p>
                </div>
                {canOverride && (
                    <button
                        type="button"
                        onClick={() => setOverriding(true)}
                        className="min-h-11 shrink-0 rounded-xl border border-[#e3ddd0] bg-neutral-card px-4 font-body text-sm font-semibold text-text-dark transition-colors hover:border-neutral-gray/50 cursor-pointer"
                    >
                        Open without the checklist
                    </button>
                )}
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetaCard
                    icon={<ClockIcon size={16} />}
                    label="Due"
                    value={o.schedule.trading_day && o.schedule.opens_at ? clock(o.schedule.opens_at) : 'Closed'}
                    hint={o.schedule.late_at ? `Late after ${clock(o.schedule.late_at)}` : undefined}
                />
                <MetaCard
                    icon={<DoorOpenIcon size={16} />}
                    label="Opened"
                    value={o.opened_at ? clock(o.opened_at) : 'Not yet'}
                    hint={o.opened_by ? `by ${o.opened_by}${o.is_override ? ', head office' : ''}` : undefined}
                    tone={o.is_late ? 'text-rose-700' : undefined}
                />
                <MetaCard
                    icon={<ListChecksIcon size={16} />}
                    label="Checklist"
                    value={o.started_at ? `${o.progress.answered} of ${o.progress.total}` : 'Not started'}
                    hint={o.completed_at ? `Finished ${clock(o.completed_at)}` : o.started_at ? `Started ${clock(o.started_at)} by ${o.started_by ?? 'the manager'}` : undefined}
                />
                <MetaCard
                    icon={<WarningIcon size={16} />}
                    label="Problems"
                    value={o.problems.total === 0 ? 'None' : o.problems.outstanding > 0 ? `${o.problems.outstanding} to fix` : `${o.problems.total}, all fixed`}
                    hint={problemsHint(o)}
                    tone={o.problems.outstanding > 0 ? (graceRanOut(o) ? 'text-rose-700' : 'text-amber-700') : undefined}
                />
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
                {(problems.length > 0 || o.unresolved_note) && (
                    <section className="overflow-hidden rounded-2xl border border-[#f0e8d8] bg-neutral-card lg:col-start-1">
                        <CardHead title="Problems admitted" count={problems.length} />
                        <ul className="divide-y divide-[#f0e8d8]">
                            {problems.map((a) => (
                                <li key={a.id} className="px-5 py-4">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <p className="min-w-0 flex-1 basis-56 font-body text-sm font-semibold text-text-dark">{a.label}</p>
                                        <span className="flex flex-wrap gap-1.5">
                                            {a.weight === 'must_pass' && <Pill label="Food safety" tone={TONE.problem} />}
                                            {a.resolved_at
                                                ? <Pill label={`Fixed ${clock(a.resolved_at)}`} tone={TONE.done} />
                                                : <Pill label="Not fixed" tone={TONE.waiting} />}
                                        </span>
                                    </div>
                                    {a.note && <Said caption="What was wrong" text={a.note} />}
                                    {a.resolution_note && <Said caption={`How ${a.resolved_by ?? 'the manager'} fixed it`} text={a.resolution_note} />}
                                    <div className="mt-3 empty:hidden">
                                        <PhotoStrip branchId={o.branch.id} answer={a} onChange={() => {}} readOnly />
                                    </div>
                                </li>
                            ))}
                            {o.unresolved_note && (
                                <li className="px-5 py-4">
                                    <Said caption="Note from the manager at opening" text={o.unresolved_note} />
                                </li>
                            )}
                        </ul>
                    </section>
                )}

                <aside className="overflow-hidden rounded-2xl border border-[#f0e8d8] bg-neutral-card lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
                    <CardHead title="What happened" />
                    <Timeline opening={o} problems={problems} />
                </aside>

                <div className="space-y-5 lg:col-start-1">
                    {sections.length === 0 ? (
                        <div className="rounded-2xl border border-[#f0e8d8] bg-neutral-card px-6 py-12 text-center">
                            <p className="font-body text-sm text-neutral-gray">
                                {o.started_at ? 'No answers yet.' : 'Nobody has started the checklist.'}
                            </p>
                        </div>
                    ) : (
                        sections.map(({ section, groups, asked, problems: n }) => (
                            <section key={section} className="overflow-hidden rounded-2xl border border-[#f0e8d8] bg-neutral-card">
                                <CardHead
                                    title={section}
                                    aside={`${asked} asked${n ? `, ${n} ${n === 1 ? 'problem' : 'problems'}` : ''}`}
                                />
                                {groups.map(({ group, answers }) => (
                                    <div key={group}>
                                        <p className="bg-neutral-light/60 px-5 py-2 font-body text-[11px] font-semibold uppercase tracking-wider text-neutral-gray">
                                            {group}
                                        </p>
                                        <ul className="divide-y divide-[#f0e8d8]">
                                            {answers.map((a) => <AnswerLine key={a.id} answer={a} />)}
                                        </ul>
                                    </div>
                                ))}
                            </section>
                        ))
                    )}
                </div>
            </div>

            {overriding && (
                <OverrideDialog
                    branchId={o.branch.id}
                    branchName={o.branch.name}
                    isOpen
                    onClose={() => setOverriding(false)}
                />
            )}
        </div>
    );
}

// ─── The record ───────────────────────────────────────────────────────────────

function AnswerLine({ answer: a }: { answer: OpeningAnswer }) {
    if (a.kind === 'text') {
        return (
            <li className="px-5 py-3">
                <p className="font-body text-xs text-neutral-gray">{a.label}</p>
                <p className="mt-0.5 whitespace-pre-line font-body text-sm text-text-dark">{a.value}</p>
            </li>
        );
    }

    return (
        <li className="flex items-start justify-between gap-4 px-5 py-3">
            <div className="min-w-0">
                <p className="font-body text-sm text-text-dark">{a.label}</p>
                {a.answer === 'problem' && a.note && <p className="mt-0.5 font-body text-xs text-neutral-gray">{a.note}</p>}
            </div>
            <span className="shrink-0 pt-px">
                <AnswerValue answer={a} />
            </span>
        </li>
    );
}

function AnswerValue({ answer: a }: { answer: OpeningAnswer }) {
    if (a.kind === 'number') {
        return a.value !== null && a.value !== ''
            ? <span className="font-body text-sm font-semibold tabular-nums text-text-dark">{a.value}</span>
            : <span className="font-body text-sm text-amber-700">Not answered</span>;
    }
    switch (a.answer) {
        case 'ok':
            return <span className="font-body text-sm text-neutral-gray">Yes</span>;
        case 'na':
            return <span className="font-body text-sm text-neutral-gray">Not needed</span>;
        case 'problem':
            return a.resolved_at ? <Pill label="Fixed" tone={TONE.done} /> : <Pill label="Problem" tone={TONE.problem} />;
        default:
            return <span className="font-body text-sm text-amber-700">Not answered</span>;
    }
}

type Event = { at: string; text: string; note?: string | null; muted?: boolean };

/** Every moment of the morning, in the order it happened. */
function Timeline({ opening: o, problems }: { opening: BranchOpening; problems: OpeningAnswer[] }) {
    const events: Event[] = [];

    if (o.schedule.trading_day && o.schedule.opens_at) events.push({ at: o.schedule.opens_at, text: 'Due to open.', muted: true });
    if (o.started_at) events.push({ at: o.started_at, text: `${o.started_by ?? 'The manager'} started the checklist.` });
    if (o.is_override && o.opened_at) {
        events.push({ at: o.opened_at, text: `${o.opened_by} opened it from head office, without the checklist.`, note: o.override_reason });
    }
    if (o.completed_at) {
        events.push({
            at: o.completed_at,
            text: o.is_override
                ? `${o.completed_by} finished the checklist.`
                : `${o.completed_by} finished the checklist and opened the branch${o.opened_via ? VIA[o.opened_via] : ''}.`,
        });
    }
    for (const p of problems) {
        if (p.resolved_at) events.push({ at: p.resolved_at, text: `${p.resolved_by ?? 'The manager'} fixed ${p.short}.` });
    }
    if (o.problems.outstanding > 0 && o.grace_ends_at) {
        const ran = graceRanOut(o);
        events.push({
            at: o.grace_ends_at,
            text: ran ? `The hour to fix ran out with ${o.problems.outstanding} unfixed.` : 'The hour to fix ends.',
            muted: !ran,
        });
    }

    events.sort((a, b) => a.at.localeCompare(b.at));

    if (events.length === 0) {
        return <p className="px-5 py-6 font-body text-sm text-neutral-gray">Nothing yet.</p>;
    }

    return (
        <ol className="divide-y divide-[#f0e8d8]">
            {events.map((e) => (
                <li key={`${e.at}-${e.text}`} className="flex gap-3 px-5 py-3">
                    <span className="w-16 shrink-0 pt-px font-body text-xs tabular-nums text-neutral-gray">{clock(e.at)}</span>
                    <div className="min-w-0">
                        <p className={`font-body text-sm ${e.muted ? 'text-neutral-gray' : 'text-text-dark'}`}>{e.text}</p>
                        {e.note && <p className="mt-0.5 font-body text-xs text-neutral-gray">{e.note}</p>}
                    </div>
                </li>
            ))}
        </ol>
    );
}

function problemsHint(o: BranchOpening): string | undefined {
    if (o.problems.outstanding > 0 && o.grace_ends_at) {
        return graceRanOut(o) ? `Hour ran out at ${clock(o.grace_ends_at)}` : `Fix by ${clock(o.grace_ends_at)}`;
    }
    if (o.problems.total > 0 && o.problems_resolved_at) return `Last fixed ${clock(o.problems_resolved_at)}`;
    return undefined;
}

/**
 * Answers by section, then by set, as the manager met them. Lines not asked
 * that morning, and notes left empty, are left out.
 */
function groupAnswers(answers: OpeningAnswer[]) {
    const sections = new Map<string, Map<string, OpeningAnswer[]>>();
    for (const a of answers) {
        if (a.relevant === false) continue;
        if (a.kind === 'text' && !a.value) continue;
        const group = a.group ?? 'Notes';
        if (!sections.has(a.section)) sections.set(a.section, new Map());
        const groups = sections.get(a.section)!;
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group)!.push(a);
    }
    return [...sections.entries()].map(([section, groups]) => {
        const all = [...groups.values()].flat();
        return {
            section,
            groups: [...groups.entries()].map(([group, list]) => ({ group, answers: list })),
            asked: all.filter((a) => a.kind !== 'text').length,
            problems: all.filter((a) => a.answer === 'problem').length,
        };
    });
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function CardHead({ title, count, aside }: { title: string; count?: number; aside?: string }) {
    return (
        <div className="flex items-baseline justify-between gap-3 border-b border-[#f0e8d8] px-5 py-4">
            <h2 className="font-body text-sm font-semibold text-text-dark">
                {title}
                {count !== undefined && <span className="font-normal text-neutral-gray"> ({count})</span>}
            </h2>
            {aside && <p className="shrink-0 font-body text-xs text-neutral-gray tabular-nums">{aside}</p>}
        </div>
    );
}

/** A caption over what somebody wrote. */
function Said({ caption, text }: { caption: string; text: string }) {
    return (
        <div className="mt-2">
            <p className="font-body text-xs text-neutral-gray">{caption}</p>
            <p className="mt-0.5 whitespace-pre-line font-body text-sm text-text-dark">{text}</p>
        </div>
    );
}

function MetaCard({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint?: string; tone?: string }) {
    return (
        <div className="rounded-2xl border border-[#f0e8d8] bg-neutral-card p-4">
            <div className="mb-1.5 flex items-center gap-1.5 font-body text-[10px] font-semibold uppercase tracking-wider text-neutral-gray">
                <span className="text-neutral-gray/70">{icon}</span>
                {label}
            </div>
            <p className={`truncate font-body text-sm font-semibold tabular-nums ${tone ?? 'text-text-dark'}`}>{value}</p>
            {hint && <p className="mt-0.5 truncate font-body text-[11px] text-neutral-gray">{hint}</p>}
        </div>
    );
}

function DetailSkeleton() {
    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
            <div className="mb-4 h-4 w-40 animate-pulse rounded bg-neutral-light" />
            <div className="mb-2 h-8 w-56 animate-pulse rounded bg-neutral-light" />
            <div className="mb-6 h-4 w-44 animate-pulse rounded bg-neutral-light" />
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded-2xl bg-neutral-light" />
                ))}
            </div>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="h-80 animate-pulse rounded-2xl bg-neutral-light" />
                <div className="h-56 animate-pulse rounded-2xl bg-neutral-light" />
            </div>
        </div>
    );
}

function DetailMissing({ message }: { message?: string }) {
    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
            <Link
                href="/admin/openings"
                className="mb-4 inline-flex min-h-11 items-center gap-1.5 font-body text-sm text-neutral-gray transition-colors hover:text-text-dark"
            >
                <ArrowLeftIcon size={14} weight="bold" />
                All branches
            </Link>
            <div className="flex flex-col items-center rounded-2xl border border-[#f0e8d8] bg-neutral-card py-16 text-center">
                <WarningCircleIcon size={40} weight="thin" className="mb-3 text-neutral-gray/40" />
                <p className="font-body font-medium text-text-dark">This opening could not be found.</p>
                {message && <p className="mt-1 max-w-sm font-body text-sm text-neutral-gray">{message}</p>}
            </div>
        </div>
    );
}
