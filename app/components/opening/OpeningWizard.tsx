'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    CheckIcon,
    MinusIcon,
    PlusIcon,
    WarningCircleIcon,
    XIcon,
} from '@phosphor-icons/react';
import { TONE } from '@/app/inventory/_components/status-tokens';
import { ApiError } from '@/lib/api/client';
import { openingService, type AnswerPayload, type OpeningVia } from '@/lib/api/services/opening.service';
import { isAnswered, relevance } from '@/lib/utils/openingRelevance';
import { serverNow } from '@/lib/utils/serverClock';
import { toast } from '@/lib/utils/toast';
import type { BranchOpening, CheckAnswer, OpeningAnswer, OpeningRefusal } from '@/types/opening';
import { PhotoStrip } from './PhotoStrip';
import { clock, dayLabel } from './openingFormat';

const COVER = -1;

interface Step {
    id: string;
    section: string;
    group: string | null;
    lines: OpeningAnswer[];
}

/**
 * Opening the branch, one set of questions at a time.
 *
 * Built like the "What's new" notices: a card over the screen, a cover, one
 * slide per set, Back and Next. Each set has "Yes to all", so a normal morning
 * is a tap per set rather than a tap per line; the manager then marks what is
 * not right.
 *
 * Every answer shows at once and saves behind it. If a save fails the answer
 * goes back to what it was and says so. Opening waits for anything still
 * saving, so what the server opens on is what the screen shows.
 *
 * Lines that no longer apply disappear as answers are given, and come back if
 * the answer changes: once "All scheduled staff have reported" is Yes, nobody
 * is asked about cover for absent staff.
 */
