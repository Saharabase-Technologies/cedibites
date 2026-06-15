'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    EnvelopeIcon,
    PhoneIcon,
    LockKeyIcon,
    ArrowRightIcon,
    ArrowLeftIcon,
    WarningCircleIcon,
    SpinnerIcon,
    PencilSimpleIcon,
    UserCircleIcon,
} from '@phosphor-icons/react';
import Link from 'next/link';
import Input from '@/app/components/base/Input';
import StaffAuthShell, { authCardClass } from '@/app/components/auth/StaffAuthShell';
import { useStaffAuth, permissionsHomeRoute } from '@/app/components/providers/StaffAuthProvider';
import { staffService, type IdentifierCheck } from '@/lib/api/services/staff.service';
import { ApiError } from '@/lib/api/client';
import { isValidGhanaPhone, normalizeGhanaPhone } from '@/app/lib/phone';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'identifier' | 'password';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function identifierLooksValid(value: string): boolean {
    const v = value.trim();
    if (!v) return false;
    return v.includes('@') ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) : isValidGhanaPhone(v);
}

function normaliseIdentifier(value: string): string {
    const v = value.trim();
    return isValidGhanaPhone(v) ? normalizeGhanaPhone(v) : v;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StaffLoginPage() {
    const router = useRouter();
    const { login } = useStaffAuth();

    const [step, setStep] = useState<Step>('identifier');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [account, setAccount] = useState<IdentifierCheck | null>(null);

    const [identifierError, setIdentifierError] = useState<string>();
    const [passwordError, setPasswordError] = useState<string>();
    const [globalError, setGlobalError] = useState<string>();

    const [isChecking, setIsChecking] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const passwordRef = useRef<HTMLInputElement>(null);

    // Focus the password field when the second step opens.
    useEffect(() => {
        if (step === 'password') {
            const t = setTimeout(() => passwordRef.current?.focus(), 280);
            return () => clearTimeout(t);
        }
    }, [step]);

    const isEmail = identifier.includes('@');

    // ── Step 1: verify the identifier exists, then advance ──
    const continueToPassword = useCallback(async () => {
        setGlobalError(undefined);

        if (!identifier.trim()) {
            setIdentifierError('Email or phone number is required');
            return;
        }
        if (!identifierLooksValid(identifier)) {
            setIdentifierError('Enter a valid email or Ghanaian phone number');
            return;
        }

        setIsChecking(true);
        setIdentifierError(undefined);
        try {
            const result = await staffService.checkIdentifier(normaliseIdentifier(identifier));
            if (!result.exists) {
                setIdentifierError(
                    `We couldn't find a staff account for this ${isEmail ? 'email' : 'phone number'}.`
                );
                return;
            }
            setAccount(result);
            setStep('password');
        } catch (err) {
            // Don't hard-block on a flaky check — let them try the password anyway.
            if (err instanceof ApiError && err.status === 429) {
                setIdentifierError('Too many attempts. Please wait a moment and try again.');
            } else {
                setAccount(null);
                setStep('password');
            }
        } finally {
            setIsChecking(false);
        }
    }, [identifier, isEmail]);

    // ── Step 2: submit credentials ──
    const submitLogin = useCallback(async () => {
        setGlobalError(undefined);

        if (!password) {
            setPasswordError('Password is required');
            return;
        }

        setIsLoading(true);
        setPasswordError(undefined);
        try {
            const { user } = await staffService.login(normaliseIdentifier(identifier), password);
            login(user);
            router.replace(
                user.must_reset_password
                    ? '/staff/change-password'
                    : permissionsHomeRoute(user.permissions ?? [])
            );
        } catch (err) {
            setGlobalError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [identifier, password, login, router]);

    const backToIdentifier = useCallback(() => {
        setStep('identifier');
        setPassword('');
        setPasswordError(undefined);
        setGlobalError(undefined);
    }, []);

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <StaffAuthShell>
            <div className={`${authCardClass} animate-scale-in overflow-hidden`}>

                {/* Heading */}
                <div className="mb-7">
                    <h2 className="text-2xl font-semibold tracking-tight text-text-dark dark:text-text-light">
                        {step === 'identifier' ? 'Welcome back' : `Hi${account?.name ? `, ${account.name.split(' ')[0]}` : ''}`}
                    </h2>
                    <p className="mt-1 text-sm text-neutral-gray">
                        {step === 'identifier'
                            ? 'Sign in with the credentials your admin provided.'
                            : 'Enter your password to continue.'}
                    </p>
                </div>

                {/* Global error banner */}
                {globalError && (
                    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-error/30 bg-error/10 px-4 py-3 animate-fade-in-down">
                        <WarningCircleIcon size={20} weight="fill" className="mt-0.5 shrink-0 text-error" />
                        <p className="text-sm leading-snug text-error">{globalError}</p>
                    </div>
                )}

                {/* ── Step 1: identifier ── */}
                {step === 'identifier' && (
                    <form
                        onSubmit={e => { e.preventDefault(); continueToPassword(); }}
                        noValidate
                        className="flex flex-col gap-5 animate-slide-in-left"
                    >
                        <div>
                            <label htmlFor="identifier" className="mb-1.5 block text-sm font-medium text-text-dark dark:text-neutral-light">
                                Email or Phone <span className="text-primary" aria-hidden="true">*</span>
                            </label>
                            <Input
                                id="identifier"
                                name="identifier"
                                type="text"
                                placeholder="you@cedibites.com or 024 000 0000"
                                value={identifier}
                                onChange={val => { setIdentifier(val); setIdentifierError(undefined); }}
                                onEnter={continueToPassword}
                                leftIcon={isEmail
                                    ? <EnvelopeIcon size={20} weight="bold" />
                                    : <PhoneIcon size={20} weight="bold" />}
                                errorText={identifierError}
                                autoComplete="username"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isChecking}
                            className="mt-1 flex w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-primary px-6 py-4 text-base font-semibold text-brand-darker transition-all duration-150 hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isChecking ? (
                                <><SpinnerIcon size={20} weight="bold" className="animate-spin" /> Checking…</>
                            ) : (
                                <>Continue <ArrowRightIcon size={20} weight="bold" /></>
                            )}
                        </button>

                        <div className="text-center">
                            <Link
                                href="/staff/forgot-password"
                                className="text-xs text-neutral-gray transition-colors hover:text-primary"
                            >
                                Forgot your password?
                            </Link>
                        </div>
                    </form>
                )}

                {/* ── Step 2: password ── */}
                {step === 'password' && (
                    <form
                        onSubmit={e => { e.preventDefault(); submitLogin(); }}
                        noValidate
                        className="flex flex-col gap-5 animate-slide-in-right"
                    >
                        {/* Identifier chip */}
                        <button
                            type="button"
                            onClick={backToIdentifier}
                            className="group flex w-full items-center gap-3 rounded-2xl border border-brown-light/20 bg-neutral-light/60 px-4 py-3 text-left transition-colors hover:border-primary/40 dark:bg-brand-darker/40"
                        >
                            <UserCircleIcon size={28} weight="duotone" className="shrink-0 text-primary" />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-text-dark dark:text-text-light">
                                    {account?.name ?? identifier}
                                </span>
                                {account?.name && (
                                    <span className="block truncate text-xs text-neutral-gray">{identifier}</span>
                                )}
                            </span>
                            <span className="flex items-center gap-1 text-xs font-medium text-neutral-gray transition-colors group-hover:text-primary">
                                <PencilSimpleIcon size={14} weight="bold" /> Change
                            </span>
                        </button>

                        <div>
                            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-dark dark:text-neutral-light">
                                Password <span className="text-primary" aria-hidden="true">*</span>
                            </label>
                            <Input
                                ref={passwordRef}
                                id="password"
                                name="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={val => { setPassword(val); setPasswordError(undefined); }}
                                onEnter={submitLogin}
                                leftIcon={<LockKeyIcon size={20} weight="bold" />}
                                errorText={passwordError}
                                autoComplete="current-password"
                                required
                            />
                        </div>

                        <div className="-mt-1 text-right">
                            <Link
                                href="/staff/forgot-password"
                                className="text-xs text-neutral-gray transition-colors hover:text-primary"
                            >
                                Forgot your password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="mt-1 flex w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-primary px-6 py-4 text-base font-semibold text-brand-darker transition-all duration-150 hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isLoading ? (
                                <><SpinnerIcon size={20} weight="bold" className="animate-spin" /> Signing in…</>
                            ) : (
                                <>Sign In <ArrowRightIcon size={20} weight="bold" /></>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={backToIdentifier}
                            className="mx-auto flex items-center gap-1 text-sm text-neutral-gray transition-colors hover:text-primary"
                        >
                            <ArrowLeftIcon size={14} weight="bold" /> Use a different account
                        </button>
                    </form>
                )}
            </div>
        </StaffAuthShell>
    );
}
