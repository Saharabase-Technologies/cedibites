'use client';

import { useEffect, useRef, useState } from 'react';
import { CircleNotchIcon, WarningIcon } from '@phosphor-icons/react';

interface PasscodeDialogProps {
    open: boolean;
    title: string;
    /** What is about to happen, in the words of somebody who will regret it. */
    description?: string;
    /** Red confirm button and a warning rule — for anything that cannot be undone. */
    danger?: boolean;
    confirmLabel?: string;
    onConfirm: (passcode: string) => void;
    onCancel: () => void;
    loading: boolean;
}

/**
 * The 6-digit gate in front of every irreversible platform action.
 *
 * Shared rather than copied because it had drifted between the health page and
 * the error feed, and a confirmation dialog that looks slightly different each
 * time it appears is one people stop reading.
 *
 * The open check lives out here, one level above the state, so the box mounts
 * fresh every time. Holding the state above the check would leave the previous
 * code sitting in the input when the dialog is reopened for a different — and
 * possibly destructive — action, one Enter away from running.
 */
export function PasscodeDialog(props: PasscodeDialogProps) {
    if (!props.open) return null;

    return <PasscodeBox {...props} />;
}

function PasscodeBox({
    title,
    description,
    danger = false,
    confirmLabel = 'Confirm',
    onConfirm,
    onCancel,
    loading,
}: PasscodeDialogProps) {
    const [code, setCode] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const t = setTimeout(() => inputRef.current?.focus(), 50);

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !loading) onCancel();
        };

        window.addEventListener('keydown', onKey);

        return () => {
            clearTimeout(t);
            window.removeEventListener('keydown', onKey);
        };
    }, [loading, onCancel]);

    const submit = () => {
        if (code.length === 6 && !loading) onConfirm(code);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => !loading && onCancel()}
        >
            <div
                className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                <h3 className="text-base font-bold font-body text-text-dark mb-1">{title}</h3>

                {description && (
                    <p className="text-xs font-body text-neutral-gray mb-3">{description}</p>
                )}

                {danger && (
                    <div className="flex items-start gap-2 rounded-xl bg-error/5 border border-error/20 px-3 py-2 mb-3">
                        <WarningIcon size={14} className="text-error shrink-0 mt-0.5" weight="fill" />
                        <p className="text-[11px] font-body text-error">This cannot be undone.</p>
                    </div>
                )}

                <p className="text-xs font-body text-neutral-gray mb-3">
                    Enter your 6-digit passcode to confirm.
                </p>

                <input
                    ref={inputRef}
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    placeholder="000000"
                    className="w-full px-4 py-3 rounded-xl border border-[#f0e8d8] text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4"
                />

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-[#f0e8d8] text-sm font-medium font-body text-neutral-gray hover:bg-neutral-light transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={loading || code.length !== 6}
                        className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold font-body transition-colors disabled:opacity-50 cursor-pointer ${
                            danger ? 'bg-error hover:bg-error/90' : 'bg-primary hover:bg-primary-dark'
                        }`}
                    >
                        {loading ? <CircleNotchIcon size={16} className="animate-spin mx-auto" /> : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PasscodeDialog;
