'use client';

import { useState, useMemo, useCallback } from 'react';
import {
    KeyIcon,
    EyeIcon,
    EyeSlashIcon,
    MagnifyingGlassIcon,
    CircleNotchIcon,
    ArrowsClockwiseIcon,
    CopyIcon,
    LockSimpleIcon,
    ShieldCheckIcon,
    WarningCircleIcon,
    CaretLeftIcon,
    CaretRightIcon,
} from '@phosphor-icons/react';
import { platformService, type StaffPassword } from '@/lib/api/services/platform.service';
import { toast } from '@/lib/utils/toast';

// ─── Passcode Gate ────────────────────────────────────────────────────────────

function PasscodeGate({ onUnlock }: { onUnlock: (passcode: string) => void }) {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleUnlock = async () => {
        if (code.length !== 6) return;
        setLoading(true);
        setError('');
        try {
            await platformService.getStaffPasswords(code);
            onUnlock(code);
        } catch {
            setError('Invalid passcode. Please try again.');
            setCode('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-2xl border border-[#f0e8d8] p-8 w-full max-w-sm text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <LockSimpleIcon size={28} className="text-primary" />
                </div>
                <h2 className="text-xl font-bold font-body text-text-dark mb-1">Password Vault</h2>
                <p className="text-sm font-body text-neutral-gray mb-6">
                    Enter your 6-digit PIN to access staff passwords.
                </p>
                <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => { if (e.key === 'Enter') handleUnlock(); }}
                    placeholder="000000"
                    className="w-full px-4 py-3 rounded-xl border border-[#f0e8d8] text-center text-xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3"
                    autoFocus
                />
                {error && (
                    <p className="text-sm font-body text-error mb-3">{error}</p>
                )}
                <button
                    type="button"
                    onClick={handleUnlock}
                    disabled={loading || code.length !== 6}
                    className="w-full px-4 py-3 rounded-xl bg-primary text-white text-base font-semibold font-body hover:bg-primary-dark transition-colors disabled:opacity-50 cursor-pointer"
                >
                    {loading ? <CircleNotchIcon size={18} className="animate-spin mx-auto" /> : 'Unlock'}
                </button>
            </div>
        </div>
    );
}

// ─── Password Reset Modal ─────────────────────────────────────────────────────

function ResetPasswordModal({ employee, passcode, onClose, onReset }: {
    employee: StaffPassword;
    passcode: string;
    onClose: () => void;
    onReset: () => void;
}) {
    const [mode, setMode] = useState<'auto' | 'custom'>('auto');
    const [customPassword, setCustomPassword] = useState('');
    const [forceReset, setForceReset] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ password: string; mustReset: boolean } | null>(null);

    const handleReset = async () => {
        setLoading(true);
        try {
            const res = await platformService.resetPassword(
                employee.id,
                passcode,
                mode === 'custom' ? customPassword : undefined,
                forceReset,
            );
            setResult({ password: res.temporary_password, mustReset: res.must_reset });
            toast.success(`Password reset for ${employee.name}`);
            onReset();
        } catch {
            toast.error('Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                <h3 className="text-lg font-bold font-body text-text-dark mb-1">Reset Password</h3>
                <p className="text-sm font-body text-neutral-gray mb-5">
                    Reset password for <strong>{employee.name}</strong> ({employee.employee_no})
                </p>

                {result ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-success/5 border border-success/20 rounded-xl">
                            <p className="text-sm font-body text-neutral-gray mb-1">New Password</p>
                            <div className="flex items-center gap-2">
                                <code className="text-xl font-mono text-text-dark flex-1">{result.password}</code>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(result.password)}
                                    className="p-2 rounded-lg hover:bg-neutral-light transition-colors text-neutral-gray cursor-pointer"
                                    title="Copy"
                                >
                                    <CopyIcon size={18} />
                                </button>
                            </div>
                        </div>
                        {result.mustReset && (
                            <p className="text-xs font-body text-warning flex items-center gap-1">
                                <WarningCircleIcon size={14} /> Staff must reset this on next login.
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full px-4 py-3 rounded-xl bg-primary text-white text-base font-semibold font-body hover:bg-primary-dark transition-colors cursor-pointer"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setMode('auto')}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-bold font-body cursor-pointer transition-colors ${
                                    mode === 'auto'
                                        ? 'bg-primary text-white'
                                        : 'bg-neutral-light text-neutral-gray border border-[#f0e8d8]'
                                }`}
                            >
                                Auto-Generate
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('custom')}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-bold font-body cursor-pointer transition-colors ${
                                    mode === 'custom'
                                        ? 'bg-primary text-white'
                                        : 'bg-neutral-light text-neutral-gray border border-[#f0e8d8]'
                                }`}
                            >
                                Custom Password
                            </button>
                        </div>

                        {mode === 'custom' && (
                            <input
                                type="text"
                                value={customPassword}
                                onChange={e => setCustomPassword(e.target.value)}
                                placeholder="Enter new password (min 8 chars)"
                                className="w-full px-4 py-3 rounded-xl border border-[#f0e8d8] text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
                                minLength={8}
                            />
                        )}

                        {/* Force password reset toggle */}
                        <label className="flex items-center gap-3 cursor-pointer p-3 bg-warning/5 border border-warning/20 rounded-xl">
                            <input
                                type="checkbox"
                                className="accent-warning w-4 h-4"
                                checked={forceReset}
                                onChange={e => setForceReset(e.target.checked)}
                            />
                            <div>
                                <p className="text-text-dark text-sm font-semibold font-body">Force password reset on next login</p>
                                <p className="text-neutral-gray text-xs font-body">Staff must create a new password before accessing the portal</p>
                            </div>
                        </label>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 px-4 py-3 rounded-xl border border-[#f0e8d8] text-sm font-medium font-body text-neutral-gray hover:bg-neutral-light transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleReset}
                                disabled={loading || (mode === 'custom' && customPassword.length < 8)}
                                className="flex-1 px-4 py-3 rounded-xl bg-primary text-white text-sm font-semibold font-body hover:bg-primary-dark transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                {loading ? <CircleNotchIcon size={18} className="animate-spin mx-auto" /> : 'Reset'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Password Row ─────────────────────────────────────────────────────────────

function PasswordRow({ emp, onReset }: { emp: StaffPassword; onReset: () => void }) {
    const [visible, setVisible] = useState(false);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    const statusColor = emp.status === 'active'
        ? 'bg-success/10 text-success'
        : emp.status === 'suspended'
            ? 'bg-error/10 text-error'
            : 'bg-neutral-gray/10 text-neutral-gray';

    return (
        <tr className="border-b border-[#f0e8d8] last:border-0 hover:bg-neutral-light/50 transition-colors">
            <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary text-xs font-bold font-body">
                            {emp.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <p className="text-base font-semibold font-body text-text-dark">{emp.name}</p>
                        <p className="text-xs font-body text-neutral-gray">{emp.employee_no}</p>
                    </div>
                </div>
            </td>
            <td className="px-5 py-4">
                <p className="text-sm font-body text-text-dark">{emp.phone}</p>
                {emp.role && <p className="text-xs font-body text-neutral-gray capitalize">{emp.role.replace(/_/g, ' ')}</p>}
            </td>
            <td className="px-5 py-4">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-body capitalize ${statusColor}`}>
                    {emp.status}
                </span>
            </td>
            <td className="px-5 py-4 min-w-70">
                {emp.has_password ? (
                    <div className="flex items-center gap-2">
                        <code className="text-base font-mono text-text-dark bg-neutral-light px-3 py-1.5 rounded-lg w-40 inline-block">
                            {visible ? emp.password : '••••••••'}
                        </code>
                        <button
                            type="button"
                            onClick={() => setVisible(v => !v)}
                            className="p-2 rounded-lg hover:bg-neutral-light transition-colors text-neutral-gray cursor-pointer"
                            title={visible ? 'Hide' : 'Show'}
                        >
                            {visible ? <EyeSlashIcon size={18} /> : <EyeIcon size={18} />}
                        </button>
                        <button
                            type="button"
                            onClick={() => emp.password && copyToClipboard(emp.password)}
                            className={`p-2 rounded-lg hover:bg-neutral-light transition-colors text-neutral-gray cursor-pointer ${visible && emp.password ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                            title="Copy"
                            tabIndex={visible ? 0 : -1}
                        >
                            <CopyIcon size={18} />
                        </button>
                    </div>
                ) : (
                    <span className="text-sm font-body text-neutral-gray/60 italic">Not stored</span>
                )}
                {emp.must_reset_password && (
                    <span className="inline-flex items-center gap-1 text-xs font-body text-warning mt-1">
                        <WarningCircleIcon size={14} /> Must reset
                    </span>
                )}
            </td>
            <td className="px-5 py-4">
                <button
                    type="button"
                    onClick={onReset}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium font-body text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                >
                    <ArrowsClockwiseIcon size={16} />
                    Reset
                </button>
            </td>
        </tr>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffPasswordsPage() {
    const [passcode, setPasscode] = useState<string | null>(null);
    const [passwords, setPasswords] = useState<StaffPassword[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [resetTarget, setResetTarget] = useState<StaffPassword | null>(null);
    const PAGE_SIZE = 15;

    const handleUnlock = async (code: string) => {
        setPasscode(code);
        setLoading(true);
        try {
            const res = await platformService.getStaffPasswords(code);
            setPasswords(res.data);
        } catch {
            toast.error('Failed to load passwords');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        if (!passcode) return;
        setLoading(true);
        try {
            const res = await platformService.getStaffPasswords(passcode);
            setPasswords(res.data);
        } catch {
            toast.error('Failed to refresh — session may have expired');
            setPasscode(null);
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        if (!search) return passwords;
        const q = search.toLowerCase();
        return passwords.filter(e =>
            e.name.toLowerCase().includes(q) ||
            e.phone.includes(q) ||
            e.employee_no.toLowerCase().includes(q) ||
            (e.role?.toLowerCase().includes(q))
        );
    }, [passwords, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paginated = useMemo(
        () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
        [filtered, safePage],
    );

    // Reset to page 1 when search changes
    const handleSearch = useCallback((val: string) => {
        setSearch(val);
        setPage(1);
    }, []);

    if (!passcode) {
        return <PasscodeGate onUnlock={handleUnlock} />;
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-body text-text-dark flex items-center gap-2">
                        <KeyIcon size={26} className="text-primary" />
                        Staff Passwords
                    </h1>
                    <p className="text-sm font-body text-neutral-gray mt-1">
                        View and manage staff login credentials. All access is logged.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setPasscode(null)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#f0e8d8] text-sm font-medium font-body text-neutral-gray hover:bg-neutral-light transition-colors cursor-pointer"
                    >
                        <LockSimpleIcon size={16} />
                        Lock
                    </button>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={loading}
                        className="p-2.5 rounded-xl hover:bg-neutral-light transition-colors text-neutral-gray cursor-pointer"
                        title="Refresh"
                    >
                        {loading ? <CircleNotchIcon size={18} className="animate-spin" /> : <ArrowsClockwiseIcon size={18} />}
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <MagnifyingGlassIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
                <input
                    type="text"
                    value={search}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Search by name, phone, or employee no..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#f0e8d8] text-sm font-body bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
            </div>

            {/* Info banner */}
            <div className="flex items-center gap-2.5 p-3.5 bg-warning/5 border border-warning/20 rounded-xl">
                <ShieldCheckIcon size={18} className="text-warning shrink-0" />
                <p className="text-xs font-body text-neutral-gray">
                    Passwords are encrypted at rest and decrypted only when viewed. Every access is recorded in the activity log.
                </p>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <CircleNotchIcon size={32} className="animate-spin text-primary" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-[#f0e8d8]">
                    <KeyIcon size={40} className="mx-auto text-neutral-gray/40 mb-3" />
                    <p className="text-sm font-body text-neutral-gray">
                        {search ? 'No staff match your search.' : 'No staff passwords found.'}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-[#f0e8d8] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[#f0e8d8] bg-neutral-light/50">
                                    <th className="px-5 py-3.5 text-left text-xs font-bold font-body text-neutral-gray uppercase tracking-wider">Employee</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-bold font-body text-neutral-gray uppercase tracking-wider">Contact / Role</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-bold font-body text-neutral-gray uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-bold font-body text-neutral-gray uppercase tracking-wider min-w-70">Password</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-bold font-body text-neutral-gray uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map(emp => (
                                    <PasswordRow
                                        key={emp.id}
                                        emp={emp}
                                        onReset={() => setResetTarget(emp)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-5 py-3.5 border-t border-[#f0e8d8] bg-neutral-light/30 flex items-center justify-between">
                        <p className="text-xs font-body text-neutral-gray">
                            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} staff
                        </p>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={safePage <= 1}
                                    className="p-1.5 rounded-lg hover:bg-neutral-light transition-colors text-neutral-gray disabled:opacity-30 cursor-pointer"
                                >
                                    <CaretLeftIcon size={16} />
                                </button>
                                <span className="text-xs font-body text-neutral-gray px-2">
                                    {safePage} / {totalPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={safePage >= totalPages}
                                    className="p-1.5 rounded-lg hover:bg-neutral-light transition-colors text-neutral-gray disabled:opacity-30 cursor-pointer"
                                >
                                    <CaretRightIcon size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Reset password modal */}
            {resetTarget && passcode && (
                <ResetPasswordModal
                    employee={resetTarget}
                    passcode={passcode}
                    onClose={() => setResetTarget(null)}
                    onReset={handleRefresh}
                />
            )}
        </div>
    );
}
