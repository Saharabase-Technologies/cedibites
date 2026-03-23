'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    XIcon, PhoneIcon, ArrowRightIcon, ArrowLeftIcon,
    CheckCircleIcon, UserIcon, SpinnerGapIcon,
    DeviceMobileIcon, LockIcon, WarningCircleIcon, EnvelopeIcon,
} from '@phosphor-icons/react';
import Image from 'next/image';
import { useAuth } from '@/app/components/providers/AuthProvider';
import { useModal } from '@/app/components/providers/ModalProvider';

// ─── OTP Input (6 individual boxes) ──────────────────────────────────────────
function OTPInput({ value, onChange, disabled }: {
    value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !value[i] && i > 0) inputs.current[i - 1]?.focus();
    };

    const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const char = e.target.value.replace(/\D/g, '').slice(-1);
        const arr = value.padEnd(6, ' ').split('');
        arr[i] = char || ' ';
        const next = arr.join('').replace(/ /g, '');
        onChange(next);
        if (char && i < 5) inputs.current[i + 1]?.focus();
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted) { onChange(pasted); inputs.current[Math.min(pasted.length, 5)]?.focus(); }
        e.preventDefault();
    };

    return (
        <div className="flex items-center gap-2 justify-center" onPaste={handlePaste}>
            {Array.from({ length: 6 }).map((_, i) => (
                <input
                    key={i}
                    ref={el => { inputs.current[i] = el; }}
                    type="text" inputMode="numeric" maxLength={1}
                    value={value[i] ?? ''}
                    onChange={e => handleChange(i, e)}
                    onKeyDown={e => handleKey(i, e)}
                    onFocus={e => e.target.select()}
                    disabled={disabled}
                    className={`w-11 h-13 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all
                        bg-neutral-light dark:bg-brown/40
                        text-text-dark dark:text-text-light
                        ${value[i]
                            ? 'border-primary bg-primary/8 dark:bg-primary/15'
                            : 'border-neutral-gray/30 focus:border-primary'}
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
            ))}
        </div>
    );
}

// ─── Step: Phone + Email Entry ────────────────────────────────────────────────
function StepPhone({ onNext }: { onNext: () => void }) {
    const { sendOTP, pendingPhone, pendingEmail } = useAuth();
    const [phone, setPhone] = useState(pendingPhone || '');
    const [email, setEmail] = useState(pendingEmail || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isValid = phone.replace(/\D/g, '').length >= 9;

    const handleSubmit = async () => {
        if (!isValid) return;
        setLoading(true);
        setError('');
        const formatted = phone.startsWith('+') ? phone : `+233${phone.replace(/^0/, '')}`;
        const result = await sendOTP(formatted, email.trim() || undefined);
        setLoading(false);
        if (result.success) onNext();
        else setError(result.error ?? 'Something went wrong');
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
                    <PhoneIcon weight="fill" size={28} className="text-primary" />
                </div>
                <h2 className="text-xl font-bold text-text-dark dark:text-text-light">Sign in to CediBites</h2>
                <p className="text-sm text-neutral-gray mt-1">Enter your phone number to receive a verification code</p>
            </div>

            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-neutral-gray">Phone Number</label>
                    <div className={`flex items-center bg-neutral-light dark:bg-brand-dark border-2 rounded-2xl overflow-hidden transition-all ${error ? 'border-error' : 'border-neutral-gray/40 focus-within:border-primary'}`}>
                        <div className="flex items-center gap-2 px-4 py-3.5 border-r border-neutral-gray/20 shrink-0">
                            <span className="text-lg">🇬🇭</span>
                            <span className="text-sm font-semibold text-neutral-gray">+233</span>
                        </div>
                        <input
                            type="tel"
                            placeholder="24 000 0000"
                            value={phone}
                            onChange={e => { setPhone(e.target.value); setError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                            autoFocus
                            className="flex-1 px-4 py-3.5 bg-transparent outline-none text-text-dark dark:text-text-light placeholder:text-neutral-gray/50 text-base font-medium"
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-neutral-gray">Email <span className="font-normal text-neutral-gray/70">(optional)</span></label>
                    <div className="flex items-center bg-neutral-light dark:bg-brand-dark border-2 border-neutral-gray/40 focus-within:border-primary rounded-2xl overflow-hidden transition-all">
                        <span className="pl-4 text-neutral-gray shrink-0"><EnvelopeIcon weight="fill" size={16} /></span>
                        <input
                            type="email"
                            placeholder="e.g. kwame@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                            className="flex-1 px-3 py-3.5 bg-transparent outline-none text-text-dark dark:text-text-light placeholder:text-neutral-gray/50 text-base font-medium"
                        />
                    </div>
                </div>
            </div>

            {error && (
                <p className="flex items-center gap-1.5 text-xs text-error font-medium">
                    <WarningCircleIcon size={13} weight="fill" /> {error}
                </p>
            )}

            <button
                onClick={handleSubmit} disabled={!isValid || loading}
                className={`flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98]
                    ${isValid && !loading ? 'bg-primary hover:bg-primary-hover text-white' : 'bg-neutral-gray/20 text-neutral-gray cursor-not-allowed'}`}
            >
                {loading ? <SpinnerGapIcon size={20} className="animate-spin" /> : <>Send Code <ArrowRightIcon weight="bold" size={18} /></>}
            </button>

            <p className="text-xs text-center text-neutral-gray">
                We&apos;ll send a 6-digit code via SMS. Standard rates may apply.
            </p>
        </div>
    );
}

// ─── Step: OTP Verify ─────────────────────────────────────────────────────────
function StepOTP({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
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

    const handleVerify = async (val: string) => {
        if (val.length !== 6) return;
        setLoading(true); setError('');
        const result = await verifyOTP(val);
        setLoading(false);
        if (result.success) onNext();
        else { setError(result.error ?? 'Invalid code'); setCode(''); }
    };

    const handleResend = async () => {
        setResending(true);
        await sendOTP(pendingPhone);
        setResending(false);
        setCooldown(30);
        setCode(''); setError('');
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
                    <DeviceMobileIcon weight="fill" size={28} className="text-primary" />
                </div>
                <h2 className="text-xl font-bold text-text-dark dark:text-text-light">Enter your code</h2>
                <p className="text-sm text-neutral-gray mt-1">
                    Code sent to <strong className="text-text-dark dark:text-text-light">{pendingPhone}</strong>
                </p>
            </div>

            <OTPInput value={code} onChange={val => { setCode(val); if (val.length === 6) handleVerify(val); }} disabled={loading} />

            {error && (
                <p className="flex items-center justify-center gap-1.5 text-sm text-error font-medium">
                    <WarningCircleIcon size={14} weight="fill" /> {error}
                </p>
            )}

            {loading && (
                <div className="flex items-center justify-center gap-2 text-sm text-neutral-gray">
                    <SpinnerGapIcon size={16} className="animate-spin text-primary" /> Verifying...
                </div>
            )}

            <div className="flex items-center justify-between text-sm">
                <button onClick={onBack} className="flex items-center gap-1.5 text-neutral-gray hover:text-primary transition-colors font-medium">
                    <ArrowLeftIcon weight="bold" size={14} /> Change number
                </button>
                {cooldown > 0 ? (
                    <span className="text-neutral-gray">Resend in {cooldown}s</span>
                ) : (
                    <button onClick={handleResend} disabled={resending} className="text-primary font-semibold hover:underline flex items-center gap-1">
                        {resending && <SpinnerGapIcon size={13} className="animate-spin" />}
                        Resend code
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Step: Name Entry ─────────────────────────────────────────────────────────
function StepName({ onDone }: { onDone: () => void }) {
    const { saveProfile, pendingPhone } = useAuth();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        if (!name.trim()) return;
        setLoading(true);
        setError('');
        const result = await saveProfile(name.trim(), pendingPhone);
        setLoading(false);
        if (result.success) onDone();
        else setError(result.error ?? 'Registration failed. Please try again.');
    };

    const handleSkip = async () => {
        setLoading(true);
        setError('');
        const result = await saveProfile('Guest', pendingPhone);
        setLoading(false);
        if (result.success) onDone();
        else setError(result.error ?? 'Registration failed. Please try again.');
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
                    <UserIcon weight="fill" size={28} className="text-primary" />
                </div>
                <h2 className="text-xl font-bold text-text-dark dark:text-text-light">What&apos;s your name?</h2>
                <p className="text-sm text-neutral-gray mt-1">So we can personalise your experience</p>
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-neutral-gray">Your Name</label>
                <div className={`flex items-center bg-neutral-light dark:bg-brand-dark border-2 rounded-2xl overflow-hidden transition-all ${error ? 'border-error' : 'border-neutral-gray/40 focus-within:border-primary'}`}>
                    <span className="pl-4 text-neutral-gray shrink-0"><UserIcon weight="fill" size={16} /></span>
                    <input
                        type="text"
                        placeholder="e.g. Kwame Mensah"
                        value={name}
                        onChange={e => { setName(e.target.value); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                        autoFocus
                        disabled={loading}
                        className="flex-1 px-3 py-4 bg-transparent outline-none text-text-dark dark:text-text-light placeholder:text-neutral-gray/50 text-base font-medium"
                    />
                </div>
                {error && (
                    <p className="flex items-center gap-1.5 text-xs text-error font-medium">
                        <WarningCircleIcon size={13} weight="fill" /> {error}
                    </p>
                )}
            </div>

            <button
                onClick={handleSave}
                disabled={!name.trim() || loading}
                className={`flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98]
                    ${name.trim() && !loading ? 'bg-primary hover:bg-primary-hover text-white' : 'bg-neutral-gray/20 text-neutral-gray cursor-not-allowed'}`}
            >
                {loading ? <SpinnerGapIcon size={20} className="animate-spin" /> : <>Continue <ArrowRightIcon weight="bold" size={18} /></>}
            </button>

            <button
                onClick={handleSkip}
                disabled={loading}
                className="text-sm text-center text-neutral-gray hover:text-primary transition-colors disabled:opacity-50"
            >
                Skip for now
            </button>
        </div>
    );
}

// ─── Step: Welcome ────────────────────────────────────────────────────────────
function StepDoneWelcome({ onClose }: { onClose: () => void }) {
    const { user } = useAuth();
    useEffect(() => { const t = setTimeout(onClose, 2200); return () => clearTimeout(t); }, [onClose]);

    return (
        <div className="flex flex-col items-center gap-5 py-6 text-center">
            <div className="relative">
                <div className="w-20 h-20 rounded-full bg-secondary/15 flex items-center justify-center">
                    <CheckCircleIcon weight="fill" size={44} className="text-secondary" />
                </div>
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center text-sm">
                    👋
                </div>
            </div>
            <div>
                <h2 className="text-xl font-bold text-text-dark dark:text-text-light">
                    Welcome{user?.name && user.name !== 'Guest' ? `, ${user.name.split(' ')[0]}!` : ' back!'}
                </h2>
                <p className="text-sm text-neutral-gray mt-1">You're signed in. Faster checkout awaits.</p>
            </div>
            <div className="w-full bg-neutral-gray/10 rounded-full h-1 overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-[shrink_2.2s_linear_forwards]" style={{ width: '100%' }} />
            </div>
        </div>
    );
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────
export default function AuthModal() {
    const { isAuthOpen, closeAuth } = useModal();
    const { authStep, setAuthStep, user } = useAuth();

    // Reset to phone step when modal opens (unless already logged in)
    useEffect(() => {
        if (isAuthOpen && !user) setAuthStep('phone');
    }, [isAuthOpen]);

    // Close on Escape
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAuth(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [closeAuth]);

    const handleClose = () => { closeAuth(); setTimeout(() => setAuthStep('idle'), 300); };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300
                    ${isAuthOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={handleClose}
            />

            {/* Modal */}
            <div className={`fixed z-50 bg-white dark:bg-brand-darker shadow-2xl transition-all duration-300
                inset-x-0 bottom-0 rounded-t-3xl max-h-[92dvh] overflow-y-auto
                md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
                md:w-105 md:rounded-2xl md:max-h-[90vh]
                ${isAuthOpen ? 'translate-y-0 md:opacity-100 md:scale-100' : 'translate-y-full md:opacity-0 md:scale-95 md:pointer-events-none'}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
                    <div className="flex items-center gap-2">
                        <Image src="/cblogo.webp" alt="CediBites" width={28} height={28} className="object-contain" />
                        <span className="text-sm font-bold text-neutral-gray">CediBites</span>
                    </div>
                    <button onClick={handleClose}
                        className="w-9 h-9 cursor-pointer flex items-center justify-center rounded-full hover:bg-neutral-gray/10 transition-colors">
                        <XIcon size={18} weight="bold" className="text-text-dark dark:text-text-light" />
                    </button>
                </div>

                {/* Step content */}
                <div className="px-6 pb-8 pt-2">
                    {authStep === 'phone' && (
                        <StepPhone onNext={() => setAuthStep('otp')} />
                    )}
                    {authStep === 'otp' && (
                        <StepOTP
                            onNext={() => {}}
                            onBack={() => setAuthStep('phone')}
                        />
                    )}
                    {authStep === 'naming' && (
                        <StepName onDone={() => setAuthStep('done')} />
                    )}
                    {authStep === 'done' && (
                        <StepDoneWelcome onClose={handleClose} />
                    )}
                </div>

                {/* Secure footer */}
                {authStep !== 'done' && (
                    <div className="px-6 pb-5 border-t border-neutral-gray/8 pt-4">
                        <p className="text-[10px] text-center text-neutral-gray flex items-center justify-center gap-1.5">
                            <LockIcon size={10} /> Secured · Your data is safe with CediBites
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}