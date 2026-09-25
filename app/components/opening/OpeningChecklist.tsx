'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SpinnerIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { SegmentedTabs } from '@/app/inventory/_components/SegmentedTabs';
import { TONE } from '@/app/inventory/_components/status-tokens';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useBranchOpening } from '@/lib/api/hooks/useOpening';
import { openingService, type OpeningVia } from '@/lib/api/services/opening.service';
import { ApiError } from '@/lib/api/client';
import { serverNow } from '@/lib/utils/serverClock';
import { toast } from '@/lib/utils/toast';
import type { BranchOpening, OpeningAnswer, OpeningRefusal } from '@/types/opening';
import { AnswerRow } from './AnswerRow';
import { PhotoStrip } from './PhotoStrip';
import { STATUS_LABEL, clock, dayLabel, statusTone } from './openingFormat';

const REVIEW = '__review__';

interface Section {
    name: string;
    tab: string;
    groups: { name: string | null; answers: OpeningAnswer[] }[];
    needed: number;
    answered: number;
    problems: number;
}

/**
 * The branch manager opening the branch: the client's checklist, in three
 * parts, then a review that is the paper form's "go or no-go", then the button
 * that opens the branch.
 *
 * After opening, the same screen holds what is left to fix and the time it has
 * to be fixed by.
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
    const key = ['opening', branchId, 'manager'];
    const { data: opening, isLoading, error } = useBranchOpening(branchId, 'manager');

    const [tab, setTab] = useState<string | null>(null);
    const [highlight, setHighlight] = useState<Set<number>>(new Set());
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [refusal, setRefusal] = useState<string | null>(null);
    const [showAnswers, setShowAnswers] = useState(false);

    // The start button waits for the checklist window; this re-renders as the
    // clock passes it.
    const [now, setNow] = useState(() => serverNow());
    useEffect(() => {
        const timer = setInterval(() => setNow(serverNow()), 30_000);
        return () => clearInterval(timer);
    }, []);

    const sections = useMemo(() => buildSections(opening?.answers ?? []), [opening?.answers]);

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

    function replace(next: BranchOpening) {
        queryClient.setQueryData(key, next);
        queryClient.invalidateQueries({ queryKey: ['branches'] });
        queryClient.invalidateQueries({ queryKey: ['opening', branchId, 'staff'] });
    }

    function updateAnswer(answer: OpeningAnswer) {
        queryClient.setQueryData<BranchOpening>(key, (old) => {
            if (!old) return old;
            const answers = old.answers.map((a) => (a.id === answer.id ? answer : a));
            const needed = answers.filter((a) => a.kind !== 'text');
            return {
                ...old,
                answers,
                progress: { answered: needed.filter(isAnswered).length, total: needed.length },
            };
        });
        if (highlight.has(answer.id) && isAnswered(answer)) {
            const next = new Set(highlight);
            next.delete(answer.id);
            setHighlight(next);
        }
    }

    async function start() {
        setBusy(true);
        try {
            replace(await openingService.start(branchId, via));
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    async function complete() {
        setBusy(true);
        setRefusal(null);
        try {
            replace(await openingService.complete(branchId, via, note));
            queryClient.invalidateQueries({ queryKey: ['opening', branchId] });
            toast.success(opening!.opened_at ? 'Checklist finished.' : `${branchName} is open.`);
        } catch (err) {
            const body = (err instanceof ApiError ? err.payload : undefined) as OpeningRefusal | undefined;
            setRefusal((err as Error).message);
            const ids = body?.unanswered ?? body?.items ?? [];
            if (ids.length) {
                setHighlight(new Set(ids));
                const first = opening!.answers.find((a) => ids.includes(a.id));
                if (first) setTab(first.section);
            }
        } finally {
            setBusy(false);
        }
    }

    const tone = statusTone(opening.status, opening.is_late);

    const header = (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
                <h1 className="font-brand text-2xl font-bold text-text-dark">Open {branchName}</h1>
                <p className="mt-1 text-sm font-body text-neutral-gray">
                    {dayLabel(opening.business_date)}
                    {opening.schedule.opens_at && <>. Opens at {clock(opening.schedule.opens_at)}</>}
                    {started && !completed && (
                        <>. <span className="tabular-nums">{opening.progress.answered} of {opening.progress.total}</span> answered</>
                    )}
                </p>
            </div>
            <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold font-body ${tone.bg} ${tone.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                    {opening.is_late && !opening.opened_at ? 'Late' : STATUS_LABEL[opening.status]}
                </span>
                {headerRight}
            </div>
        </header>
    );

    // ── Not a checklist day ───────────────────────────────────────────────
    if (!opening.required) {
        return <Frame>{header}<Notice>{branchName} does not use the opening checklist. Head office switches it on.</Notice></Frame>;
    }
    if (!opening.schedule.trading_day) {
        return <Frame>{header}<Notice>{branchName} is closed today.</Notice></Frame>;
    }

    // ── Not started ───────────────────────────────────────────────────────
    if (!started) {
        const from = opening.schedule.checklist_from ? new Date(opening.schedule.checklist_from) : null;
        const tooEarly = from !== null && now < from;

        return (
            <Frame>
                {header}
                <section className="rounded-2xl border border-[#f0e8d8] bg-neutral-card p-5 sm:p-6">
                    <h2 className="font-brand text-xl text-text-dark">Nothing sells until {branchName} is opened</h2>
                    <p className="mt-2 max-w-prose text-sm font-body text-text-dark">
                        Three parts: staffing, stock, and the building. Answer each line Yes or Problem.
                    </p>
                    <p className="mt-2 max-w-prose text-sm font-body text-neutral-gray">
                        You can open with a problem. Say what it is, and head office is told. You then have one hour to fix it.
                        Four food-safety lines must pass before the branch can open.
                    </p>
                    <button
                        type="button"
                        onClick={start}
                        disabled={busy || tooEarly}
                        className="mt-5 min-h-11 rounded-xl bg-primary px-6 text-sm font-semibold font-body text-white hover:bg-primary/90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {busy ? 'Starting...' : 'Start the checklist'}
                    </button>
                    {tooEarly && (
                        <p className="mt-2 text-sm font-body text-neutral-gray">The checklist opens at {clock(opening.schedule.checklist_from)}.</p>
                    )}
                </section>
            </Frame>
        );
    }

    // ── Opened: what is left ──────────────────────────────────────────────
    if (completed) {
        const outstanding = opening.answers.filter((a) => a.answer === 'problem' && !a.resolved_at);
        const fixed = opening.answers.filter((a) => a.answer === 'problem' && a.resolved_at);
        const graceEnds = opening.grace_ends_at ? new Date(opening.grace_ends_at) : null;
        const pastGrace = graceEnds !== null && now > graceEnds;

        return (
            <Frame>
                {header}
                <section className="rounded-2xl border border-[#f0e8d8] bg-neutral-card p-5 sm:p-6">
                    <h2 className="font-brand text-xl text-text-dark">{branchName} is open</h2>
                    <p className="mt-1 text-sm font-body text-neutral-gray">
                        {opening.is_override
                            ? `Opened by head office (${opening.opened_by}) at ${clock(opening.opened_at)}. Checklist finished by ${opening.completed_by} at ${clock(opening.completed_at)}.`
                            : `Opened by ${opening.completed_by} at ${clock(opening.opened_at)}${opening.opened_via === 'pos' ? ' at the till' : ''}.`}
                    </p>

                    {outstanding.length > 0 && (
                        <p className={`mt-4 inline-flex rounded-full px-3 py-1 text-sm font-semibold font-body ${pastGrace ? `${TONE.problem.bg} ${TONE.problem.text}` : `${TONE.waiting.bg} ${TONE.waiting.text}`}`}>
                            {pastGrace
                                ? `Past ${clock(opening.grace_ends_at)}. Head office has been told.`
                                : `${outstanding.length} to fix by ${clock(opening.grace_ends_at)}`}
                        </p>
                    )}
                </section>

                {outstanding.length > 0 && (
                    <>
                        <h3 className="mb-2 mt-6 text-sm font-semibold font-body text-text-dark">Still to fix</h3>
                        <ul className="divide-y divide-[#f0e8d8] rounded-2xl border border-[#f0e8d8] bg-neutral-card px-4">
                            {outstanding.map((answer) => (
                                <ResolveRow key={answer.id} branchId={branchId} answer={answer} myUserId={myUserId}
                                    onFixed={(a) => { updateAnswer(a); queryClient.invalidateQueries({ queryKey: ['opening', branchId] }); }} />
                            ))}
                        </ul>
                    </>
                )}

                {fixed.length > 0 && (
                    <>
                        <h3 className="mb-2 mt-6 text-sm font-semibold font-body text-text-dark">Fixed</h3>
                        <ul className="divide-y divide-[#f0e8d8] rounded-2xl border border-[#f0e8d8] bg-neutral-card px-4">
                            {fixed.map((answer) => (
                                <li key={answer.id} className="py-3">
                                    <p className="text-sm font-body text-text-dark">{capitalise(answer.short)}</p>
                                    <p className="mt-0.5 text-sm font-body text-neutral-gray">
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
                    className="mt-6 min-h-11 text-sm font-semibold font-body text-primary hover:underline cursor-pointer"
                >
                    {showAnswers ? 'Hide the answers' : 'See every answer'}
                </button>
                {showAnswers && sections.map((section) => (
                    <SectionView key={section.name} section={section} branchId={branchId} myUserId={myUserId} locked highlight={highlight} onChange={updateAnswer} />
                ))}
            </Frame>
        );
    }

    // ── In progress ───────────────────────────────────────────────────────
    const current = tab ?? sections.find((s) => s.answered < s.needed)?.name ?? REVIEW;
    const section = sections.find((s) => s.name === current);
    const unsafe = opening.answers.filter((a) => a.weight === 'must_pass' && a.answer === 'problem');
    const problems = opening.answers.filter((a) => a.answer === 'problem');
    const left = opening.progress.total - opening.progress.answered;
    const mustPassCount = opening.answers.filter((a) => a.weight === 'must_pass').length;
    const alreadyOpen = opening.opened_at !== null;

    const openLabel = alreadyOpen
        ? 'Finish the checklist'
        : problems.length
            ? `Open ${branchName} with ${problems.length} ${problems.length === 1 ? 'problem' : 'problems'}`
            : `Open ${branchName}`;
    const blockedBy = left > 0
        ? `${left} ${left === 1 ? 'line still needs' : 'lines still need'} an answer.`
        : unsafe.length && !alreadyOpen
            ? `A food-safety line has a problem: ${unsafe.map((a) => a.short).join(', ')}. Fix it and change the answer, or ask head office to open the branch.`
            : null;

    return (
        <Frame>
            {header}

            {alreadyOpen && (
                <p className={`mb-4 rounded-2xl px-4 py-3 text-sm font-body ${TONE.waiting.bg} ${TONE.waiting.text}`}>
                    Head office opened {branchName} at {clock(opening.opened_at)}: {opening.override_reason} The checklist still has to be finished.
                </p>
            )}

            <div className="mb-4 overflow-x-auto">
                <SegmentedTabs
                    value={current}
                    onChange={(v) => { setTab(v); window.scrollTo({ top: 0 }); }}
                    options={[
                        ...sections.map((s) => ({ value: s.name, label: `${s.tab} ${s.answered}/${s.needed}` })),
                        { value: REVIEW, label: 'Review' },
                    ]}
                />
            </div>

            {section ? (
                <SectionView section={section} branchId={branchId} myUserId={myUserId} locked={false} highlight={highlight} onChange={updateAnswer} />
            ) : (
                <section>
                    <h2 className="font-brand text-xl text-text-dark">Ready to open?</h2>
                    <ul className="mt-3 divide-y divide-[#f0e8d8] rounded-2xl border border-[#f0e8d8] bg-neutral-card px-4">
                        {sections.map((s) => {
                            const t = s.answered < s.needed ? TONE.neutral : s.problems ? TONE.waiting : TONE.done;
                            const text = s.answered < s.needed
                                ? `${s.needed - s.answered} left`
                                : s.problems ? `${s.problems} ${s.problems === 1 ? 'problem' : 'problems'}` : 'Ready';
                            return (
                                <li key={s.name}>
                                    <button type="button" onClick={() => setTab(s.name)} className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left cursor-pointer">
                                        <span className="text-sm font-body text-text-dark">{s.name}</span>
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold font-body ${t.bg} ${t.text}`}>{text}</span>
                                    </button>
                                </li>
                            );
                        })}
                        <li className="flex min-h-11 items-center justify-between gap-3 py-2">
                            <span className="text-sm font-body text-text-dark">Food safety</span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold font-body ${unsafe.length ? `${TONE.problem.bg} ${TONE.problem.text}` : `${TONE.done.bg} ${TONE.done.text}`}`}>
                                {unsafe.length ? `Failed: ${unsafe.map((a) => a.short).join(', ')}` : `All ${mustPassCount} pass`}
                            </span>
                        </li>
                    </ul>

                    {problems.length > 0 && (
                        <>
                            <h3 className="mb-2 mt-6 text-sm font-semibold font-body text-text-dark">
                                Head office will be told about {problems.length === 1 ? 'this' : 'these'}. You will have one hour to fix {problems.length === 1 ? 'it' : 'them'}.
                            </h3>
                            <ul className="divide-y divide-[#f0e8d8] rounded-2xl border border-[#f0e8d8] bg-neutral-card px-4">
                                {problems.map((a) => (
                                    <li key={a.id} className="py-3">
                                        <p className="text-sm font-semibold font-body text-text-dark">{capitalise(a.short)}</p>
                                        <p className="text-sm font-body text-neutral-gray">{a.note}</p>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    <label htmlFor="opening-note" className="mb-1.5 mt-6 block text-sm font-body text-text-dark">
                        Anything else head office should know? <span className="text-neutral-gray">(optional)</span>
                    </label>
                    <textarea
                        id="opening-note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        className="w-full min-h-11 resize-y rounded-xl border border-[#e3e1de] bg-[#f5f4f2] px-3.5 py-2.5 text-sm font-body text-text-dark focus:outline-none focus:border-primary"
                    />
                </section>
            )}

            {/* Always in reach: how far there is to go, and the way to open. */}
            <div className="sticky bottom-0 -mx-4 mt-6 border-t border-[#f0e8d8] bg-neutral-light px-4 py-3">
                {(refusal || (current === REVIEW && blockedBy)) && (
                    <p className="mb-2 flex items-start gap-1.5 text-sm font-body text-rose-700">
                        <WarningCircleIcon size={16} weight="fill" className="mt-0.5 shrink-0" />
                        {refusal ?? blockedBy}
                    </p>
                )}
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-body text-neutral-gray tabular-nums">
                        {left > 0 ? `${left} left` : 'All answered'}
                    </p>
                    {current === REVIEW ? (
                        <button
                            type="button"
                            onClick={complete}
                            disabled={busy || blockedBy !== null}
                            className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold font-body text-white hover:bg-primary/90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {busy ? 'Opening...' : openLabel}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => { setTab(nextTab(sections, current)); window.scrollTo({ top: 0 }); }}
                            className="min-h-11 rounded-xl border border-[#e3ddd0] bg-neutral-card px-5 text-sm font-semibold font-body text-text-dark hover:border-neutral-gray/50 cursor-pointer"
                        >
                            {nextTab(sections, current) === REVIEW ? 'Review and open' : 'Next part'}
                        </button>
                    )}
                </div>
            </div>
        </Frame>
    );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function SectionView({
    section, branchId, myUserId, locked, highlight, onChange,
}: {
    section: Section;
    branchId: number;
    myUserId?: number;
    locked: boolean;
    highlight: Set<number>;
    onChange: (a: OpeningAnswer) => void;
}) {
    return (
        <section className="mb-2">
            <h2 className="font-brand text-xl text-text-dark">{section.name}</h2>
            {section.groups.map((group) => (
                <div key={group.name ?? 'notes'}>
                    <h3 className="mb-1 mt-5 text-sm font-semibold font-body text-text-dark">{group.name ?? 'Notes'}</h3>
                    <ul className="divide-y divide-[#f0e8d8] rounded-2xl border border-[#f0e8d8] bg-neutral-card px-4">
                        {group.answers.map((answer) => (
                            <AnswerRow
                                key={answer.id}
                                branchId={branchId}
                                answer={answer}
                                myUserId={myUserId}
                                locked={locked}
                                highlighted={highlight.has(answer.id)}
                                onChange={onChange}
                            />
                        ))}
                    </ul>
                </div>
            ))}
        </section>
    );
}

