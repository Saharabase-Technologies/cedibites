'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    LockKeyIcon,
    ArrowRightIcon,
    ArrowLeftIcon,
    SpinnerIcon,
    CheckCircleIcon,
    EnvelopeIcon,
    PaperPlaneTiltIcon,
} from '@phosphor-icons/react';
import Input from '@/app/components/base/Input';
import OtpInput from '@/app/components/auth/OtpInput';
import StaffAuthShell, { authCardClass } from '@/app/components/auth/StaffAuthShell';
import { staffService } from '@/lib/api/services/staff.service';
import { getErrorMessage } from '@/lib/utils/error-handler';

const RESEND_COOLDOWN = 45; // seconds

function ResetPasswordForm() {
    const router = useRouter();
    const params = useSearchParams();
    const token = params.get('token') ?? '';
    const justSent = params.get('sent') === '1';

    const linkMode = !!token;

    const [identifier, setIdentifier] = useState(params.get('identifier') ?? '');
    const [otp, setOtp] = useState('');
    const [form, setForm] = useState({ password: '', confirm: '' });
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const [resendIn, setResendIn] = useState(justSent ? RESEND_COOLDOWN : 0);
    const [resending, setResending] = useState(false);
    const [resendNote, setResendNote] = useState('');

    // Resend cooldown ticker
    useEffect(() => {
        if (resendIn <= 0) return;
        const t = setInterval(() => setResendIn(s => (s <= 1 ? 0 : s - 1)), 1000);
        return () => clearInterval(t);
    }, [resendIn]);

    const validate = (): boolean => {
        const e: Record<string, string | undefined> = {};
        if (!linkMode && !identifier.trim()) e.identifier = 'Enter your email or phone number';
        if (!linkMode && otp.length !== 6) e.otp = 'Enter the 6-digit code';
        if (!form.password) e.password = 'New password is required';
        else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
        if (form.confirm !== form.password) e.confirm = 'Passwords do not match';
        setErrors(e);
        return Object.values(e).every(v => !v);
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        if (linkMode && !identifier) {
            setErrors({ global: 'This reset link is invalid. Please request a new one.' });
            return;
        }
        setIsLoading(true);
        setErrors({});
        try {
            await staffService.resetPassword({
                identifier,
                password: form.password,
                password_confirmation: form.confirm,
                ...(linkMode ? { token } : { otp }),
            });
            setSuccess(true);
            setTimeout(() => router.replace('/staff/login'), 2500);
        } catch (err) {
            setErrors({ global: getErrorMessage(err) });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = useCallback(async () => {
        if (resendIn > 0 || resending || !identifier.trim()) return;
        setResending(true);
        setResendNote('');
        try {
            await staffService.forgotPassword(identifier);
            setResendNote('A new code is on its way.');
            setResendIn(RESEND_COOLDOWN);
        } catch (err) {
            setResendNote(getErrorMessage(err));
        } finally {
            setResending(false);
        }
    }, [identifier, resendIn, resending]);

    if (success) {
        return (
            <div className={`${authCardClass} animate-scale-in`}>
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                    <CheckCircleIcon size={52} weight="fill" className="text-secondary animate-scale-in" />
                    <h2 className="text-xl font-semibold text-text-dark dark:text-text-light">Password reset!</h2>
                    <p className="text-sm leading-relaxed text-neutral-gray">
                        Your password has been updated. Redirecting you to sign in…
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`${authCardClass} animate-scale-in`}>
            <div className="mb-7">
                <h2 className="text-2xl font-semibold tracking-tight text-text-dark dark:text-text-light">
                    {linkMode ? 'Set a new password' : 'Enter your reset code'}
                </h2>
                <p className="mt-1 text-sm text-neutral-gray">
                    {linkMode
                        ? 'Choose a strong password for your account.'
                        : 'We sent a 6-digit code to your email and phone. Enter it below, then choose a new password.'}
                </p>
            </div>

            {errors.global && (
                <div className="mb-6 rounded-2xl border border-error/30 bg-error/10 px-4 py-3 animate-fade-in-down">
                    <p className="text-sm leading-snug text-error">{errors.global}</p>
                </div>
            )}

            <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} noValidate className="flex flex-col gap-5">

                {/* OTP mode: identifier (only if not supplied) + code */}
                {!linkMode && (
                    <>
                        {!params.get('identifier') && (
                            <div>
                                <label htmlFor="identifier" className="mb-1.5 block text-sm font-medium text-text-dark dark:text-neutral-light">
                                    Email or Phone <span className="text-primary" aria-hidden="true">*</span>
                                </label>
                                <Input
                                    id="identifier"
                                    name="identifier"
                                    type="text"
                                    placeholder="you@cedibites.com or 024 XXX XXXX"
                                    value={identifier}
                                    onChange={val => { setIdentifier(val); setErrors(p => ({ ...p, identifier: undefined })); }}
                                    leftIcon={<EnvelopeIcon size={20} weight="bold" />}
                                    errorText={errors.identifier}
                                    autoComplete="username"
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label className="mb-2 block text-sm font-medium text-text-dark dark:text-neutral-light">
                                Verification code <span className="text-primary" aria-hidden="true">*</span>
                            </label>
                            <OtpInput
                                value={otp}
                                onChange={val => { setOtp(val); setErrors(p => ({ ...p, otp: undefined })); }}
                                hasError={!!errors.otp}
                                autoFocus={!!params.get('identifier')}
                                onComplete={() => setErrors(p => ({ ...p, otp: undefined }))}
                            />
                            {errors.otp && <p className="mt-1.5 px-1 text-sm text-error">{errors.otp}</p>}

                            <div className="mt-3 flex items-center justify-between px-1">
                                <span className="text-xs text-neutral-gray">{resendNote}</span>
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={resendIn > 0 || resending}
                                    className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary-hover disabled:cursor-not-allowed disabled:text-neutral-gray"
                                >
                                    {resending
                                        ? <SpinnerIcon size={14} weight="bold" className="animate-spin" />
                                        : <PaperPlaneTiltIcon size={14} weight="bold" />}
                                    {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                <div>
                    <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-dark dark:text-neutral-light">
                        New Password <span className="text-primary" aria-hidden="true">*</span>
                    </label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="At least 8 characters"
                        value={form.password}
                        onChange={val => { setForm(p => ({ ...p, password: val })); setErrors(p => ({ ...p, password: undefined })); }}
                        onEnter={handleSubmit}
                        leftIcon={<LockKeyIcon size={20} weight="bold" />}
                        errorText={errors.password}
                        autoComplete="new-password"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-text-dark dark:text-neutral-light">
                        Confirm Password <span className="text-primary" aria-hidden="true">*</span>
                    </label>
                    <Input
                        id="confirm"
                        name="confirm"
                        type="password"
                        placeholder="Repeat your new password"
                        value={form.confirm}
                        onChange={val => { setForm(p => ({ ...p, confirm: val })); setErrors(p => ({ ...p, confirm: undefined })); }}
                        onEnter={handleSubmit}
                        leftIcon={<LockKeyIcon size={20} weight="bold" />}
                        errorText={errors.confirm}
                        autoComplete="new-password"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-1 flex w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-primary px-6 py-4 text-base font-semibold text-brand-darker transition-all duration-150 hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isLoading ? (
                        <><SpinnerIcon size={20} weight="bold" className="animate-spin" /> Resetting…</>
                    ) : (
                        <>Reset Password <ArrowRightIcon size={20} weight="bold" /></>
                    )}
                </button>
            </form>

            <div className="mt-6 text-center">
                <Link href="/staff/login" className="flex items-center justify-center gap-1 text-sm text-neutral-gray transition-colors hover:text-primary">
                    <ArrowLeftIcon size={14} weight="bold" /> Back to Sign In
                </Link>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <StaffAuthShell tagline={'Almost there.\nSecure your account\nwith a new password.'}>
            <Suspense fallback={null}>
                <ResetPasswordForm />
            </Suspense>
        </StaffAuthShell>
    );
}
