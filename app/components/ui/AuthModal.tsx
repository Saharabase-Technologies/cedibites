'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
    ArrowLeftIcon, ArrowRightIcon, SpinnerGapIcon, XIcon,
} from '@phosphor-icons/react';
import { useAuth } from '@/app/components/providers/AuthProvider';
import { useModal } from '@/app/components/providers/ModalProvider';
import { normalizeGhanaPhone } from '@/app/lib/phone';
import BottomSheet from './BottomSheet';

/**
 * Signing in.
 *
 * The old screen was three centred blocks in a row: a tinted circle holding an
 * icon, a heading, and a line of explanation under it — the shape every
 * generated interface arrives in. It also hand-rolled its own sheet, its own
 * backdrop and its own Escape handler while the cart, the item sheet and the
 * branch picker all shared BottomSheet, so it was the one panel on the customer
 * side you could not drag shut.
 *
 * What replaces it is loud rather than decorated. The red block heading off the
 * flyers, left aligned; the number set in the display face at a size you can
 * read across a table; nothing centred, no icon tiles, and one instruction per
 * screen. The boldness is scale and weight, not a red panel — filling large
 * chrome with #f40002 is the one thing the brand rules say not to do.
 */

// ─── Shared pieces ────────────────────────────────────────────────────────────

/** White on #f40002 is 4.33:1: display size or it does not exist. */
function Block({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-block bg-primary px-2.5 py-1.5 font-brand text-[22px] uppercase leading-none tracking-[0.03em] text-white">
            {children}
        </span>
    );
}

function PrimaryButton({ children, onClick, disabled, loading }: {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary-fill px-5 text-[15px] font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95 disabled:bg-surface-sunken disabled:text-fg-subtle"
        >
            {loading ? <SpinnerGapIcon size={18} className="animate-spin" /> : children}
        </button>
    );
}

function Problem({ children }: { children: React.ReactNode }) {
    return <p className="text-[13px] font-semibold leading-relaxed text-danger-ink">{children}</p>;
}

/**
 * Focus, after the sheet has taken it.
 *
 * BottomSheet moves focus to the panel in an effect so Tab is trapped from the
 * first keystroke, and a parent's effect runs after its children's. A plain
 * `autoFocus` here loses that race every time, which is why the keyboard never
 * came up on the number.
 */
function useDelayedFocus(ref: React.RefObject<HTMLInputElement | null>) {
    useEffect(() => {
        const t = setTimeout(() => ref.current?.focus(), 60);
        return () => clearTimeout(t);
    }, [ref]);
}

// ─── The code boxes ───────────────────────────────────────────────────────────

