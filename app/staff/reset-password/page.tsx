'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { LockKeyIcon, ArrowRightIcon, SpinnerIcon, CheckCircleIcon } from '@phosphor-icons/react';
import Input from '@/app/components/base/Input';
import { staffService } from '@/lib/api/services/staff.service';
import { getErrorMessage } from '@/lib/utils/error-handler';

function ResetPasswordForm() {
    const router = useRouter();
    const params = useSearchParams();
    const token = params.get('token') ?? '';
    const identifier = params.get('identifier') ?? '';

    const [form, setForm] = useState({ password: '', confirm: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!form.password) { e.password = 'New password is required'; }
        else if (form.password.length < 8) { e.password = 'Password must be at least 8 characters'; }
        if (form.confirm !== form.password) { e.confirm = 'Passwords do not match'; }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        if (!token || !identifier) {
            setErrors({ global: 'This reset link is invalid. Please request a new one.' });
            return;
        }
        setIsLoading(true);
        try {
            await staffService.resetPassword(token, identifier, form.password, form.confirm);
            setSuccess(true);
            setTimeout(() => router.replace('/staff/login'), 3000);
        } catch (err) {
            setErrors({ global: getErrorMessage(err) });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="dark:bg-brand-dark bg-white/75 rounded-3xl p-8 shadow border border-brown-light/20">
            {success ? (
                <div className="flex flex-col items-center gap-4 text-center py-4">
                    <CheckCircleIcon size={48} weight="fill" className="text-primary" />
                    <h2 className="text-text-dark dark:text-text-light text-xl font-semibold font-body">Password reset!</h2>
                    <p className="text-neutral-gray text-sm font-body leading-relaxed">
                        Your password has been updated. Redirecting you to sign in…
                    </p>
                </div>
            ) : (
                <>
                    <div className="mb-8">
                        <h2 className="text-text-dark dark:text-text-light text-2xl font-semibold font-body tracking-tight">
                            Set a new password
                        </h2>
                        <p className="text-neutral-gray text-sm mt-1 font-body">
                            Choose a strong password for your account.
                        </p>
                    </div>

                    {errors.global && (
                        <div className="mb-6 flex items-start gap-3 bg-error/10 border border-error/30 rounded-2xl px-4 py-3">
                            <p className="text-error text-sm font-body leading-snug">{errors.global}</p>
                        </div>
                    )}

                    <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} noValidate className="flex flex-col gap-5">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-1.5 font-body">
                                New Password <span className="text-primary" aria-hidden="true">*</span>
                            </label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="At least 8 characters"
                                value={form.password}
                                onChange={val => { setForm(p => ({ ...p, password: val })); setErrors(p => ({ ...p, password: undefined as unknown as string })); }}
                                onEnter={handleSubmit}
                                leftIcon={<LockKeyIcon size={20} weight="bold" />}
                                errorText={errors.password}
                                autoComplete="new-password"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="confirm" className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-1.5 font-body">
                                Confirm Password <span className="text-primary" aria-hidden="true">*</span>
                            </label>
                            <Input
                                id="confirm"
                                name="confirm"
                                type="password"
                                placeholder="Repeat your new password"
                                value={form.confirm}
                                onChange={val => { setForm(p => ({ ...p, confirm: val })); setErrors(p => ({ ...p, confirm: undefined as unknown as string })); }}
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
                            className="mt-2 w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed text-brand-darker font-semibold font-body py-4 px-6 rounded-full transition-all duration-150 active:scale-[0.98] text-base cursor-pointer"
                        >
                            {isLoading ? (
                                <><SpinnerIcon size={20} weight="bold" className="animate-spin" /> Resetting…</>
                            ) : (
                                <>Reset Password <ArrowRightIcon size={20} weight="bold" /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link href="/staff/login" className="text-neutral-gray text-sm font-body hover:text-primary">
                            Back to Sign In
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="h-screen bg-neutral-light dark:bg-brand-darker flex flex-col items-center justify-center px-4 py-12">

            <div
                className="fixed inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e49925' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E")`,
                }}
                aria-hidden="true"
            />

            <div className="relative w-full max-w-md">

                <div className="flex flex-col items-center mb-10">
                    <Image src="/cblogo.webp" alt="CediBites" width={72} height={72} className="mb-4" priority />
                    <h1 className="text-primary text-3xl font-bold font-body tracking-tight">CediBites</h1>
                    <p className="text-neutral-gray text-sm mt-1 font-body">Staff Portal</p>
                </div>

                <Suspense fallback={null}>
                    <ResetPasswordForm />
                </Suspense>

                <p className="text-center text-neutral-gray/40 text-xs mt-6 font-body">
                    CediBites &copy; {new Date().getFullYear()} &mdash; Internal Staff Portal
                </p>
            </div>
        </div>
    );
}