function ResolveRow({
    branchId, answer, myUserId, onFixed,
}: {
    branchId: number;
    answer: OpeningAnswer;
    myUserId?: number;
    onFixed: (a: OpeningAnswer) => void;
}) {
    const [open, setOpen] = useState(false);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    async function save() {
        setBusy(true);
        try {
            onFixed(await openingService.resolve(branchId, answer.id, note.trim()));
            toast.success(`${capitalise(answer.short)} marked fixed.`);
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <li className="py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 basis-56">
                    <p className="text-sm font-semibold font-body text-text-dark">{capitalise(answer.short)}</p>
                    <p className="text-sm font-body text-neutral-gray">{answer.note}</p>
                </div>
                {!open && (
                    <button type="button" onClick={() => setOpen(true)}
                        className="min-h-11 rounded-xl border border-[#e3ddd0] bg-white px-4 text-sm font-semibold font-body text-text-dark hover:border-neutral-gray/50 cursor-pointer">
                        Mark fixed
                    </button>
                )}
            </div>
            <div className="mt-2"><PhotoStrip branchId={branchId} answer={answer} myUserId={myUserId} onChange={onFixed} /></div>
            {open && (
                <div className="mt-2 flex flex-col gap-2">
                    <textarea
                        aria-label={`What was done about ${answer.short}`}
                        placeholder="What was done to fix it?"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        autoFocus
                        className="w-full min-h-11 resize-y rounded-xl border border-[#e3e1de] bg-[#f5f4f2] px-3.5 py-2.5 text-sm font-body text-text-dark focus:outline-none focus:border-primary"
                    />
                    <div className="flex gap-2">
                        <button type="button" onClick={save} disabled={busy || note.trim().length < 3}
                            className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold font-body text-white hover:bg-primary/90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50">
                            {busy ? 'Saving...' : 'Save'}
                        </button>
                        <button type="button" onClick={() => setOpen(false)}
                            className="min-h-11 rounded-xl px-4 text-sm font-semibold font-body text-neutral-gray hover:text-text-dark cursor-pointer">
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </li>
    );
}

function Frame({ children }: { children: ReactNode }) {
    return <div className="mx-auto w-full max-w-3xl px-4 py-6">{children}</div>;
}

function Notice({ children }: { children: ReactNode }) {
    return <p className="rounded-2xl border border-[#f0e8d8] bg-neutral-card p-5 text-sm font-body text-text-dark">{children}</p>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isAnswered(a: OpeningAnswer): boolean {
    if (a.kind === 'check') return a.answer !== null;
    if (a.kind === 'number') return a.value !== null && a.value !== '';
    return true;
}

function buildSections(answers: OpeningAnswer[]): Section[] {
    const order: string[] = [];
    const bySection = new Map<string, OpeningAnswer[]>();

    for (const a of answers) {
        if (!bySection.has(a.section)) {
            bySection.set(a.section, []);
            order.push(a.section);
        }
        bySection.get(a.section)!.push(a);
    }

    return order.map((name) => {
        const list = bySection.get(name)!;
        const groupOrder: (string | null)[] = [];
        const byGroup = new Map<string | null, OpeningAnswer[]>();
        // Notes go last in their section, whatever their position.
        for (const a of [...list.filter((x) => x.kind !== 'text'), ...list.filter((x) => x.kind === 'text')]) {
            const g = a.kind === 'text' ? null : a.group;
            if (!byGroup.has(g)) {
                byGroup.set(g, []);
                groupOrder.push(g);
            }
            byGroup.get(g)!.push(a);
        }
        const needed = list.filter((a) => a.kind !== 'text');
        return {
            name,
            tab: name.split(' ')[0],
            groups: groupOrder.map((g) => ({ name: g, answers: byGroup.get(g)! })),
            needed: needed.length,
            answered: needed.filter(isAnswered).length,
            problems: list.filter((a) => a.answer === 'problem').length,
        };
    });
}

function nextTab(sections: Section[], current: string): string {
    const i = sections.findIndex((s) => s.name === current);
    return i >= 0 && i < sections.length - 1 ? sections[i + 1].name : REVIEW;
}

function capitalise(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
