'use client';

import { useState } from 'react';
import {
    UserCircleIcon,
    EnvelopeIcon,
    PhoneIcon,
    BuildingsIcon,
    LockKeyIcon,
    CheckCircleIcon,
    WarningCircleIcon,
    SpinnerIcon,
} from '@phosphor-icons/react';
import Input from '@/app/components/base/Input';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { usePartnerScope } from '@/app/components/providers/PartnerScopeProvider';
import { staffService } from '@/lib/api/services/staff.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-[#f0e8d8] last:border-0">
            <div className="w-8 h-8 rounded-lg bg-neutral-light flex items-center justify-center shrink-0 mt-0.5">
                <Icon size={14} weight="fill" className="text-neutral-gray" />
            </div>
            <div className="min-w-0">
                <p className="text-neutral-gray text-[11px] font-body uppercase tracking-wider">{label}</p>
                <p className="text-text-dark text-sm font-body font-medium mt-0.5 break-words">{value}</p>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartnerProfilePage() {
    const { staffUser } = useStaffAuth();
    const { branches } = usePartnerScope();

    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState<string>();
    const [success, setSuccess] = useState(false);
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        setError(undefined);
        setSuccess(false);

        if (!current || !next) { setError('Please fill in all password fields.'); return; }
        if (next.length < 8) { setError('Your new password must be at least 8 characters.'); return; }
        if (next !== confirm) { setError('The new passwords do not match.'); return; }
        if (next === current) { setError('Your new password must be different from the current one.'); return; }

        setSaving(true);
        try {
            await staffService.changePassword(current, next);
            setSuccess(true);
            setCurrent(''); setNext(''); setConfirm('');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not update your password. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const name = staffUser?.name ?? 'Partner';

    return (
        <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto">

            {/* Header */}
            <div className="flex items-center gap-2 mb-6">
                <UserCircleIcon size={20} weight="fill" className="text-primary" />
                <h1 className="text-text-dark text-2xl font-bold font-body">Profile</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Identity */}
                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                    <div className="px-5 py-5 flex items-center gap-3 border-b border-[#f0e8d8]">
                        <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                            <span className="text-primary text-base font-bold font-body">{initials(name)}</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-text-dark text-base font-bold font-body truncate">{name}</p>
                            <p className="text-neutral-gray text-[11px] font-semibold font-body uppercase tracking-wider">Branch Partner</p>
                        </div>
                    </div>
                    <div className="px-5 py-2">
                        <InfoRow icon={EnvelopeIcon} label="Email" value={staffUser?.email ?? '—'} />
                        <InfoRow icon={PhoneIcon} label="Phone" value={staffUser?.phone ?? '—'} />
                        <InfoRow
                            icon={BuildingsIcon}
                            label={`Branches (${branches.length})`}
                            value={branches.length ? branches.map(b => b.name).join(', ') : '—'}
                        />
                    </div>
                </div>

                {/* Change password */}
                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#f0e8d8] flex items-center gap-2">
                        <LockKeyIcon size={16} weight="fill" className="text-primary" />
                        <h2 className="text-text-dark text-sm font-bold font-body">Change Password</h2>
                    </div>
                    <form
                        onSubmit={e => { e.preventDefault(); submit(); }}
                        className="px-5 py-4 flex flex-col gap-4"
                        noValidate
                    >
                        {error && (
                            <div className="flex items-start gap-2.5 rounded-xl border border-error/30 bg-error/10 px-3 py-2.5">
                                <WarningCircleIcon size={18} weight="fill" className="mt-0.5 shrink-0 text-error" />
                                <p className="text-xs leading-snug text-error font-body">{error}</p>
                            </div>
                        )}
                        {success && (
                            <div className="flex items-start gap-2.5 rounded-xl border border-secondary/30 bg-secondary/10 px-3 py-2.5">
                                <CheckCircleIcon size={18} weight="fill" className="mt-0.5 shrink-0 text-secondary" />
                                <p className="text-xs leading-snug text-secondary font-body">Password updated successfully.</p>
                            </div>
                        )}

                        <Input
                            type="password"
                            label="Current password"
                            value={current}
                            onChange={v => { setCurrent(v); setError(undefined); }}
                            placeholder="Enter current password"
                            autoComplete="current-password"
                            clearable={false}
                            required
                        />
                        <Input
                            type="password"
                            label="New password"
                            value={next}
                            onChange={v => { setNext(v); setError(undefined); }}
                            placeholder="At least 8 characters"
                            helperText="Use at least 8 characters."
                            autoComplete="new-password"
                            clearable={false}
                            required
                        />
                        <Input
                            type="password"
                            label="Confirm new password"
                            value={confirm}
                            onChange={v => { setConfirm(v); setError(undefined); }}
                            placeholder="Re-enter new password"
                            autoComplete="new-password"
                            clearable={false}
                            required
                        />

                        <button
                            type="submit"
                            disabled={saving}
                            className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {saving
                                ? <><SpinnerIcon size={18} weight="bold" className="animate-spin" /> Updating…</>
                                : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