export function OpeningWizard({
    initial,
    via,
    onClose,
}: {
    initial: BranchOpening;
    via: OpeningVia;
    onClose: () => void;
}) {
    const queryClient = useQueryClient();
    const branchId = initial.branch.id;
    const branchName = initial.branch.name;

    const [answers, setAnswers] = useState<OpeningAnswer[]>(initial.answers);
    const [drafts, setDrafts] = useState<Record<number, string>>({});
    // Marked Problem, but not yet saved because it does not say what is wrong.
    const [unsaved, setUnsaved] = useState<Set<number>>(new Set());
    const [index, setIndex] = useState(COVER);
    const [direction, setDirection] = useState<1 | -1>(1);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [refusal, setRefusal] = useState<string | null>(null);
    const [opened, setOpened] = useState<BranchOpening | null>(null);

    const seq = useRef<Record<number, number>>({});
    const inflight = useRef<Set<Promise<unknown>>>(new Set());
    const timers = useRef<Record<number, { handle: ReturnType<typeof setTimeout>; run: () => void }>>({});

    const started = answers.length > 0;
    const asked = useMemo(() => relevance(answers), [answers]);
    const steps = useMemo(() => buildSteps(answers, asked), [answers, asked]);
    const needed = answers.filter((a) => a.kind !== 'text' && asked.get(a.id) !== false);
    const answeredCount = needed.filter(isAnswered).length;

    const REVIEW = steps.length;
    const DONE = steps.length + 1;

    // ── Saving ────────────────────────────────────────────────────────────

    const patch = useCallback((id: number, changes: Partial<OpeningAnswer>) => {
        setAnswers((list) => list.map((a) => (a.id === id ? { ...a, ...changes } : a)));
    }, []);

    const track = useCallback(<T,>(promise: Promise<T>): Promise<T> => {
        inflight.current.add(promise);
        promise.finally(() => inflight.current.delete(promise)).catch(() => {});
        return promise;
    }, []);

    /** Send one answer. The newest request for a line wins; an older reply is ignored. */
    const save = useCallback((id: number, payload: AnswerPayload, rollback: Partial<OpeningAnswer>, onSaved?: () => void) => {
        const mine = (seq.current[id] ?? 0) + 1;
        seq.current[id] = mine;

        return track(
            openingService.answer(branchId, id, payload).then(
                (saved) => {
                    if (seq.current[id] !== mine) return;
                    patch(id, { answer: saved.answer, value: saved.value, note: saved.note, answered_at: saved.answered_at });
                    onSaved?.();
                },
                (err) => {
                    if (seq.current[id] !== mine) return;
                    patch(id, rollback);
                    toast.error((err as Error).message || 'That answer did not save. Try it again.');
                },
            ),
        );
    }, [branchId, patch, track]);

    /** Save after a pause in typing or tapping; flushed before opening. */
    const later = useCallback((id: number, run: () => void, ms: number) => {
        const current = timers.current[id];
        if (current) clearTimeout(current.handle);
        timers.current[id] = {
            run,
            handle: setTimeout(() => {
                delete timers.current[id];
                run();
            }, ms),
        };
    }, []);

    const flush = useCallback(() => {
        for (const [id, t] of Object.entries(timers.current)) {
            clearTimeout(t.handle);
            delete timers.current[Number(id)];
            t.run();
        }
    }, []);

    // Nothing behind the window scrolls while it is open.
    useEffect(() => {
        const html = document.documentElement.style.overflow;
        const body = document.body.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        return () => {
            document.documentElement.style.overflow = html;
            document.body.style.overflow = body;
        };
    }, []);

    useEffect(() => () => {
        // Leaving with a save still waiting: send it rather than lose it.
        for (const t of Object.values(timers.current)) {
            clearTimeout(t.handle);
            t.run();
        }
    }, []);

    function choose(line: OpeningAnswer, choice: CheckAnswer) {
        const before = { answer: line.answer, note: line.note };

        if (choice === 'problem') {
            patch(line.id, { answer: 'problem' });
            const text = (drafts[line.id] ?? line.note ?? '').trim();
            if (text.length >= 3) {
                void save(line.id, { answer: 'problem', note: text }, before);
            } else {
                setUnsaved((s) => new Set(s).add(line.id));
            }
            return;
        }

        setUnsaved((s) => {
            const next = new Set(s);
            next.delete(line.id);
            return next;
        });
        patch(line.id, { answer: choice, note: null });
        void save(line.id, { answer: choice, note: null }, before);
    }

    function describe(line: OpeningAnswer, text: string) {
        setDrafts((d) => ({ ...d, [line.id]: text }));
        const trimmed = text.trim();
        if (trimmed.length < 3) return;

        later(line.id, () => {
            void save(line.id, { answer: 'problem', note: trimmed }, { answer: line.answer, note: line.note }, () => {
                setUnsaved((s) => {
                    const next = new Set(s);
                    next.delete(line.id);
                    return next;
                });
            });
        }, 700);
    }

    function setValue(line: OpeningAnswer, value: string | null) {
        const before = { value: line.value };
        patch(line.id, { value });
        later(line.id, () => void save(line.id, { value: line.kind === 'number' && value !== null ? Number(value) : value }, before), 600);
    }

    /** Every line in the set becomes Yes, except a problem already admitted. */
    function yesToAll(step: Step) {
        const snapshot = answers;
        const inSet = (a: OpeningAnswer) => a.section === step.section && a.group === step.group && a.kind === 'check';

        // Only the lines still asked once the Yeses are in: a Yes to
        // "everyone reported" makes the cover question moot.
        const after = answers.map((a) => (inSet(a) && a.answer !== 'problem' ? { ...a, answer: 'ok' as const } : a));
        const askedAfter = relevance(after);
        const targets = new Set(after.filter((a) => inSet(a) && a.answer === 'ok' && askedAfter.get(a.id) !== false).map((a) => a.id));

        setAnswers((list) => list.map((a) => (targets.has(a.id) ? { ...a, answer: 'ok', note: null } : a)));

        void track(
            openingService.answerGroup(branchId, step.section, step.group).catch((err) => {
                setAnswers(snapshot);
                toast.error((err as Error).message || 'That did not save. Try Yes to all again.');
            }),
        );
    }

    // ── Moving ────────────────────────────────────────────────────────────

    const go = useCallback((to: number) => {
        setDirection(to > index ? 1 : -1);
        setIndex(to);
        setRefusal(null);
    }, [index]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const typing = e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
            if (typing || busy || !started) return;
            if (e.key === 'ArrowRight' && index < REVIEW) go(index + 1);
            if (e.key === 'ArrowLeft' && index > COVER && index <= REVIEW) go(index - 1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [busy, started, index, REVIEW, go]);

    async function start() {
        setBusy(true);
        try {
            const fresh = await openingService.start(branchId, via);
            setAnswers(fresh.answers);
            queryClient.setQueryData(['opening', branchId, 'manager'], fresh);
            setDirection(1);
            setIndex(0);
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    async function open() {
        if (unsaved.size > 0) return;
        setBusy(true);
        setRefusal(null);
        try {
            flush();
            await Promise.allSettled([...inflight.current]);
            const done = await openingService.complete(branchId, via, note);
            setOpened(done);
            queryClient.setQueryData(['opening', branchId, 'manager'], done);
            setDirection(1);
            setIndex(DONE);
        } catch (err) {
            const body = (err instanceof ApiError ? err.payload : undefined) as OpeningRefusal | undefined;
            setRefusal((err as Error).message);
            const first = (body?.unanswered ?? body?.items ?? [])[0];
            const at = first !== undefined ? steps.findIndex((s) => s.lines.some((l) => l.id === first)) : -1;
            if (at >= 0) go(at);
        } finally {
            setBusy(false);
        }
    }

    function close() {
        flush();
        queryClient.invalidateQueries({ queryKey: ['opening', branchId] });
        queryClient.invalidateQueries({ queryKey: ['branches'] });
        onClose();
    }

    // ── What is on the slide ──────────────────────────────────────────────

    const firstGap = steps.findIndex((s) => s.lines.some((l) => l.kind !== 'text' && !isAnswered(l)));
    const unsafe = needed.filter((a) => a.weight === 'must_pass' && a.answer === 'problem');
    const problems = needed.filter((a) => a.answer === 'problem');
    const alreadyOpen = initial.opened_at !== null;
    const left = needed.length - answeredCount;
    const unsavedLines = answers.filter((a) => unsaved.has(a.id));

    const blockedBy = unsavedLines.length
        ? `Say what is wrong with ${unsavedLines.map((a) => a.short).join(', ')}.`
        : left > 0
            ? `${left} ${left === 1 ? 'line still needs' : 'lines still need'} an answer.`
            : unsafe.length && !alreadyOpen
                ? `A food-safety line has a problem: ${unsafe.map((a) => a.short).join(', ')}. Fix it and change the answer, or ask head office to open the branch.`
                : null;

    const openLabel = alreadyOpen
        ? 'Finish the checklist'
        : problems.length
            ? `Open ${branchName} with ${problems.length} ${problems.length === 1 ? 'problem' : 'problems'}`
            : `Open ${branchName}`;

    const from = initial.schedule.checklist_from ? new Date(initial.schedule.checklist_from) : null;
    const tooEarly = !started && from !== null && serverNow() < from;

    let body: React.ReactNode;
    if (index === COVER) {
        body = (
            <div className="px-7 py-12 sm:px-12 sm:py-16">
                <h2 className="font-brand text-[30px] leading-[1.12] text-text-dark text-balance sm:text-[38px]">
                    {started ? `Carry on opening ${branchName}` : `Open ${branchName}`}
                </h2>
                <p className="mt-3 font-body text-[15px] text-neutral-gray sm:text-base">
                    {dayLabel(initial.business_date)}
                    {initial.schedule.opens_at && <>. Opens at {clock(initial.schedule.opens_at)}</>}.
                </p>
                {alreadyOpen && (
                    <p className={`mt-5 rounded-2xl px-4 py-3 font-body text-sm ${TONE.waiting.bg} ${TONE.waiting.text}`}>
                        Head office opened {branchName} at {clock(initial.opened_at)}: {initial.override_reason} The checklist still has to be finished.
                    </p>
                )}
                <p className="mt-6 max-w-[52ch] font-body text-[15px] text-text-dark sm:text-base">
                    {started
                        ? <span className="tabular-nums">{answeredCount} of {needed.length} answered.</span>
                        : `${steps.length} short sets of questions. Where everything is fine, tap Yes to all. Mark anything that is not.`}
                </p>
                {!started && (
                    <p className="mt-2 max-w-[52ch] font-body text-sm text-neutral-gray">
                        You can open with a problem. Say what it is and head office is told; you then have an hour to fix it.
                    </p>
                )}
                {tooEarly && <p className="mt-4 font-body text-sm text-neutral-gray">The checklist opens at {clock(initial.schedule.checklist_from)}.</p>}
            </div>
        );
    } else if (index === DONE && opened) {
        const open = opened.problems.outstanding;
        body = (
            <div className="px-7 py-12 sm:px-12 sm:py-16">
                <h2 className="font-brand text-[30px] leading-[1.12] text-text-dark sm:text-[38px]">{branchName} is open</h2>
                <p className="mt-4 max-w-[52ch] font-body text-[15px] text-text-dark sm:text-base">
                    {open > 0
                        ? `Head office has been told about ${open === 1 ? 'the problem' : `the ${open} problems`}. Fix ${open === 1 ? 'it' : 'them'} by ${clock(opened.grace_ends_at)}, from the Opening page.`
                        : 'Every line checked. The till is ready.'}
                </p>
            </div>
        );
    } else if (index >= REVIEW) {
        body = (
            <div className="px-6 pb-6 pt-8 sm:px-10">
                <h2 className="font-brand text-[27px] leading-[1.15] text-text-dark sm:text-[32px]">Ready to open?</h2>
                <ul className="mt-5 divide-y divide-[#f0e8d8] border-y border-[#f0e8d8]">
                    {summarise(steps).map((s) => (
                        <li key={s.section}>
                            <button type="button" onClick={() => go(s.firstStep)} className="flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left cursor-pointer">
                                <span className="font-body text-[15px] text-text-dark">{s.section}</span>
                                <span className={`rounded-full px-2.5 py-0.5 font-body text-xs font-semibold ${s.tone.bg} ${s.tone.text}`}>{s.label}</span>
                            </button>
                        </li>
                    ))}
                    <li className="flex min-h-12 items-center justify-between gap-3 py-2">
                        <span className="font-body text-[15px] text-text-dark">Food safety</span>
                        <span className={`rounded-full px-2.5 py-0.5 font-body text-xs font-semibold ${unsafe.length ? `${TONE.problem.bg} ${TONE.problem.text}` : `${TONE.done.bg} ${TONE.done.text}`}`}>
                            {unsafe.length ? `Problem: ${unsafe.map((a) => a.short).join(', ')}` : 'No problems'}
                        </span>
                    </li>
                </ul>

                {problems.length > 0 && (
                    <div className="mt-6">
                        <p className="font-body text-sm font-semibold text-text-dark">
                            Head office will be told about {problems.length === 1 ? 'this' : 'these'}, and you will have one hour to fix {problems.length === 1 ? 'it' : 'them'}:
                        </p>
                        <ul className="mt-2 space-y-1.5">
                            {problems.map((a) => (
                                <li key={a.id} className="font-body text-sm text-text-dark">
                                    <span className="font-semibold">{capitalise(a.short)}.</span>{' '}
                                    <span className="text-neutral-gray">{drafts[a.id] ?? a.note}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <label htmlFor="opening-note" className="mb-1.5 mt-6 block font-body text-sm text-text-dark">
                    Anything else head office should know? <span className="text-neutral-gray">(optional)</span>
                </label>
                <textarea
                    id="opening-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="w-full min-h-11 resize-y rounded-xl border border-[#e3e1de] bg-white px-3.5 py-2.5 font-body text-sm text-text-dark focus:outline-none focus:border-primary"
                />
            </div>
        );
    } else {
        const step = steps[index];
        const checks = step.lines.filter((l) => l.kind === 'check');
        const allYes = checks.length > 0 && checks.every((l) => l.answer === 'ok');
        const someProblem = checks.some((l) => l.answer === 'problem');

        body = (
            <div className="px-6 pb-6 pt-8 sm:px-10">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="font-brand text-[27px] leading-[1.15] text-text-dark sm:text-[32px]">{step.group ?? 'Notes'}</h2>
                        <p className="mt-1 font-body text-sm text-neutral-gray">{step.section}</p>
                    </div>
                    {checks.length > 1 && (
                        <button
                            type="button"
                            onClick={() => yesToAll(step)}
                            disabled={allYes}
                            className={`flex min-h-12 items-center gap-2 rounded-xl px-5 font-body text-sm font-semibold transition-colors duration-150 ease-out cursor-pointer ${
                                allYes
                                    ? `${TONE.done.bg} ${TONE.done.text} cursor-default`
                                    : 'bg-secondary text-white hover:bg-secondary-hover'
                            }`}
                        >
                            <CheckIcon size={16} weight="bold" />
                            {allYes ? 'All yes' : someProblem ? 'Yes to the rest' : 'Yes to all'}
                        </button>
                    )}
                </div>

                <ul className="mt-5 divide-y divide-[#f0e8d8] border-y border-[#f0e8d8]">
                    {step.lines.map((line) => (
                        <Line
                            key={line.id}
                            line={line}
                            branchId={branchId}
                            draft={drafts[line.id]}
                            unsaved={unsaved.has(line.id)}
                            highlight={refusal !== null && line.kind !== 'text' && !isAnswered(line)}
                            onChoose={(c) => choose(line, c)}
                            onDescribe={(t) => describe(line, t)}
                            onValue={(v) => setValue(line, v)}
                            onPhotos={(a) => patch(a.id, { photos: a.photos })}
                        />
                    ))}
                </ul>
            </div>
        );
    }

    // ── The card ──────────────────────────────────────────────────────────

    // Rendered at the top of the document, not inside the page. Inside it, the
    // staff portal's scrolling <main> is the card's ancestor, so a wheel or a
    // swipe over the dimmed backdrop scrolled the page behind the checklist.
    return createPortal(
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-brand-darker/75 p-3 sm:p-6">
            <div
                role="dialog"
                aria-modal="true"
                aria-label={`Open ${branchName}`}
                className="relative flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-neutral-card shadow-[0_24px_60px_-12px_rgba(18,15,13,0.45)]"
            >
                {index !== DONE && (
                    <button
                        type="button"
                        onClick={close}
                        aria-label="Close. Your answers are kept."
                        title="Close. Your answers are kept."
                        className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full text-neutral-gray hover:bg-neutral-light hover:text-text-dark cursor-pointer"
                    >
                        <XIcon size={18} weight="bold" />
                    </button>
                )}

                <div
                    key={index}
                    className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${direction === 1 ? 'walkthrough-enter-next' : 'walkthrough-enter-prev'}`}
                >
                    {body}
                </div>

                {(refusal || (index === REVIEW && blockedBy)) && (
                    <p className="flex items-start gap-1.5 bg-rose-50 px-6 py-2.5 font-body text-sm text-rose-700 sm:px-8">
                        <WarningCircleIcon size={16} weight="fill" className="mt-0.5 shrink-0" />
                        {refusal ?? blockedBy}
                    </p>
                )}

                <footer className="flex shrink-0 items-center gap-3 bg-neutral-light px-5 py-4 sm:px-7">
                    {index === COVER ? (
                        <>
                            <div className="flex-1" />
                            <button
                                type="button"
                                onClick={() => (started ? go(firstGap >= 0 ? firstGap : REVIEW) : void start())}
                                disabled={busy || tooEarly}
                                className="flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-6 font-body text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60 cursor-pointer"
                            >
                                {busy ? 'Starting' : started ? 'Carry on' : 'Start'}
                                <ArrowRightIcon size={15} weight="bold" />
                            </button>
                        </>
                    ) : index === DONE ? (
                        <>
                            <div className="flex-1" />
                            <button type="button" onClick={close}
                                className="min-h-11 rounded-xl bg-primary px-6 font-body text-sm font-semibold text-white hover:bg-primary-hover cursor-pointer">
                                Done
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => go(index - 1)}
                                disabled={busy || index === 0}
                                className="flex min-h-11 items-center gap-1.5 rounded-xl px-3 font-body text-sm font-medium text-neutral-gray hover:text-text-dark disabled:pointer-events-none disabled:opacity-0 cursor-pointer"
                            >
                                <ArrowLeftIcon size={15} />
                                Back
                            </button>

                            <div className="flex flex-1 items-center justify-center gap-1.5">
                                {steps.map((s, i) => {
                                    const complete = s.lines.every((l) => l.kind === 'text' || isAnswered(l));
                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => go(i)}
                                            aria-label={`${s.group ?? 'Notes'}${complete ? ', done' : ''}`}
                                            className="flex h-6 items-center cursor-pointer"
                                        >
                                            <span className={`h-1.5 rounded-full transition-all duration-200 ease-out ${
                                                i === index ? 'w-6 bg-primary' : complete ? 'w-1.5 bg-secondary' : 'w-1.5 bg-neutral-gray/30'
                                            }`} />
                                        </button>
                                    );
                                })}
                                <span className="ml-2 hidden font-body text-xs tabular-nums text-neutral-gray sm:inline">
                                    {index < REVIEW ? `${index + 1} of ${steps.length}` : `${answeredCount} of ${needed.length}`}
                                </span>
                            </div>

                            {index < REVIEW ? (
                                <button
                                    type="button"
                                    onClick={() => go(index + 1)}
                                    className="flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-5 font-body text-sm font-semibold text-white hover:bg-primary-hover cursor-pointer"
                                >
                                    {index === REVIEW - 1 ? 'Review' : 'Next'}
                                    <ArrowRightIcon size={15} weight="bold" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => void open()}
                                    disabled={busy || blockedBy !== null}
                                    className="min-h-11 rounded-xl bg-primary px-5 font-body text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                                >
                                    {busy ? 'Opening' : openLabel}
                                </button>
                            )}
                        </>
                    )}
                </footer>
            </div>
        </div>,
        document.body,
    );
}

// ─── One line ────────────────────────────────────────────────────────────────

const CHOICE: Record<CheckAnswer, { label: string; on: string }> = {
    ok: { label: 'Yes', on: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    problem: { label: 'Problem', on: 'bg-rose-50 text-rose-700 border-rose-200' },
    na: { label: 'Not needed', on: 'bg-neutral-light text-text-dark border-[#e3ddd0]' },
};

function Line({
    line, branchId, draft, unsaved, highlight, onChoose, onDescribe, onValue, onPhotos,
}: {
    line: OpeningAnswer;
    branchId: number;
    draft?: string;
    unsaved: boolean;
    highlight: boolean;
    onChoose: (c: CheckAnswer) => void;
    onDescribe: (text: string) => void;
    onValue: (value: string | null) => void;
    onPhotos: (a: OpeningAnswer) => void;
}) {
    const mark = highlight ? 'bg-rose-50/60' : '';

    if (line.kind === 'number') {
        const n = line.value === null || line.value === '' ? null : Number(line.value);
        const step = (by: number) => onValue(String(Math.max(0, Math.min(999, (n ?? 0) + by))));
        return (
            <li className={`flex items-center justify-between gap-4 py-3 ${mark}`}>
                <span className="font-body text-[15px] text-text-dark">{line.label}</span>
                <div className="flex items-center gap-1">
                    <button type="button" onClick={() => step(-1)} aria-label={`One fewer: ${line.label}`}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#e3ddd0] bg-white text-text-dark hover:border-neutral-gray/50 cursor-pointer">
                        <MinusIcon size={16} weight="bold" />
                    </button>
                    <input
                        type="number"
                        inputMode="numeric"
                        aria-label={line.label}
                        value={line.value ?? ''}
                        placeholder="0"
                        onChange={(e) => onValue(e.target.value === '' ? null : e.target.value)}
                        className="h-11 w-16 rounded-xl border border-[#e3e1de] bg-white text-center font-body text-base tabular-nums text-text-dark focus:outline-none focus:border-primary"
                    />
                    <button type="button" onClick={() => step(1)} aria-label={`One more: ${line.label}`}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#e3ddd0] bg-white text-text-dark hover:border-neutral-gray/50 cursor-pointer">
                        <PlusIcon size={16} weight="bold" />
                    </button>
                </div>
            </li>
        );
    }

    if (line.kind === 'text') {
        return (
            <li className="flex flex-col gap-1.5 py-3">
                <label htmlFor={`line-${line.id}`} className="font-body text-[15px] text-text-dark">
                    {line.label} <span className="text-neutral-gray">(optional)</span>
                </label>
                <textarea
                    id={`line-${line.id}`}
                    value={line.value ?? ''}
                    onChange={(e) => onValue(e.target.value || null)}
                    rows={2}
                    className="w-full min-h-11 resize-y rounded-xl border border-[#e3e1de] bg-white px-3.5 py-2.5 font-body text-sm text-text-dark focus:outline-none focus:border-primary"
                />
            </li>
        );
    }

    const choices: CheckAnswer[] = line.allows_na ? ['ok', 'problem', 'na'] : ['ok', 'problem'];
    const isProblem = line.answer === 'problem';

    return (
        <li className={`flex flex-col gap-2.5 py-3 ${mark}`}>
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1 basis-56">
                    <p className="font-body text-[15px] text-text-dark">{line.label}</p>
                    {line.weight === 'must_pass' && (
                        <span className="mt-1 inline-block rounded-full bg-rose-50 px-2 py-0.5 font-body text-[11px] font-semibold text-rose-700">
                            Food safety
                        </span>
                    )}
                    {line.help && <p className="mt-0.5 font-body text-xs text-neutral-gray">{line.help}</p>}
                </div>
                <div role="radiogroup" aria-label={line.short} className="flex items-center gap-1.5">
                    {choices.map((choice) => {
                        const selected = line.answer === choice;
                        return (
                            <button
                                key={choice}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => onChoose(choice)}
                                className={`min-h-11 rounded-xl border px-4 font-body text-sm font-semibold transition-colors duration-150 ease-out cursor-pointer ${
                                    selected ? CHOICE[choice].on : 'border-[#e3ddd0] bg-white text-text-dark hover:border-neutral-gray/50'
                                }`}
                            >
                                {CHOICE[choice].label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {isProblem && (
                <div className="flex flex-col gap-1.5">
                    <textarea
                        aria-label={`What is wrong with ${line.short}`}
                        placeholder="What is wrong? Head office reads this."
                        value={draft ?? line.note ?? ''}
                        onChange={(e) => onDescribe(e.target.value)}
                        rows={2}
                        autoFocus={unsaved}
                        className="w-full min-h-11 resize-y rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 font-body text-sm text-text-dark focus:outline-none focus:border-rose-400"
                    />
                    {unsaved && <p className="font-body text-xs text-rose-700">Say what is wrong, and it saves.</p>}
                    <PhotoStrip branchId={branchId} answer={line} onChange={onPhotos} />
                </div>
            )}

            {!isProblem && (line.photos?.length ?? 0) > 0 && (
                <PhotoStrip branchId={branchId} answer={line} onChange={onPhotos} />
            )}
        </li>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * One slide per set of questions, lines still asked only. A section's notes go
 * on its last slide, and appear only once something in the section is wrong.
 */
function buildSteps(answers: OpeningAnswer[], asked: Map<number, boolean>): Step[] {
    const steps: Step[] = [];
    const bySection = new Map<string, OpeningAnswer[]>();
    for (const a of answers) {
        if (!bySection.has(a.section)) bySection.set(a.section, []);
        bySection.get(a.section)!.push(a);
    }

    for (const [section, lines] of bySection) {
        const groups: string[] = [];
        for (const l of lines) if (l.kind !== 'text' && l.group && !groups.includes(l.group)) groups.push(l.group);

        const notes = lines.filter((l) => l.kind === 'text' && asked.get(l.id) !== false);

        groups.forEach((group, i) => {
            const inGroup = lines.filter((l) => l.kind !== 'text' && l.group === group && asked.get(l.id) !== false);
            const withNotes = i === groups.length - 1 ? [...inGroup, ...notes] : inGroup;
            if (withNotes.length) steps.push({ id: `${section}|${group}`, section, group, lines: withNotes });
        });
    }

    return steps;
}

function summarise(steps: Step[]) {
    const out: { section: string; firstStep: number; label: string; tone: typeof TONE.done }[] = [];
    steps.forEach((s, i) => {
        let entry = out.find((o) => o.section === s.section);
        if (!entry) {
            entry = { section: s.section, firstStep: i, label: '', tone: TONE.done };
            out.push(entry);
        }
    });

    for (const entry of out) {
        const lines = steps.filter((s) => s.section === entry.section).flatMap((s) => s.lines).filter((l) => l.kind !== 'text');
        const left = lines.filter((l) => !isAnswered(l)).length;
        const problems = lines.filter((l) => l.answer === 'problem').length;
        const firstGap = steps.findIndex((s) => s.section === entry.section && s.lines.some((l) => l.kind !== 'text' && !isAnswered(l)));
        if (firstGap >= 0) entry.firstStep = firstGap;
        entry.label = left ? `${left} left` : problems ? `${problems} ${problems === 1 ? 'problem' : 'problems'}` : 'Ready';
        entry.tone = left ? TONE.neutral : problems ? TONE.waiting : TONE.done;
    }

    return out;
}

function capitalise(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
