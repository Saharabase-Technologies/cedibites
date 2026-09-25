'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SpinnerIcon } from '@phosphor-icons/react';
import { TONE } from '@/app/inventory/_components/status-tokens';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useBranchOpening } from '@/lib/api/hooks/useOpening';
import type { OpeningVia } from '@/lib/api/services/opening.service';
import { serverNow } from '@/lib/utils/serverClock';
import { AnswerRow } from './AnswerRow';
import { OpeningWizard } from './OpeningWizard';
import { PhotoStrip } from './PhotoStrip';
import { STATUS_LABEL, clock, dayLabel, statusTone } from './openingFormat';
import { ResolveRow } from './ResolveRow';

/**
 * Where the manager opens the branch, on the till or in the staff portal.
 *
 * The checklist itself runs in a window over the screen (OpeningWizard), one
 * set of questions at a time; it opens by itself when there is a checklist to
 * do. Behind it sits a short card to reopen it from. Once the branch is open
 * this is where problems admitted at opening are marked fixed.
 */
export function OpeningChecklist({
    branchId,
    via,
    headerRight,
}: {
    branchId: number;
    via: OpeningVia;
    /** The till puts its sign-out and branch switch here. */
    headerRight?: ReactNode;
}) {
    const { staffUser } = useStaffAuth();
    const queryClient = useQueryClient();
    const { data: opening, isLoading, error } = useBranchOpening(branchId, 'manager');

    // Open by itself: a manager who has come to open the branch should not
    // have to find the button first. Closing it keeps every answer.
    const [wizardOpen, setWizardOpen] = useState(true);
    // A fresh window each time it opens, built from the latest answers.
    const [wizardKey, setWizardKey] = useState(0);
    const [showAnswers, setShowAnswers] = useState(false);

    // Re-renders as the clock passes the grace deadline.
    const [now, setNow] = useState(() => serverNow());
    useEffect(() => {
        const timer = setInterval(() => setNow(serverNow()), 30_000);
        return () => clearInterval(timer);
    }, []);

    const asked = useMemo(() => (opening?.answers ?? []).filter((a) => a.relevant !== false), [opening?.answers]);

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <SpinnerIcon className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !opening) {
        return <Notice>{(error as Error)?.message || 'The checklist could not be loaded. Check the connection and try again.'}</Notice>;
    }

    const branchName = opening.branch.name;
    const completed = opening.completed_at !== null;
    const started = opening.answers.length > 0;
    const myUserId = staffUser?.user_id;
    const tone = statusTone(opening.status, opening.is_late);

    // A line fixed or a photo added: read the opening again, so the status, the
    // counts and the deadline all move with it.
    const updateAnswer = () => {
        queryClient.invalidateQueries({ queryKey: ['opening', branchId] });
    };

    const header = (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
                <h1 className="font-brand text-2xl font-bold text-text-dark">Open {branchName}</h1>
                <p className="mt-1 font-body text-sm text-neutral-gray">
                    {dayLabel(opening.business_date)}
                    {opening.schedule.opens_at && <>. Opens at {clock(opening.schedule.opens_at)}</>}
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-body text-xs font-semibold ${tone.bg} ${tone.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                    {opening.is_late && !opening.opened_at ? 'Late' : STATUS_LABEL[opening.status]}
                </span>
                {headerRight}
            </div>
        </header>
    );

    if (!opening.required) {
        return <Frame>{header}<Notice>{branchName} does not use the opening checklist. Head office switches it on.</Notice></Frame>;
    }
    if (!opening.schedule.trading_day) {
        return <Frame>{header}<Notice>{branchName} is closed today.</Notice></Frame>;
    }

    // ── Still to do: the window, and a card to reopen it ──────────────────
    if (!completed) {
        const reopen = () => {
            setWizardKey((k) => k + 1);
            setWizardOpen(true);
        };

        return (
            <Frame>
                {header}
                <section className="rounded-2xl border border-[#f0e8d8] bg-neutral-card p-5 sm:p-6">
                    <h2 className="font-brand text-xl text-text-dark">
                        {opening.opened_at
                            ? 'Head office opened the branch. The checklist still has to be finished.'
                            : `Nothing sells until ${branchName} is opened`}
                    </h2>
                    <p className="mt-2 font-body text-sm text-neutral-gray">
                        {started
                            ? <span className="tabular-nums">{opening.progress.answered} of {opening.progress.total} answered. Your answers are kept.</span>
                            : 'The opening checklist takes a few minutes.'}
                    </p>
                    <button
                        type="button"
                        onClick={reopen}
                        className="mt-5 min-h-11 rounded-xl bg-primary px-6 font-body text-sm font-semibold text-white hover:bg-primary/90 cursor-pointer"
                    >
                        {started ? 'Carry on with the checklist' : 'Start the checklist'}
                    </button>
                </section>

                {wizardOpen && (
                    <OpeningWizard key={wizardKey} initial={opening} via={via} onClose={() => setWizardOpen(false)} />
                )}
            </Frame>
        );
    }

    // ── Open: what is left ────────────────────────────────────────────────
    const outstanding = asked.filter((a) => a.answer === 'problem' && !a.resolved_at);
    const fixed = asked.filter((a) => a.answer === 'problem' && a.resolved_at);
    const graceEnds = opening.grace_ends_at ? new Date(opening.grace_ends_at) : null;
    const pastGrace = graceEnds !== null && now > graceEnds;

    return (
        <Frame>
            {header}
            <section className="rounded-2xl border border-[#f0e8d8] bg-neutral-card p-5 sm:p-6">
                <h2 className="font-brand text-xl text-text-dark">{branchName} is open</h2>
                <p className="mt-1 font-body text-sm text-neutral-gray">
                    {opening.is_override
                        ? `Opened by head office (${opening.opened_by}) at ${clock(opening.opened_at)}. Checklist finished by ${opening.completed_by} at ${clock(opening.completed_at)}.`
                        : `Opened by ${opening.completed_by} at ${clock(opening.opened_at)}${opening.opened_via === 'pos' ? ' at the till' : ''}.`}
                </p>

                {outstanding.length > 0 && (
                    <p className={`mt-4 inline-flex rounded-full px-3 py-1 font-body text-sm font-semibold ${pastGrace ? `${TONE.problem.bg} ${TONE.problem.text}` : `${TONE.waiting.bg} ${TONE.waiting.text}`}`}>
                        {pastGrace
                            ? `Past ${clock(opening.grace_ends_at)}. Head office has been told.`
                            : `${outstanding.length} to fix by ${clock(opening.grace_ends_at)}`}
                    </p>
                )}
            </section>

            {outstanding.length > 0 && (
                <>
                    <h3 className="mb-2 mt-6 font-body text-sm font-semibold text-text-dark">Still to fix</h3>
                    <ul className="divide-y divide-[#f0e8d8] rounded-2xl border border-[#f0e8d8] bg-neutral-card px-4">
                        {outstanding.map((answer) => (
                            <ResolveRow key={answer.id} branchId={branchId} answer={answer} myUserId={myUserId} onFixed={updateAnswer} />
                        ))}
                    </ul>
                </>
            )}

            {fixed.length > 0 && (
                <>
                    <h3 className="mb-2 mt-6 font-body text-sm font-semibold text-text-dark">Fixed</h3>
                    <ul className="divide-y divide-[#f0e8d8] rounded-2xl border border-[#f0e8d8] bg-neutral-card px-4">
                        {fixed.map((answer) => (
                            <li key={answer.id} className="py-3">
                                <p className="font-body text-sm text-text-dark">{capitalise(answer.short)}</p>
                                <p className="mt-0.5 font-body text-sm text-neutral-gray">
                                    {answer.resolution_note} ({answer.resolved_by}, {clock(answer.resolved_at)})
                                </p>
                                <div className="mt-2"><PhotoStrip branchId={branchId} answer={answer} onChange={updateAnswer} readOnly /></div>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            <button
                type="button"
                onClick={() => setShowAnswers((v) => !v)}
                className="mt-6 min-h-11 font-body text-sm font-semibold text-primary hover:underline cursor-pointer"
            >
                {showAnswers ? 'Hide the answers' : 'See every answer'}
            </button>
            {showAnswers && (
                <ul className="mt-2 divide-y divide-[#f0e8d8] rounded-2xl border border-[#f0e8d8] bg-neutral-card px-4">
                    {asked.map((answer) => (
                        <AnswerRow key={answer.id} branchId={branchId} answer={answer} myUserId={myUserId} locked highlighted={false} onChange={updateAnswer} />
                    ))}
                </ul>
            )}
        </Frame>
    );
}

function Frame({ children }: { children: ReactNode }) {
    return <div className="mx-auto w-full max-w-3xl px-4 py-6">{children}</div>;
}

function Notice({ children }: { children: ReactNode }) {
    return <p className="rounded-2xl border border-[#f0e8d8] bg-neutral-card p-5 font-body text-sm text-text-dark">{children}</p>;
}

function capitalise(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
