'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    LockKeyIcon,
    WarningCircleIcon,
    CheckCircleIcon,
    SpinnerIcon,
} from '@phosphor-icons/react';
import Input from '@/app/components/base/Input';
import { useStaffAuth, roleHomeRoute } from '@/app/components/providers/StaffAuthProvider';
import { staffService } from '@/lib/api/services/staff.service';

export default function ChangePasswordPage() {
    const router = useRouter();
    const { staffUser: user, login } = useStaffAuth();

    const [form, setForm] = useState({ current: '', password: '', confirm: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    function validate(): boolean {
        const e: Record<string, string> = {};
        if (!form.current) e.current = 'Current password is required';
        if (!form.password) e.password = 'New password is required';
        else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
        if (form.confirm !== form.password) e.confirm = 'Passwords do not match';
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;

        setIsLoading(true);
        setErrors({});

        try {
            await staffService.changePassword(form.current, form.password);
            setSuccess(true);

            // Update local user state so must_reset_password is cleared
            if (user) {
                login({ ...user, must_reset_password: false });
            }

            setTimeout(() => {
                router.replace(roleHomeRoute(user?.role as Parameters<typeof roleHomeRoute>[0]));
            }, 1500);
        } catch (err) {
            setErrors({
                global: err instanceof Error ? err.message : 'Failed to change password. Please try again.',
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="h-screen bg-neutral-light dark:bg-brand-darker flex flex-col items-center justify-center px-4 py-12">

            <div
                className="fixed inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e49925' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C%2Fg%3E%3C%2Fsvg%3E")`,
                }}
                aria-hidden="true"
            />

            <div className="relative w-full max-w-md">

                <div className="flex flex-col items-center mb-10">
                    <Image src="/cblogo.webp" alt="CediBites" width={72} height={72} className="mb-4" priority />
                    <h1 className="text-primary text-3xl font-bold font-body tracking-tight">CediBites</h1>
                    <p className="text-neutral-gray text-sm mt-1 font-body">Staff Portal</p>
                </div>

                <div className="dark:bg-brand-dark bg-white/75 rounded-3xl p-8 shadow border border-brown-light/20">

                    <div className="mb-8">
                        <h2 className="text-text-dark dark:text-text-light text-2xl font-semibold font-body tracking-tight">
                            Set Your Password
                        </h2>
                        <p className="text-neutral-gray text-sm mt-1 font-body">
                            Your account requires a new password before you can continue.
                        </p>
                    </div>

                    {errors.global && (
                        <div className="mb-6 flex items-start gap-3 bg-error/10 border border-error/30 rounded-2xl px-4 py-3">
                            <WarningCircleIcon size={20} weight="fill" className="text-error shrink-0 mt-0.5" />
                            <p className="text-error text-sm font-body leading-snug">{errors.global}</p>
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 flex items-start gap-3 bg-secondary/10 border border-secondary/30 rounded-2xl px-4 py-3">
                            <CheckCircleIcon size={20} weight="fill" className="text-secondary shrink-0 mt-0.5" />
                            <p className="text-secondary text-sm font-body leading-snug">Password changed! Redirecting…</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                        <div>
                            <label className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-1.5 font-body">
                                Password <span className="text-primary">*</span>
                            </label>
                            <Input
                                type="password"
                                placeholder="Enter the password from your SMS/email"
                                value={form.current}
                                onChange={v => setForm(f => ({ ...f, current: v }))}
                                leftIcon={<LockKeyIcon size={20} weight="bold" />}
                                errorText={errors.current}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-1.5 font-body">
                                New Password <span className="text-primary">*</span>
                            </label>
                            <Input
                                type="password"
                                placeholder="At least 8 characters"
                                value={form.password}
                                onChange={v => setForm(f => ({ ...f, password: v }))}
                                leftIcon={<LockKeyIcon size={20} weight="bold" />}
                                errorText={errors.password}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-1.5 font-body">
                                Confirm New Password <span className="text-primary">*</span>
                            </label>
                            <Input
                                type="password"
                                placeholder="Repeat new password"
                                value={form.confirm}
                                onChange={v => setForm(f => ({ ...f, confirm: v }))}
                                leftIcon={<LockKeyIcon size={20} weight="bold" />}
                                errorText={errors.confirm}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || success}
                            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-brand-darker font-semibold font-body rounded-2xl py-3.5 transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading
                                ? <><SpinnerIcon size={20} className="animate-spin" /> Changing Password…</>
                                : 'Set New Password'
                            }
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
