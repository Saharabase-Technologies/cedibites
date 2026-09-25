'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftIcon, SpinnerIcon } from '@phosphor-icons/react';
import { PageHeader } from '@/app/inventory/_components/PageHeader';
import { TONE } from '@/app/inventory/_components/status-tokens';
import { PhotoStrip } from '@/app/components/opening/PhotoStrip';
import { STATUS_LABEL, clock, dayLabel, statusTone } from '@/app/components/opening/openingFormat';
import { openingService } from '@/lib/api/services/opening.service';
import type { OpeningAnswer } from '@/types/opening';
import { OpeningsTabs } from '../_components/OpeningsTabs';
import { describeOpening } from '../_components/describe';

const ANSWER_LABEL = { ok: 'Yes', problem: 'Problem', na: 'Not needed' } as const;

/**
 * One branch's morning, as it was recorded: who started, who opened, what was
 * admitted and how it was fixed, and every answer as it was given.
 */
export default function AdminOpeningDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { data: o, isLoading, error } = useQuery({
        queryKey: ['openings', 'detail', id],
        queryFn: () => openingService.show(Number(id)),
    });

    if (isLoading) return <div className="p-8"><SpinnerIcon className="h-6 w-6 animate-spin text-primary" /></div>;
    if (error || !o) return <p className="p-8 text-sm font-body text-rose-700">{(error as Error)?.message ?? 'Not found.'}</p>;

    const tone = statusTone(o.status, o.is_late);
    const problems = o.answers.filter((a) => a.answer === 'problem' && a.relevant !== false);
    const sections = groupBySection(o.answers);

    const timeline: { at: string | null; text: string }[] = [
        { at: o.started_at, text: `${o.started_by ?? 'The manager'} started the checklist.` },
        { at: o.is_override ? o.opened_at : null, text: `${o.opened_by} opened the branch without the checklist. Reason: ${o.override_reason}` },
        { at: o.completed_at, text: o.is_override ? `${o.completed_by} finished the checklist.` : `${o.completed_by} finished the checklist and opened the branch.` },
        { at: o.problems_resolved_at, text: 'Every problem admitted at opening was fixed.' },
    ].filter((e) => e.at) as { at: string; text: string }[];

    return (
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
            <Link href="/admin/openings" className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold font-body text-neutral-gray hover:text-text-dark">
                <ArrowLeftIcon size={14} /> All branches
            </Link>
            <PageHeader title={`${o.branch.name}, ${dayLabel(o.business_date)}`} subtitle={describeOpening(o)} />
            <OpeningsTabs />

            <div className="mb-6 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold font-body ${tone.bg} ${tone.text}`}>{STATUS_LABEL[o.status]}</span>
                {o.is_late && (
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold font-body ${TONE.problem.bg} ${TONE.problem.text}`}>
                        {o.opened_at ? 'Opened late' : 'Late'}
                    </span>
                )}
                {o.is_override && (
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold font-body ${TONE.waiting.bg} ${TONE.waiting.text}`}>
                        Opened without the checklist
                    </span>
                )}
            </div>

            {timeline.length > 0 && (
                <section className="mb-6">
                    <h2 className="mb-2 font-brand text-lg text-text-dark">What happened</h2>
                    <ol className="divide-y divide-[#f0e8d8] rounded-2xl border border-[#f0e8d8] bg-neutral-card px-4">
                        {timeline.map((e) => (
                            <li key={e.text} className="flex gap-4 py-3 text-sm font-body">
                                <span className="w-16 shrink-0 tabular-nums text-neutral-gray">{clock(e.at)}</span>
                                <span className="text-text-dark">{e.text}</span>
                            </li>
                        ))}
                    </ol>
                    {o.unresolved_note && (
                        <p className="mt-3 text-sm font-body text-text-dark">
                            <span className="font-semibold">Note from the manager:</span> {o.unresolved_note}
                        </p>
                    )}
                </section>
            )}

            {problems.length > 0 && (
                <section className="mb-6">
                    <h2 className="mb-2 font-brand text-lg text-text-dark">Problems admitted</h2>
                    <ul className="divide-y divide-[#f0e8d8] rounded-2xl border border-[#f0e8d8] bg-neutral-card px-4">
                        {problems.map((a) => (
                            <li key={a.id} className="py-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold font-body text-text-dark">{a.label}</p>
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold font-body ${a.resolved_at ? `${TONE.done.bg} ${TONE.done.text}` : `${TONE.waiting.bg} ${TONE.waiting.text}`}`}>
                                        {a.resolved_at ? `Fixed at ${clock(a.resolved_at)}` : 'Not fixed'}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm font-body text-text-dark">{a.note}</p>
                                {a.resolution_note && (
                                    <p className="mt-1 text-sm font-body text-neutral-gray">Fixed by {a.resolved_by}: {a.resolution_note}</p>
                                )}
                                <div className="mt-2"><PhotoStrip branchId={o.branch.id} answer={a} onChange={() => {}} readOnly /></div>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {sections.map(([section, answers]) => (
                <section key={section} className="mb-6">
                    <h2 className="mb-2 font-brand text-lg text-text-dark">{section}</h2>
                    <ul className="divide-y divide-[#f0e8d8] rounded-2xl border border-[#f0e8d8] bg-neutral-card px-4">
                        {answers.map((a) => (
                            <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
                                <span className="min-w-0 flex-1 basis-60 text-sm font-body text-text-dark">{a.label}</span>
                                <span className="text-sm font-body text-neutral-gray tabular-nums">{answerText(a)}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}

function answerText(a: OpeningAnswer): string {
    if (a.kind === 'check') {
        if (!a.answer) return 'Not answered';
        return a.answer === 'problem' && a.note ? `Problem: ${a.note}` : ANSWER_LABEL[a.answer];
    }
    return a.value ?? (a.kind === 'number' ? 'Not answered' : '');
}

function groupBySection(answers: OpeningAnswer[]): [string, OpeningAnswer[]][] {
    const map = new Map<string, OpeningAnswer[]>();
    for (const a of answers) {
        // Not asked that morning: "cover for absent staff" when nobody was.
        if (a.relevant === false) continue;
        if (a.kind === 'text' && !a.value) continue;
        if (!map.has(a.section)) map.set(a.section, []);
        map.get(a.section)!.push(a);
    }
    return [...map.entries()];
}