function CodeBoxes({ value, onChange, disabled, invalid }: {
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
    invalid?: boolean;
}) {
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        const t = setTimeout(() => inputs.current[0]?.focus(), 60);
        return () => clearTimeout(t);
    }, []);

    const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !value[i] && i > 0) inputs.current[i - 1]?.focus();
    };

    const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const char = e.target.value.replace(/\D/g, '').slice(-1);
        const arr = value.padEnd(6, ' ').split('');
        arr[i] = char || ' ';
        onChange(arr.join('').replace(/ /g, ''));
        if (char && i < 5) inputs.current[i + 1]?.focus();
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted) { onChange(pasted); inputs.current[Math.min(pasted.length, 5)]?.focus(); }
        e.preventDefault();
    };

    return (
        <div className="flex items-center gap-2" onPaste={handlePaste}>
            {Array.from({ length: 6 }).map((_, i) => (
                <input
                    key={i}
                    ref={el => { inputs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    value={value[i] ?? ''}
                    onChange={e => handleChange(i, e)}
                    onKeyDown={e => handleKey(i, e)}
                    onFocus={e => e.target.select()}
                    disabled={disabled}
                    aria-label={`Digit ${i + 1}`}
                    className={`h-15 min-w-0 flex-1 rounded-xl border-2 bg-surface text-center font-brand text-[30px] leading-none tabular-nums text-fg outline-none transition-colors duration-150 ease-out
                        ${invalid ? 'border-danger' : value[i] ? 'border-fg' : 'border-hairline-strong focus:border-fg'}
                        ${disabled ? 'opacity-50' : ''}`}
                />
            ))}
        </div>
    );
}

// ─── Step one: the number ─────────────────────────────────────────────────────

function StepPhone({ onNext }: { onNext: () => void }) {
    const { sendOTP, pendingPhone } = useAuth();
    const [phone, setPhone] = useState(pendingPhone.replace(/^\+233/, '') || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const field = useRef<HTMLInputElement>(null);
    useDelayedFocus(field);

    const digits = phone.replace(/\D/g, '');
    const isValid = digits.replace(/^0/, '').length === 9;

    const submit = async () => {
        if (!isValid || loading) return;
        setLoading(true);
        setError('');
        const result = await sendOTP(normalizeGhanaPhone(digits.startsWith('0') ? digits : `0${digits}`));
        setLoading(false);
        if (result.success) onNext();
        else setError(result.error ?? 'That did not go through. Try again.');
    };

    return (
        <div className="flex flex-col gap-7 px-5 pb-7">
            <div>
                <Block>Sign in</Block>
                <p className="mt-4 text-sm leading-relaxed text-fg">
                    Your number is the account. We text you a six digit code. There is no
                    password to forget.
                </p>
            </div>

            <div>
                <div className={`flex min-h-14 items-center rounded-xl border-2 bg-surface transition-colors duration-150 ease-out
                    ${error ? 'border-danger' : 'border-hairline-strong focus-within:border-fg'}`}>
                    <span className="shrink-0 border-r border-hairline py-3 pl-4 pr-3.5 font-brand text-[22px] leading-none tabular-nums text-fg-muted">
                        +233
                    </span>
                    <input
                        ref={field}
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        placeholder="24 000 0000"
                        value={phone}
                        onChange={e => { setPhone(e.target.value); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && submit()}
                        className="min-w-0 flex-1 bg-transparent px-3.5 font-brand text-[22px] leading-none tabular-nums text-fg outline-none placeholder:text-fg-subtle"
                    />
                </div>
                {error && <div className="mt-2.5"><Problem>{error}</Problem></div>}
            </div>

            <div className="flex flex-col gap-3">
                <PrimaryButton onClick={submit} disabled={!isValid} loading={loading}>
                    Text me the code <ArrowRightIcon size={17} weight="bold" />
                </PrimaryButton>
                <p className="text-[13px] leading-relaxed text-fg-muted">
                    One SMS, at your network&apos;s usual rate. Nobody is called.
                </p>
            </div>
        </div>
    );
}

// ─── Step two: the code ───────────────────────────────────────────────────────

function StepCode({ onBack }: { onBack: () => void }) {
    const { verifyOTP, sendOTP, pendingPhone } = useAuth();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resending, setResending] = useState(false);
    const [cooldown, setCooldown] = useState(30);

    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    const verify = async (val: string) => {
        if (val.length !== 6) return;
        setLoading(true);
        setError('');
        const result = await verifyOTP(val);
        setLoading(false);
        // Success moves `authStep` inside the provider, so this step unmounts
        // on its own. Nothing to do here but hold the failure.
        if (!result.success) { setError(result.error ?? 'That code did not match.'); setCode(''); }
    };

    const resend = async () => {
        setResending(true);
        await sendOTP(pendingPhone);
        setResending(false);
        setCooldown(30);
        setCode('');
        setError('');
    };

    return (
        <div className="flex flex-col gap-7 px-5 pb-7">
            <div>
                <Block>Your code</Block>
                <p className="mt-4 text-sm leading-relaxed text-fg">
                    Six digits, on the way to{' '}
                    <span className="font-bold tabular-nums">{pendingPhone}</span>.
                </p>
            </div>

            <div>
                <CodeBoxes
                    value={code}
                    onChange={val => { setCode(val); setError(''); if (val.length === 6) verify(val); }}
                    disabled={loading}
                    invalid={Boolean(error)}
                />
                {error && <div className="mt-3"><Problem>{error}</Problem></div>}
                {loading && (
                    <p className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-fg-muted">
                        <SpinnerGapIcon size={14} className="animate-spin" /> Checking
                    </p>
                )}
            </div>

            <div className="flex items-center justify-between gap-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 text-[13px] font-bold text-fg underline underline-offset-4 transition-opacity duration-150 ease-out hover:opacity-70"
                >
                    <ArrowLeftIcon size={13} weight="bold" /> Wrong number
                </button>
                {cooldown > 0 ? (
                    <span className="text-[13px] tabular-nums text-fg-subtle">Send again in {cooldown}s</span>
                ) : (
                    <button
                        onClick={resend}
                        disabled={resending}
                        className="flex items-center gap-1.5 text-[13px] font-bold text-fg underline underline-offset-4 transition-opacity duration-150 ease-out hover:opacity-70 disabled:opacity-50"
                    >
                        {resending && <SpinnerGapIcon size={13} className="animate-spin" />}
                        Send it again
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Step three: the name ─────────────────────────────────────────────────────

function StepName({ onDone }: { onDone: () => void }) {
    const { saveProfile, pendingPhone } = useAuth();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const field = useRef<HTMLInputElement>(null);
    useDelayedFocus(field);

    const save = async (value: string) => {
        setLoading(true);
        setError('');
        const result = await saveProfile(value, pendingPhone);
        setLoading(false);
        if (result.success) onDone();
        else setError(result.error ?? 'We could not finish setting that up. Try again.');
    };

    return (
        <div className="flex flex-col gap-7 px-5 pb-7">
            <div>
                <Block>Your name</Block>
                <p className="mt-4 text-sm leading-relaxed text-fg">
                    It goes on the ticket, so whoever hands over the bag knows whose order it is.
                </p>
            </div>

            <div>
                <input
                    ref={field}
                    type="text"
                    autoComplete="name"
                    placeholder="Kwame Mensah"
                    value={name}
                    onChange={e => { setName(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && name.trim() && save(name.trim())}
                    disabled={loading}
                    className={`min-h-14 w-full rounded-xl border-2 bg-surface px-4 text-lg font-semibold text-fg outline-none transition-colors duration-150 ease-out placeholder:font-normal placeholder:text-fg-subtle
                        ${error ? 'border-danger' : 'border-hairline-strong focus:border-fg'}`}
                />
                {error && <div className="mt-2.5"><Problem>{error}</Problem></div>}
            </div>

            <div className="flex flex-col gap-3">
                <PrimaryButton onClick={() => save(name.trim())} disabled={!name.trim()} loading={loading}>
                    Done <ArrowRightIcon size={17} weight="bold" />
                </PrimaryButton>
                <button
                    onClick={() => save('Guest')}
                    disabled={loading}
                    className="self-start text-[13px] font-bold text-fg-muted underline underline-offset-4 transition-colors duration-150 ease-out hover:text-fg disabled:opacity-50"
                >
                    Skip, I will do it later
                </button>
            </div>
        </div>
    );
}

// ─── Step four: in ────────────────────────────────────────────────────────────

function StepWelcome({ onClose }: { onClose: () => void }) {
    const { user } = useAuth();
    useEffect(() => { const t = setTimeout(onClose, 1800); return () => clearTimeout(t); }, [onClose]);

    const first = user?.name && user.name !== 'Guest' ? user.name.trim().split(/\s+/)[0] : null;

    return (
        <div className="flex flex-col gap-4 px-5 pb-9 pt-2">
            <p className="font-brand text-[40px] uppercase leading-none tracking-[0.01em] text-fg">
                {first ? `Welcome, ${first}` : 'You are in'}
            </p>
            <p className="text-sm leading-relaxed text-fg-muted">
                Your orders and your saved addresses follow this number now, on any phone you
                sign in from.
            </p>
        </div>
    );
}

// ─── The sheet ────────────────────────────────────────────────────────────────

export default function AuthModal() {
    const { isAuthOpen, closeAuth } = useModal();
    const { authStep, setAuthStep, user } = useAuth();

    // Opening lands on the number, unless a session is already in hand.
    useEffect(() => {
        if (isAuthOpen && !user) setAuthStep('phone');
    }, [isAuthOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const close = () => { closeAuth(); setTimeout(() => setAuthStep('idle'), 300); };

    const header = (
        <div className="flex items-start justify-end px-5 pb-1 pt-1 md:pt-4">
            <button
                onClick={close}
                aria-label="Close"
                className="-mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-lg text-fg-muted transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-fg"
            >
                <XIcon size={18} weight="bold" />
            </button>
        </div>
    );

    if (!isAuthOpen) return null;

    return (
        <BottomSheet open={isAuthOpen} onClose={close} label="Sign in" header={header}>
            {/* `idle` falls through to the number. The step is set in an effect
                when the sheet opens, and a sheet that renders nothing for one
                frame — or forever, if a signed-in user reaches it — is worse
                than starting on the first question. */}
            {(authStep === 'phone' || authStep === 'idle') && <StepPhone onNext={() => setAuthStep('otp')} />}
            {authStep === 'otp' && <StepCode onBack={() => setAuthStep('phone')} />}
            {authStep === 'naming' && <StepName onDone={() => setAuthStep('done')} />}
            {authStep === 'done' && <StepWelcome onClose={close} />}
        </BottomSheet>
    );
}
