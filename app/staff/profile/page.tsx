'use client';

import { useState, useMemo } from 'react';
import {
    UserCircleIcon,
    EnvelopeIcon,
    PhoneIcon,
    BuildingsIcon,
    ShieldCheckIcon,
    LockKeyIcon,
    FloppyDiskIcon,
    CheckCircleIcon,
    WarningCircleIcon,
    EyeIcon,
    EyeSlashIcon,
} from '@phosphor-icons/react';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { MOCK_STAFF, roleDisplayName } from '@/lib/data/mockStaff';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div className="bg-neutral-card border border-brown-light/15 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-brown-light/10">
                <Icon size={16} weight="fill" className="text-primary shrink-0" />
                <h2 className="text-text-dark text-sm font-bold font-body">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function FieldRow({ label, value, readonly }: { label: string; value: string; readonly?: boolean }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2.5 border-b border-brown-light/10 last:border-0">
            <p className="text-neutral-gray text-xs font-medium font-body sm:w-32 shrink-0">{label}</p>
            <p className={`text-sm font-body ${readonly ? 'text-neutral-gray/70' : 'text-text-dark'}`}>{value}</p>
        </div>
    );
}

// ─── Password input ───────────────────────────────────────────────────────────

function PasswordInput({ label, value, onChange, placeholder, error }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; error?: string;
}) {
    const [show, setShow] = useState(false);
    return (
        <div>
            <label className="block text-sm font-medium font-body text-text-dark mb-1.5">{label}</label>
            <div className="relative">
                <LockKeyIcon size={16} weight="bold" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-gray pointer-events-none" />
                <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full bg-neutral-light border rounded-xl pl-9 pr-10 py-3 text-sm font-body text-text-dark placeholder:text-neutral-gray/40 focus:outline-none focus:border-primary transition-colors ${error ? 'border-error/50' : 'border-brown-light/20'}`}
                />
                <button
                    type="button"
                    onClick={() => setShow(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-gray hover:text-text-dark transition-colors cursor-pointer"
                >
                    {show ? <EyeSlashIcon size={16} weight="bold" /> : <EyeIcon size={16} weight="bold" />}
                </button>
            </div>
            {error && <p className="text-error text-xs font-body mt-1">{error}</p>}
        </div>
    );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
    return (
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-body ${type === 'success' ? 'bg-secondary/10 border border-secondary/20 text-secondary' : 'bg-error/10 border border-error/20 text-error'}`}>
            {type === 'success'
                ? <CheckCircleIcon size={16} weight="fill" className="shrink-0" />
                : <WarningCircleIcon size={16} weight="fill" className="shrink-0" />
            }
            {message}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffProfilePage() {
    const { staffUser } = useStaffAuth();

    const staffData = useMemo(
        () => staffUser ? MOCK_STAFF.find(s => s.id === staffUser.id) ?? null : null,
        [staffUser]
    );

    // ── Password change state ──
    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
    const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
    const [pwToast, setPwToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [pwLoading, setPwLoading] = useState(false);

    // ── PIN change state ──
    const [pinForm, setPinForm] = useState({ current: '', next: '', confirm: '' });
    const [pinErrors, setPinErrors] = useState<Record<string, string>>({});
    const [pinToast, setPinToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [pinLoading, setPinLoading] = useState(false);

    const isPOSUser = staffData?.posAccess === true;

    // ── Handlers ──

    async function handlePasswordChange(e: React.FormEvent) {
        e.preventDefault();
        const errs: Record<string, string> = {};
        if (!pwForm.current)               errs.current  = 'Required';
        if (staffData && pwForm.current !== staffData.password) errs.current = 'Current password is incorrect';
        if (!pwForm.next)                  errs.next     = 'Required';
        else if (pwForm.next.length < 6)   errs.next     = 'At least 6 characters';
        if (pwForm.next !== pwForm.confirm) errs.confirm  = 'Passwords do not match';

        if (Object.keys(errs).length > 0) { setPwErrors(errs); return; }

        setPwLoading(true);
        await new Promise(r => setTimeout(r, 600));
        setPwLoading(false);
        setPwForm({ current: '', next: '', confirm: '' });
        setPwErrors({});
        setPwToast({ msg: 'Password updated successfully.', type: 'success' });
        setTimeout(() => setPwToast(null), 4000);
    }

    async function handlePinChange(e: React.FormEvent) {
        e.preventDefault();
        const errs: Record<string, string> = {};
        if (!pinForm.current)                       errs.current = 'Required';
        if (staffData && pinForm.current !== staffData.pin) errs.current = 'Current PIN is incorrect';
        if (!pinForm.next)                          errs.next    = 'Required';
        else if (!/^\d{4}$/.test(pinForm.next))     errs.next    = 'PIN must be exactly 4 digits';
        if (pinForm.next !== pinForm.confirm)        errs.confirm = 'PINs do not match';

        if (Object.keys(errs).length > 0) { setPinErrors(errs); return; }

        setPinLoading(true);
        await new Promise(r => setTimeout(r, 600));
        setPinLoading(false);
        setPinForm({ current: '', next: '', confirm: '' });
        setPinErrors({});
        setPinToast({ msg: 'POS PIN updated successfully.', type: 'success' });
        setTimeout(() => setPinToast(null), 4000);
    }

    if (!staffUser) return null;

    const branchDisplay = Array.isArray(staffUser.branch) ? staffUser.branch.join(', ') : staffUser.branch;

    return (
        <div className="px-4 md:px-8 py-6 max-w-2xl mx-auto">

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                    <span className="text-primary text-xl font-bold font-body">{initials(staffUser.name)}</span>
                </div>
                <div>
                    <h1 className="text-text-dark text-xl font-bold font-body">{staffUser.name}</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5">
                        {roleDisplayName(staffUser.role)} &middot; {branchDisplay}
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-5">

                {/* ── Account info ──────────────────────────────────────────────── */}
                <SectionCard title="Account Info" icon={UserCircleIcon}>
                    <FieldRow label="Full Name"  value={staffUser.name} />
                    <FieldRow label="Role"       value={roleDisplayName(staffUser.role)} readonly />
                    <FieldRow label="Branch"     value={branchDisplay} readonly />
                    {staffData?.email && <FieldRow label="Email"  value={staffData.email} />}
                    {staffData?.phone && <FieldRow label="Phone"  value={staffData.phone} />}
                    {staffData?.joinedAt && <FieldRow label="Joined" value={staffData.joinedAt} readonly />}
                </SectionCard>

                {/* ── Change password ───────────────────────────────────────────── */}
                <SectionCard title="Change Password" icon={ShieldCheckIcon}>
                    <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
                        <PasswordInput
                            label="Current Password"
                            value={pwForm.current}
                            onChange={v => setPwForm(f => ({ ...f, current: v }))}
                            placeholder="Enter current password"
                            error={pwErrors.current}
                        />
                        <PasswordInput
                            label="New Password"
                            value={pwForm.next}
                            onChange={v => setPwForm(f => ({ ...f, next: v }))}
                            placeholder="Min. 6 characters"
                            error={pwErrors.next}
                        />
                        <PasswordInput
                            label="Confirm New Password"
                            value={pwForm.confirm}
                            onChange={v => setPwForm(f => ({ ...f, confirm: v }))}
                            placeholder="Repeat new password"
                            error={pwErrors.confirm}
                        />

                        {pwToast && <Toast message={pwToast.msg} type={pwToast.type} />}

                        <button
                            type="submit"
                            disabled={pwLoading}
                            className="flex items-center justify-center gap-2 w-full sm:w-auto sm:self-end px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-brand-darker text-sm font-bold font-body rounded-xl transition-colors cursor-pointer"
                        >
                            <FloppyDiskIcon size={16} weight="bold" />
                            {pwLoading ? 'Saving…' : 'Update Password'}
                        </button>
                    </form>
                </SectionCard>

                {/* ── Change POS PIN (sales staff only) ────────────────────────── */}
                {isPOSUser && (
                    <SectionCard title="POS Terminal PIN" icon={LockKeyIcon}>
                        <p className="text-neutral-gray text-xs font-body mb-4">
                            Your 4-digit PIN is used to log into the POS terminal.
                        </p>
                        <form onSubmit={handlePinChange} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium font-body text-text-dark mb-1.5">Current PIN</label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={4}
                                    value={pinForm.current}
                                    onChange={e => setPinForm(f => ({ ...f, current: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                                    placeholder="····"
                                    className={`w-28 bg-neutral-light border rounded-xl px-4 py-3 text-sm font-body font-mono tracking-widest text-text-dark placeholder:text-neutral-gray/40 focus:outline-none focus:border-primary transition-colors ${pinErrors.current ? 'border-error/50' : 'border-brown-light/20'}`}
                                />
                                {pinErrors.current && <p className="text-error text-xs font-body mt-1">{pinErrors.current}</p>}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium font-body text-text-dark mb-1.5">New PIN</label>
                                    <input
                                        type="password"
                                        inputMode="numeric"
                                        maxLength={4}
                                        value={pinForm.next}
                                        onChange={e => setPinForm(f => ({ ...f, next: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                                        placeholder="····"
                                        className={`w-28 bg-neutral-light border rounded-xl px-4 py-3 text-sm font-body font-mono tracking-widest text-text-dark placeholder:text-neutral-gray/40 focus:outline-none focus:border-primary transition-colors ${pinErrors.next ? 'border-error/50' : 'border-brown-light/20'}`}
                                    />
                                    {pinErrors.next && <p className="text-error text-xs font-body mt-1">{pinErrors.next}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium font-body text-text-dark mb-1.5">Confirm New PIN</label>
                                    <input
                                        type="password"
                                        inputMode="numeric"
                                        maxLength={4}
                                        value={pinForm.confirm}
                                        onChange={e => setPinForm(f => ({ ...f, confirm: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                                        placeholder="····"
                                        className={`w-28 bg-neutral-light border rounded-xl px-4 py-3 text-sm font-body font-mono tracking-widest text-text-dark placeholder:text-neutral-gray/40 focus:outline-none focus:border-primary transition-colors ${pinErrors.confirm ? 'border-error/50' : 'border-brown-light/20'}`}
                                    />
                                    {pinErrors.confirm && <p className="text-error text-xs font-body mt-1">{pinErrors.confirm}</p>}
                                </div>
                            </div>

                            {pinToast && <Toast message={pinToast.msg} type={pinToast.type} />}

                            <button
                                type="submit"
                                disabled={pinLoading}
                                className="flex items-center justify-center gap-2 w-full sm:w-auto sm:self-end px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-brand-darker text-sm font-bold font-body rounded-xl transition-colors cursor-pointer"
                            >
                                <FloppyDiskIcon size={16} weight="bold" />
                                {pinLoading ? 'Saving…' : 'Update PIN'}
                            </button>
                        </form>
                    </SectionCard>
                )}

            </div>

            <p className="text-neutral-gray/40 text-xs font-body text-center mt-8">
                Contact your manager to update your name, phone, or email.
            </p>
        </div>
    );
}
