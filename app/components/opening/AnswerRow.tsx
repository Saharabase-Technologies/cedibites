'use client';

import { useState } from 'react';
import { SpinnerIcon } from '@phosphor-icons/react';
import { openingService, type AnswerPayload } from '@/lib/api/services/opening.service';
import { toast } from '@/lib/utils/toast';
import type { CheckAnswer, OpeningAnswer } from '@/types/opening';
import { PhotoStrip } from './PhotoStrip';

const CHOICE_STYLE: Record<CheckAnswer, string> = {
    ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    problem: 'bg-rose-50 text-rose-700 border-rose-200',
    na: 'bg-neutral-light text-text-dark border-[#e3ddd0]',
};

const CHOICE_LABEL: Record<CheckAnswer, string> = {
    ok: 'Yes',
    problem: 'Problem',
    na: 'Not needed',
};

/**
 * One line of the checklist.
 *
 * Every answer saves as it is given, so a till that restarts halfway loses
 * nothing and a second device sees the same checklist. A problem is only saved
 * once it says what the problem is: "Problem" on its own tells head office
 * nothing they can act on.
 */
export function AnswerRow({
    branchId,
    answer,
    myUserId,
    locked,
    highlighted,
    onChange,
}: {
    branchId: number;
    answer: OpeningAnswer;
    myUserId?: number;
    /** After the checklist is finished: shown, not changed. */
    locked: boolean;
    /** Still needs an answer, and the manager just tried to open. */
    highlighted: boolean;
    onChange: (answer: OpeningAnswer) => void;
}) {
    const [saving, setSaving] = useState(false);
    const [pendingProblem, setPendingProblem] = useState(false);
    const [note, setNote] = useState(answer.note ?? '');
    const [value, setValue] = useState(answer.value ?? '');

    const showsProblem = answer.answer === 'problem' || pendingProblem;

    async function save(payload: AnswerPayload) {
        setSaving(true);
        try {
            const saved = await openingService.answer(branchId, answer.id, payload);
            onChange(saved);
            setPendingProblem(false);
            return true;
        } catch (err) {
            toast.error((err as Error).message || 'That answer did not save. Try again.');
            return false;
        } finally {
            setSaving(false);
        }
    }

    function choose(choice: CheckAnswer) {
        if (locked || saving) return;
        if (choice === 'problem') {
            // Wait for the note before saving.
            if (note.trim().length >= 3) void save({ answer: 'problem', note });
            else setPendingProblem(true);
            return;
        }
        setPendingProblem(false);
        void save({ answer: choice, note: null });
        setNote('');
    }

    function saveNote() {
        if (locked) return;
        const trimmed = note.trim();
        if (trimmed.length < 3) return;
        if (trimmed === (answer.note ?? '') && answer.answer === 'problem') return;
        void save({ answer: 'problem', note: trimmed });
    }

    const ring = highlighted ? 'ring-2 ring-rose-300 ring-offset-2 ring-offset-neutral-card rounded-xl' : '';

    // ── A number ─────────────────────────────────────────────────────────
    if (answer.kind === 'number') {
        return (
            <li className={`flex items-center justify-between gap-4 py-3 ${ring}`}>
                <label htmlFor={`a-${answer.id}`} className="text-sm font-body text-text-dark">{answer.label}</label>
                <div className="flex items-center gap-2">
                    {saving && <SpinnerIcon size={14} className="animate-spin text-neutral-gray" />}
                    <input
                        id={`a-${answer.id}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={999}
                        disabled={locked}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onBlur={() => {
                            if (value !== (answer.value ?? '')) void save({ value: value === '' ? null : Number(value) });
                        }}
                        className="w-20 min-h-11 rounded-xl border border-[#e3e1de] bg-[#f5f4f2] px-3 text-right text-sm font-body tabular-nums text-text-dark focus:outline-none focus:border-primary disabled:opacity-60"
                    />
                </div>
            </li>
        );
    }

    // ── A note ───────────────────────────────────────────────────────────
    if (answer.kind === 'text') {
        return (
            <li className="flex flex-col gap-1.5 py-3">
                <label htmlFor={`a-${answer.id}`} className="text-sm font-body text-text-dark">
                    {answer.label} <span className="text-neutral-gray">(optional)</span>
                </label>
                <textarea
                    id={`a-${answer.id}`}
                    disabled={locked}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={() => {
                        if (value !== (answer.value ?? '')) void save({ value: value.trim() || null });
                    }}
                    rows={2}
                    className="w-full min-h-11 resize-y rounded-xl border border-[#e3e1de] bg-[#f5f4f2] px-3.5 py-2.5 text-sm font-body text-text-dark focus:outline-none focus:border-primary disabled:opacity-60"
                />
            </li>
        );
    }

    // ── A yes-or-no line ─────────────────────────────────────────────────
    const choices: CheckAnswer[] = answer.allows_na ? ['ok', 'problem', 'na'] : ['ok', 'problem'];

    return (
        <li className={`flex flex-col gap-2.5 py-3 ${ring}`}>
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1 basis-60">
                    <p className="text-sm font-body text-text-dark">{answer.label}</p>
                    {answer.weight === 'must_pass' && (
                        <span className="mt-1 inline-block rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold font-body text-rose-700">
                            Food safety
                        </span>
                    )}
                    {answer.help && <p className="mt-0.5 text-xs font-body text-neutral-gray">{answer.help}</p>}
                </div>

                <div className="flex items-center gap-1.5">
                    {saving && <SpinnerIcon size={14} className="animate-spin text-neutral-gray" />}
                    {!locked && !showsProblem && !(answer.photos?.length) && (
                        <PhotoStrip branchId={branchId} answer={answer} myUserId={myUserId} onChange={onChange} compact />
                    )}
                    <div role="radiogroup" aria-label={answer.short} className="flex items-center gap-1.5">
                    {choices.map((choice) => {
                        const selected = answer.answer === choice || (choice === 'problem' && pendingProblem);
                        return (
                            <button
                                key={choice}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                disabled={locked}
                                onClick={() => choose(choice)}
                                className={`min-h-11 rounded-xl border px-4 text-sm font-semibold font-body transition-colors duration-150 ease-out cursor-pointer disabled:cursor-default ${
                                    selected ? CHOICE_STYLE[choice] : 'bg-white text-text-dark border-[#e3ddd0] hover:border-neutral-gray/50'
                                } ${locked && !selected ? 'opacity-40' : ''}`}
                            >
                                {CHOICE_LABEL[choice]}
                            </button>
                        );
                    })}
                    </div>
                </div>
            </div>

            {showsProblem && (
                <div className="flex flex-col gap-1.5">
                    <textarea
                        aria-label={`What is wrong with ${answer.short}`}
                        placeholder="What is wrong? Head office reads this."
                        disabled={locked}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        onBlur={saveNote}
                        rows={2}
                        autoFocus={pendingProblem}
                        className="w-full min-h-11 resize-y rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-sm font-body text-text-dark focus:outline-none focus:border-rose-400 disabled:opacity-70"
                    />
                    {pendingProblem && answer.answer !== 'problem' && (
                        <p className="text-xs font-body text-rose-700">Say what is wrong to save this answer.</p>
                    )}
                </div>
            )}

            {(showsProblem || (answer.photos?.length ?? 0) > 0) && (
                <PhotoStrip branchId={branchId} answer={answer} myUserId={myUserId} onChange={onChange} readOnly={locked} />
            )}
        </li>
    );
}
