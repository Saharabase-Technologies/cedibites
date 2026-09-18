'use client';

import BottomSheet from '@/app/components/ui/BottomSheet';
import { SpinnerGapIcon, XIcon } from '@phosphor-icons/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Field, ReviewRow, controlClass } from './Field';

/** What happened when a code was tried. A message comes back whenever it was not applied. */
export type CodeResult =
    | { applied: true }
    | { applied: false; message: string; tone: 'error' | 'info' };

/**
 * Where a promo code is typed.
 *
 * Opened from the one "Promo code" row on the review, the same way "Add a note"
 * opens its sheet, so the review keeps one control per thing. The server
 * answers every code, and its sentence is shown as it stands: "CEDI20 ended on
 * 12 September" tells somebody what to do next, where "Invalid code" does not.
 */
export default function PromoCodeSheet({ open, onClose, applied, onApply, onRemove }: {
    open: boolean;
    /**
     * Must keep its identity between renders. BottomSheet re-runs its focus
     * effect when this changes, which pulls focus out of the box being typed in.
     */
    onClose: () => void;
    /** The code already on the order, if there is one. */
    applied: string | null;
    onApply: (code: string) => Promise<CodeResult>;
    onRemove: () => void;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [typed, setTyped] = useState('');
    const [checking, setChecking] = useState(false);
    const [answer, setAnswer] = useState<{ message: string; tone: 'error' | 'info' } | null>(null);

    // BottomSheet takes focus in its own effect, which runs after this one's
    // parent, so a plain autoFocus loses the race.
    useEffect(() => {
        if (!open) return;
        const t = setTimeout(() => input.current?.focus(), 60);
        return () => clearTimeout(t);
    }, [open]);

    // Closing clears the last attempt, so the next opening starts empty. Stable
    // for as long as the parent's `onClose` is, for the reason given above.
    const close = useCallback(() => {
        setTyped('');
        setAnswer(null);
        onClose();
    }, [onClose]);

    const code = typed.replace(/\s+/g, '').toUpperCase();

    const apply = async () => {
        if (!code || checking) return;
        setChecking(true);
        setAnswer(null);
        const result = await onApply(code);
        setChecking(false);
        if (result.applied) {
            close();
        } else {
            setAnswer({ message: result.message, tone: result.tone });
        }
    };

    const header = (
        <div className="flex items-center gap-2 px-5 pb-3 pt-1 sm:pt-5">
            <h2 className="flex-1 text-lg font-bold text-fg">Promo code</h2>
            <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-fg-muted transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-fg"
            >
                <XIcon size={18} weight="bold" />
            </button>
        </div>
    );

    const footer = (
        <div className="px-5 pb-5 pt-3">
            <button
                type="button"
                onClick={apply}
                disabled={!code || checking}
                className={`flex min-h-15 w-full items-center justify-center gap-2 rounded-xl px-5 text-base font-bold transition-[filter] duration-150 ease-out ${
                    code
                        ? 'bg-primary-fill text-white hover:brightness-95 disabled:opacity-80 disabled:hover:brightness-100'
                        : 'bg-fg/10 text-fg-muted'
                }`}
            >
                {checking && <SpinnerGapIcon size={17} className="animate-spin" />}
                {checking ? 'Checking' : 'Apply'}
            </button>
        </div>
    );

    return (
        <BottomSheet open={open} onClose={close} label="Promo code" header={header} footer={footer}>
            <div className="flex flex-col gap-5 px-5 pb-6 pt-1">
                {applied && (
                    <ReviewRow caption="On this order" value={applied} placeholder="" action="Remove" onPress={() => { onRemove(); close(); }} />
                )}

                <Field
                    label={applied ? 'Use a different code' : 'Code'}
                    error={answer?.tone === 'error' ? answer.message : undefined}
                    hint={answer?.tone === 'info'
                        ? <p className="text-[13px] leading-snug text-fg-muted">{answer.message}</p>
                        : undefined}
                >
                    <input
                        ref={input}
                        value={typed}
                        onChange={e => { setTyped(e.target.value); setAnswer(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void apply(); } }}
                        maxLength={24}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        enterKeyHint="done"
                        aria-invalid={answer?.tone === 'error'}
                        className={`${controlClass} font-semibold uppercase tracking-[0.08em]`}
                    />
                </Field>
            </div>
        </BottomSheet>
    );
}
