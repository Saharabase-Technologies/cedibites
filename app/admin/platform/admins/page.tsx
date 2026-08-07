'use client';

import { useState, useMemo } from 'react';
import {
    ShieldCheckIcon,
    PlusIcon,
    TrashIcon,
    LockSimpleIcon,
    MagnifyingGlassIcon,
    CircleNotchIcon,
    ArrowsClockwiseIcon,
    KeyIcon,
    UserCircleIcon,
} from '@phosphor-icons/react';
import { usePlatformAdmins } from '@/lib/api/hooks/usePlatform';
import { useEmployees } from '@/lib/api/hooks/useEmployees';
import { platformService } from '@/lib/api/services/platform.service';
import { toast } from '@/lib/utils/toast';

// ─── Passcode Dialog ──────────────────────────────────────────────────────────

function PasscodeDialog({ open, title, children, onConfirm, onCancel, loading }: {
    open: boolean;
    title: string;
    children?: React.ReactNode;
    onConfirm: (passcode: string) => void;
    onCancel: () => void;
    loading: boolean;
}) {
    const [code, setCode] = useState('');

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                <h3 className="text-base font-bold font-body text-text-dark mb-1">{title}</h3>
                <p className="text-xs font-body text-neutral-gray mb-4">Enter your 6-digit passcode to confirm.</p>
                {children}
                <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full px-4 py-3 rounded-xl border border-[#f0e8d8] text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4"
                />
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-[#f0e8d8] text-sm font-medium font-body text-neutral-gray hover:bg-neutral-light transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => { onConfirm(code); setCode(''); }}
                        disabled={loading || code.length !== 6}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold font-body hover:bg-primary-dark transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        {loading ? <CircleNotchIcon size={16} className="animate-spin mx-auto" /> : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlatformAdminsPage() {
    const { admins, isLoading, refetch } = usePlatformAdmins();
    const { employees } = useEmployees({ status: 'active' });

    // Promote form state
    const [showPromote, setShowPromote] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
    const [newPasscode, setNewPasscode] = useState('');
    const [promoteLoading, setPromoteLoading] = useState(false);

    // Revoke state
    const [revokeTarget, setRevokeTarget] = useState<{ id: number; name: string } | null>(null);
    const [revokeLoading, setRevokeLoading] = useState(false);

    // Password reset state
    const [resetTarget, setResetTarget] = useState<{ employeeId: number; name: string } | null>(null);
    const [resetLoading, setResetLoading] = useState(false);

    // Update passcode state
    const [showUpdatePasscode, setShowUpdatePasscode] = useState(false);
    const [currentPasscode, setCurrentPasscode] = useState('');
    const [updatedPasscode, setUpdatedPasscode] = useState('');
    const [updatePasscodeLoading, setUpdatePasscodeLoading] = useState(false);

    // Filter eligible employees (not already platform admins — match by phone)
    const adminPhones = useMemo(() => new Set(admins.map(a => a.phone)), [admins]);
    const eligibleEmployees = useMemo(() => {
        const list = employees.filter(e => !adminPhones.has(e.phone));
        if (!search) return list;
        const q = search.toLowerCase();
        return list.filter(e =>
            e.name.toLowerCase().includes(q) ||
            e.phone.includes(q)
        );
    }, [employees, adminPhones, search]);

    const handlePromote = async (callerPasscode: string) => {
        if (!selectedEmployeeId || newPasscode.length !== 6) return;
        setPromoteLoading(true);
        try {
            await platformService.createAdmin(selectedEmployeeId, newPasscode, callerPasscode);
            toast.success('Platform admin created');
            setShowPromote(false);
            setSelectedEmployeeId(null);
            setNewPasscode('');
            setSearch('');
            refetch();
        } catch {
            toast.error('Failed to create admin — check your passcode');
        } finally {
            setPromoteLoading(false);
        }
    };

    const handleRevoke = async (passcode: string) => {
        if (!revokeTarget) return;
        setRevokeLoading(true);
        try {
            await platformService.revokeAdmin(revokeTarget.id, passcode);
            toast.success(`${revokeTarget.name} removed as platform admin`);
            setRevokeTarget(null);
            refetch();
        } catch {
            toast.error('Failed to revoke — check your passcode');
        } finally {
            setRevokeLoading(false);
        }
    };

    const handleResetPassword = async (passcode: string) => {
        if (!resetTarget) return;
        setResetLoading(true);
        try {
            const res = await platformService.resetPassword(resetTarget.employeeId, passcode);
            toast.success(`Password reset for ${resetTarget.name}. Temp: ${res.temporary_password}`);
            setResetTarget(null);
        } catch {
            toast.error('Password reset failed — check your passcode');
        } finally {
            setResetLoading(false);
        }
    };

    const handleUpdatePasscode = async () => {
        if (currentPasscode.length !== 6 || updatedPasscode.length !== 6) return;
        setUpdatePasscodeLoading(true);
        try {
            await platformService.updatePasscode(currentPasscode, updatedPasscode);
            toast.success('Passcode updated');
            setShowUpdatePasscode(false);
            setCurrentPasscode('');
            setUpdatedPasscode('');
        } catch {
            toast.error('Failed to update passcode');
        } finally {
            setUpdatePasscodeLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <CircleNotchIcon size={32} className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold font-body text-text-dark">Platform Team</h1>
                    <p className="text-xs font-body text-neutral-gray mt-0.5">
                        Manage platform administrators and their access
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowUpdatePasscode(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#f0e8d8] text-xs font-medium font-body text-neutral-gray hover:bg-neutral-light transition-colors cursor-pointer"
                    >
                        <KeyIcon size={14} />
                        Change My Passcode
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowPromote(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold font-body hover:bg-primary-dark transition-colors cursor-pointer"
                    >
                        <PlusIcon size={14} weight="bold" />
                        Add Admin
                    </button>
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="p-2 rounded-xl hover:bg-neutral-light transition-colors text-neutral-gray cursor-pointer"
                        title="Refresh"
                    >
                        <ArrowsClockwiseIcon size={16} />
                    </button>
                </div>
            </div>

            {/* Admins grid */}
            {admins.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-[#f0e8d8]">
                    <ShieldCheckIcon size={40} className="mx-auto text-neutral-gray/40 mb-3" />
                    <p className="text-sm font-body text-neutral-gray">No platform admins yet.</p>
                    <p className="text-xs font-body text-neutral-gray/60 mt-1">Add one to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {admins.map(admin => (
                        <div key={admin.id} className="bg-white rounded-2xl border border-[#f0e8d8] p-5">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="text-primary text-sm font-bold font-body">
                                        {admin.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold font-body text-text-dark">{admin.name}</h3>
                                    <p className="text-xs font-body text-neutral-gray">{admin.phone}</p>
                                    {admin.employee_no && (
                                        <p className="text-[10px] font-body text-neutral-gray/60">#{admin.employee_no}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-body ${
                                            admin.has_passcode ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                                        }`}>
                                            <LockSimpleIcon size={10} weight="fill" />
                                            {admin.has_passcode ? 'Passcode Set' : 'No Passcode'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            // We need the employee_id, not user_id for password reset
                                            // The listAdmins endpoint may need to return employee_id too
                                            // For now use the user's id and rely on the backend to look it up
                                            setResetTarget({ employeeId: admin.id, name: admin.name });
                                        }}
                                        className="p-2 rounded-lg hover:bg-neutral-light transition-colors text-neutral-gray cursor-pointer"
                                        title="Reset Password"
                                    >
                                        <KeyIcon size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRevokeTarget({ id: admin.id, name: admin.name })}
                                        className="p-2 rounded-lg hover:bg-error/10 transition-colors text-error/60 hover:text-error cursor-pointer"
                                        title="Remove Admin"
                                    >
                                        <TrashIcon size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Promote employee drawer */}
            {showPromote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[80vh] flex flex-col">
                        <h3 className="text-base font-bold font-body text-text-dark mb-1">Add Platform Admin</h3>
                        <p className="text-xs font-body text-neutral-gray mb-4">
                            Select an employee to promote and set their 6-digit passcode.
                        </p>

                        {/* Search */}
                        <div className="relative mb-3">
                            <MagnifyingGlassIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search employees..."
                                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#f0e8d8] text-xs font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>

                        {/* Employee list */}
                        <div className="flex-1 overflow-y-auto space-y-1 mb-4 max-h-48">
                            {eligibleEmployees.map(emp => (
                                <button
                                    key={emp.id}
                                    type="button"
                                    onClick={() => setSelectedEmployeeId(Number(emp.id))}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                                        selectedEmployeeId === Number(emp.id)
                                            ? 'bg-primary/10 border border-primary/30'
                                            : 'hover:bg-neutral-light border border-transparent'
                                    }`}
                                >
                                    <UserCircleIcon size={20} className="text-neutral-gray shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium font-body text-text-dark truncate">{emp.name}</p>
                                        <p className="text-[10px] font-body text-neutral-gray">{emp.phone}</p>
                                    </div>
                                </button>
                            ))}
                            {eligibleEmployees.length === 0 && (
                                <p className="text-xs font-body text-neutral-gray text-center py-4">No eligible employees found</p>
                            )}
                        </div>

                        {/* New admin passcode */}
                        {selectedEmployeeId && (
                            <div className="mb-4">
                                <label className="text-xs font-medium font-body text-text-dark mb-1.5 block">
                                    New Admin&apos;s 6-Digit Passcode
                                </label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={newPasscode}
                                    onChange={e => setNewPasscode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    className="w-full px-4 py-3 rounded-xl border border-[#f0e8d8] text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowPromote(false);
                                    setSelectedEmployeeId(null);
                                    setNewPasscode('');
                                    setSearch('');
                                }}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-[#f0e8d8] text-sm font-medium font-body text-neutral-gray hover:bg-neutral-light transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (selectedEmployeeId && newPasscode.length === 6) {
                                        // The promote flow needs the caller's passcode too
                                        setShowPromote(false);
                                        // We'll open the passcode dialog for the caller's verification
                                        // Store the promote intent and use the PasscodeDialog
                                    }
                                }}
                                disabled={!selectedEmployeeId || newPasscode.length !== 6}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold font-body hover:bg-primary-dark transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Passcode dialogs */}
            <PasscodeDialog
                open={!showPromote && selectedEmployeeId !== null && newPasscode.length === 6}
                title="Confirm: Add Platform Admin"
                onConfirm={handlePromote}
                onCancel={() => { setSelectedEmployeeId(null); setNewPasscode(''); }}
                loading={promoteLoading}
            />

            <PasscodeDialog
                open={revokeTarget !== null}
                title={`Remove ${revokeTarget?.name ?? ''} as Admin`}
                onConfirm={handleRevoke}
                onCancel={() => setRevokeTarget(null)}
                loading={revokeLoading}
            />

            <PasscodeDialog
                open={resetTarget !== null}
                title={`Reset Password for ${resetTarget?.name ?? ''}`}
                onConfirm={handleResetPassword}
                onCancel={() => setResetTarget(null)}
                loading={resetLoading}
            />

            {/* Update passcode dialog */}
            {showUpdatePasscode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                        <h3 className="text-base font-bold font-body text-text-dark mb-1">Change Your Passcode</h3>
                        <p className="text-xs font-body text-neutral-gray mb-4">Enter your current and new 6-digit passcodes.</p>

                        <div className="space-y-3 mb-4">
                            <div>
                                <label className="text-xs font-medium font-body text-text-dark mb-1 block">Current Passcode</label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={currentPasscode}
                                    onChange={e => setCurrentPasscode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    className="w-full px-4 py-3 rounded-xl border border-[#f0e8d8] text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium font-body text-text-dark mb-1 block">New Passcode</label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={updatedPasscode}
                                    onChange={e => setUpdatedPasscode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    className="w-full px-4 py-3 rounded-xl border border-[#f0e8d8] text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowUpdatePasscode(false);
                                    setCurrentPasscode('');
                                    setUpdatedPasscode('');
                                }}
                                disabled={updatePasscodeLoading}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-[#f0e8d8] text-sm font-medium font-body text-neutral-gray hover:bg-neutral-light transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleUpdatePasscode}
                                disabled={updatePasscodeLoading || currentPasscode.length !== 6 || updatedPasscode.length !== 6}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold font-body hover:bg-primary-dark transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                {updatePasscodeLoading ? <CircleNotchIcon size={16} className="animate-spin mx-auto" /> : 'Update'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
