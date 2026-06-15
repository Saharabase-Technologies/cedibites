'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

interface OtpInputProps {
    value: string;
    onChange: (value: string) => void;
    length?: number;
    disabled?: boolean;
    hasError?: boolean;
    autoFocus?: boolean;
    onComplete?: (value: string) => void;
}

/** Segmented numeric one-time-code input with paste / arrow / backspace support. */
export default function OtpInput({
    value,
    onChange,
    length = 6,
    disabled = false,
    hasError = false,
    autoFocus = false,
    onComplete,
}: OtpInputProps) {
    const refs = useRef<Array<HTMLInputElement | null>>([]);
    const digits = value.split('').slice(0, length);

    const emit = (next: string) => {
        const cleaned = next.replace(/\D/g, '').slice(0, length);
        onChange(cleaned);
        if (cleaned.length === length) onComplete?.(cleaned);
    };

    const focusAt = (i: number) => {
        const idx = Math.max(0, Math.min(length - 1, i));
        refs.current[idx]?.focus();
        refs.current[idx]?.select();
    };

    const handleChange = (i: number, raw: string) => {
        const char = raw.replace(/\D/g, '').slice(-1);
        if (!char) return;
        const arr = value.split('');
        arr[i] = char;
        const next = arr.join('').slice(0, length);
        emit(next);
        if (i < length - 1) focusAt(i + 1);
    };

    const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            e.preventDefault();
            const arr = value.split('');
            if (arr[i]) {
                arr[i] = '';
                emit(arr.join(''));
            } else if (i > 0) {
                arr[i - 1] = '';
                emit(arr.join(''));
                focusAt(i - 1);
            }
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            focusAt(i - 1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            focusAt(i + 1);
        }
    };

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
        if (!pasted) return;
        emit(pasted);
        focusAt(pasted.length);
    };

    return (
        <div className="flex items-center justify-between gap-2 sm:gap-3" role="group" aria-label="One-time code">
            {Array.from({ length }).map((_, i) => (
                <input
                    key={i}
                    ref={el => { refs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    disabled={disabled}
                    autoFocus={autoFocus && i === 0}
                    value={digits[i] ?? ''}
                    onChange={e => handleChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    onFocus={e => e.target.select()}
                    aria-label={`Digit ${i + 1}`}
                    className={`h-14 w-full min-w-0 rounded-2xl border-2 bg-neutral-light text-center text-xl font-semibold text-text-dark outline-none transition-all duration-150 disabled:opacity-50 dark:bg-brand-dark dark:text-text-light
                        ${hasError ? 'border-error' : 'border-neutral-gray/40 focus:border-primary'}`}
                />
            ))}
        </div>
    );
}
