'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
    UsersThreeIcon,
    PlusIcon,
    PencilSimpleIcon,
    LockKeyIcon,
    PhoneIcon,
    EnvelopeIcon,
    WarningCircleIcon,
    CheckCircleIcon,
    ArchiveIcon,
    ArrowCounterClockwiseIcon,
    TrashIcon,
    CaretDownIcon,
    CaretUpIcon,
} from '@phosphor-icons/react';
import {
    type StaffMember,
    type StaffRole,
    defaultPermissions,
} from '@/types/staff';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { employeeService } from '@/lib/api/services/employee.service';
import { useQuery } from '@tanstack/react-query';
import { isValidGhanaPhone, normalizeGhanaPhone } from '@/app/lib/phone';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BRANCH_ROLES: StaffRole[] = ['call_center', 'kitchen', 'rider'];

function inBranch(s: StaffMember, branchName: string): boolean {
    return Array.isArray(s.branch) ? s.branch.includes(branchName) : s.branch === branchName;
}

function getRoleColor(role: StaffRole): string {
    if (role === 'call_center') return 'bg-info/10 text-info border-info/20';
    if (role === 'kitchen')     return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-secondary/10 text-secondary border-secondary/20';
}

const ROLE_LABELS: Partial<Record<StaffRole, string>> = {
    call_center: 'Call Center',
    kitchen:     'Kitchen Staff',
    rider:       'Rider',
};

// ─── Staff form modal ─────────────────────────────────────────────────────────

interface StaffFormState {
    name:  string;
    role:  StaffRole;
    phone: string;
    email: string;
}

function StaffModal({
    member,
    onSave,
    onClose,
    currentBranch,
}: {
    member: StaffMember | null;
    onSave: (data: Partial<StaffMember> & { id?: string }) => void;
    onClose: () => void;
    currentBranch: string;
}) {
    const [form, setForm] = useState<StaffFormState>({
        name:  member?.name  ?? '',
        role:  member?.role  ?? 'call_center',
        phone: member?.phone ?? '',
        email: member?.email ?? '',
    });
    const [errors, setErrors] = useState<Partial<Record<keyof StaffFormState, string>>>({});

    function validate() {
        const e: typeof errors = {};
        if (!form.name.trim())  e.name  = 'Name is required';
        if (!form.phone.trim()) e.phone = 'Phone is required';
        else if (!isValidGhanaPhone(form.phone))
                                 e.phone = 'Enter a valid Ghanaian number (e.g. 0241234567 or +233241234567)';
        if (!form.email.trim()) e.email = 'Email is required';
        else if (!form.email.includes('@')) e.email = 'Enter a valid email';
        return e;
    }

    function handleSubmit() {
        const e = validate();
        if (Object.keys(e).length > 0) { setErrors(e); return; }
        onSave({
            id:     member?.id,
            name:   form.name.trim(),
            role:   form.role,
            phone:  normalizeGhanaPhone(form.phone.trim()),
            email:  form.email.trim(),
            branch: currentBranch,
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-brand-darker/60 backdrop-blur-sm">
            <div className="bg-neutral-light border border-brown-light/20 rounded-3xl p-6 w-full max-w-md shadow-xl">

                <h2 className="text-text-dark text-lg font-bold font-body mb-5">
                    {member ? 'Edit Staff Member' : 'Add Staff Member'}
                </h2>

                <div className="flex flex-col gap-4">

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium font-body text-text-dark mb-1.5">
                            Full Name <span className="text-primary">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                            placeholder="e.g. Kofi Mensah"
                            className="w-full bg-neutral-light border border-brown-light/20 rounded-xl px-4 py-3 text-sm font-body text-text-dark placeholder:text-neutral-gray/50 focus:outline-none focus:border-primary transition-colors"
                        />
                        {errors.name && <p className="text-error text-xs font-body mt-1">{errors.name}</p>}
                    </div>

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-medium font-body text-text-dark mb-1.5">
                            Role <span className="text-primary">*</span>
                        </label>
                        <select
                            value={form.role}
                            onChange={e => setForm(p => ({ ...p, role: e.target.value as StaffRole }))}
                            className="w-full bg-neutral-light border border-brown-light/20 rounded-xl px-4 py-3 text-sm font-body text-text-dark focus:outline-none focus:border-primary transition-colors cursor-pointer"
                        >
                            {BRANCH_ROLES.map(r => (
                                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                        </select>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium font-body text-text-dark mb-1.5">
                            Phone <span className="text-primary">*</span>
                        </label>
                        <div className="relative">
                            <PhoneIcon size={16} weight="bold" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-gray pointer-events-none" />
                            <input
                                type="tel"
                                value={form.phone}
                                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                                placeholder="024 XXX XXXX"
                                className="w-full bg-neutral-light border border-brown-light/20 rounded-xl pl-9 pr-4 py-3 text-sm font-body text-text-dark placeholder:text-neutral-gray/50 focus:outline-none focus:border-primary transition-colors"
                            />
                        </div>
                        {errors.phone && <p className="text-error text-xs font-body mt-1">{errors.phone}</p>}
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium font-body text-text-dark mb-1.5">
                            Email <span className="text-primary">*</span>
                        </label>
                        <div className="relative">
                            <EnvelopeIcon size={16} weight="bold" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-gray pointer-events-none" />
                            <input
                                type="email"
                                value={form.email}
                                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                placeholder="staff@cedibites.com"
                                className="w-full bg-neutral-light border border-brown-light/20 rounded-xl pl-9 pr-4 py-3 text-sm font-body text-text-dark placeholder:text-neutral-gray/50 focus:outline-none focus:border-primary transition-colors"
                            />
                        </div>
                        {errors.email && <p className="text-error text-xs font-body mt-1">{errors.email}</p>}
                    </div>

                </div>

                {!member && (
                    <div className="mt-4 flex items-start gap-2 bg-info/10 border border-info/20 rounded-xl px-3 py-2.5">
                        <WarningCircleIcon size={15} weight="fill" className="text-info shrink-0 mt-0.5" />
                        <p className="text-info text-xs font-body">A temporary password will be sent to the staff&apos;s email on creation.</p>
                    </div>
                )}

                <div className="flex gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl border border-brown-light/20 text-sm font-medium font-body text-neutral-gray hover:text-text-dark transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover text-brand-darker text-sm font-bold font-body transition-colors cursor-pointer"
                    >
                        {member ? 'Save Changes' : 'Add Staff'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Deactivate confirm ───────────────────────────────────────────────────────

function DeactivateConfirm({
    member,
    onConfirm,
    onClose,
}: {
    member: StaffMember;
    onConfirm: () => void;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-darker/60 backdrop-blur-sm">
            <div className="bg-neutral-light border border-brown-light/20 rounded-3xl p-6 w-full max-w-sm shadow-xl">
                <div className="flex flex-col items-center text-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-error/10">
                        <LockKeyIcon size={26} weight="fill" className="text-error" />
                    </div>
                    <div>
                        <h2 className="text-text-dark text-base font-bold font-body">Deactivate Account?</h2>
                        <p className="text-neutral-gray text-sm font-body mt-1">
                            <span className="font-semibold text-text-dark">{member.name}</span>
                            {' '}will lose access to the staff portal immediately.
                        </p>
                        <p className="text-neutral-gray/70 text-xs font-body mt-2">
                            You can archive them later to remove from the active list.
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button type="button" onClick={onClose}
                        className="flex-1 py-3 rounded-xl border border-brown-light/20 text-sm font-medium font-body text-neutral-gray hover:text-text-dark transition-colors cursor-pointer">
                        Cancel
                    </button>
                    <button type="button" onClick={onConfirm}
                        className="flex-1 py-3 rounded-xl bg-error hover:bg-error/80 text-white text-sm font-bold font-body transition-colors cursor-pointer">
                        Deactivate
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Archive confirm ──────────────────────────────────────────────────────────

function ArchiveConfirm({
    member,
    onConfirm,
    onClose,
}: {
    member: StaffMember;
    onConfirm: () => void;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-darker/60 backdrop-blur-sm">
            <div className="bg-neutral-light border border-brown-light/20 rounded-3xl p-6 w-full max-w-sm shadow-xl">
                <div className="flex flex-col items-center text-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-warning/10">
                        <ArchiveIcon size={26} weight="fill" className="text-warning" />
                    </div>
                    <div>
                        <h2 className="text-text-dark text-base font-bold font-body">Archive Staff Member?</h2>
                        <p className="text-neutral-gray text-sm font-body mt-1">
                            <span className="font-semibold text-text-dark">{member.name}</span>
                            {' '}will be moved to the archive. You can restore them at any time.
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button type="button" onClick={onClose}
                        className="flex-1 py-3 rounded-xl border border-brown-light/20 text-sm font-medium font-body text-neutral-gray hover:text-text-dark transition-colors cursor-pointer">
                        Cancel
                    </button>
                    <button type="button" onClick={onConfirm}
                        className="flex-1 py-3 rounded-xl bg-warning hover:bg-warning/80 text-white text-sm font-bold font-body transition-colors cursor-pointer">
                        Archive
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManagerStaffPage() {
    const { staffUser } = useStaffAuth();
    const currentBranch = staffUser?.branches[0]?.name ?? '';
    const branchId = staffUser?.branches[0]?.id;
    
    const { data: apiStaff = [], isLoading } = useQuery({
        queryKey: ['branch-employees', branchId],
        queryFn: () => branchId ? employeeService.getBranchEmployees(branchId) : Promise.resolve([]),
        enabled: !!branchId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const branchStaff = useMemo(
        () => apiStaff.filter(s => BRANCH_ROLES.includes(s.role) && inBranch(s, currentBranch)),
        [apiStaff, currentBranch]
    );

    const [staff, setStaff] = useState<StaffMember[]>([]);
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (!hasInitialized.current && branchStaff.length > 0) {
            hasInitialized.current = true;
            setStaff(branchStaff);
        }
    }, [branchStaff]);

    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [editingMember, setEditingMember] = useState<StaffMember | null | 'new'>(null);
    const [deactivatingMember, setDeactivatingMember] = useState<StaffMember | null>(null);
    const [archivingMember, setArchivingMember] = useState<StaffMember | null>(null);
    const [archiveOpen, setArchiveOpen] = useState(false);

    const activeStaff   = useMemo(() => staff.filter(s => s.status === 'active'),   [staff]);
    const inactiveStaff = useMemo(() => staff.filter(s => s.status === 'inactive'), [staff]);
    const archivedStaff = useMemo(() => staff.filter(s => s.status === 'archived'), [staff]);

    const filtered = useMemo(() => {
        if (filter === 'active')   return activeStaff;
        if (filter === 'inactive') return inactiveStaff;
        return [...activeStaff, ...inactiveStaff];
    }, [filter, activeStaff, inactiveStaff]);

    function handleSave(data: Partial<StaffMember> & { id?: string }) {
        if (data.id) {
            setStaff(prev => prev.map(s => s.id === data.id ? { ...s, ...data } : s));
        } else {
            const newRole = data.role ?? 'call_center';
            const newMember: StaffMember = {
                id:               `u${Date.now()}`,
                name:             data.name ?? '',
                role:             newRole,
                phone:            data.phone ?? '',
                email:            data.email ?? '',
                branch:           currentBranch,
                branchIds:        [],
                status:           'active',
                employmentStatus: 'active',
                systemAccess:     'enabled',
                permissions:      defaultPermissions(newRole),
                password:         'temp123',
                joinedAt:         new Date().toLocaleDateString('en-GH', { month: 'short', year: 'numeric' }),
                lastLogin:        'Never',
                ordersToday:      0,
            };
            setStaff(prev => [...prev, newMember]);
        }
        setEditingMember(null);
    }

    function handleDeactivate() {
        if (!deactivatingMember) return;
        setStaff(prev => prev.map(s => s.id === deactivatingMember.id ? { ...s, status: 'inactive' } : s));
        setDeactivatingMember(null);
    }

    function handleReactivate(id: string) {
        setStaff(prev => prev.map(s => s.id === id ? { ...s, status: 'active' } : s));
    }

    function handleArchive() {
        if (!archivingMember) return;
        setStaff(prev => prev.map(s => s.id === archivingMember.id ? { ...s, status: 'archived' } : s));
        setArchivingMember(null);
    }

    function handleRestoreFromArchive(id: string) {
        setStaff(prev => prev.map(s => s.id === id ? { ...s, status: 'inactive' } : s));
    }

    function handlePermanentDelete(id: string) {
        setStaff(prev => prev.filter(s => s.id !== id));
    }

    return (
        <>
            <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">

                {/* ── Header ──────────────────────────────────────────────────── */}
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-text-dark text-xl font-bold font-body">Staff Management</h1>
                        <p className="text-neutral-gray text-sm font-body mt-0.5 flex items-center gap-1.5">
                            <UsersThreeIcon size={13} weight="fill" />
                            {currentBranch} &middot; {activeStaff.length + inactiveStaff.length} staff &middot;{' '}
                            <span className="text-secondary font-medium">{activeStaff.length} active</span>
                            {inactiveStaff.length > 0 && (
                                <>, <span className="text-neutral-gray font-medium">{inactiveStaff.length} inactive</span></>
                            )}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setEditingMember('new')}
                        className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-brand-darker font-semibold font-body text-sm px-4 py-2.5 rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                        <PlusIcon size={16} weight="bold" />
                        Add Staff
                    </button>
                </div>

                {/* ── Filter tabs ─────────────────────────────────────────────── */}
                <div className="flex gap-2 mb-6 bg-neutral-card border border-brown-light/15 rounded-2xl p-1.5 w-fit">
                    {(['all', 'active', 'inactive'] as const).map(f => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium font-body transition-all duration-150 capitalize cursor-pointer ${filter === f ? 'bg-primary text-brand-darker shadow-sm' : 'text-neutral-gray hover:text-text-dark'}`}
                        >
                            {f === 'all'
                                ? `All (${activeStaff.length + inactiveStaff.length})`
                                : f === 'active'
                                    ? `Active (${activeStaff.length})`
                                    : `Inactive (${inactiveStaff.length})`
                            }
                        </button>
                    ))}
                </div>

                {/* ── Staff list ──────────────────────────────────────────────── */}
                {filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <UsersThreeIcon size={36} weight="duotone" className="text-neutral-gray/30 mx-auto mb-3" />
                        <p className="text-neutral-gray text-sm font-body">No staff in this filter.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {filtered.map(member => (
                            <div
                                key={member.id}
                                className={`bg-neutral-card border border-brown-light/15 rounded-2xl px-4 py-4 flex items-center gap-4 ${member.status === 'inactive' ? 'opacity-60' : ''}`}
                            >
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                                    <span className="text-primary font-bold font-body text-sm">
                                        {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </span>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-text-dark text-sm font-semibold font-body">{member.name}</p>
                                        <span className={`text-[10px] font-bold font-body border rounded-full px-2 py-0.5 ${getRoleColor(member.role)}`}>
                                            {ROLE_LABELS[member.role] ?? member.role}
                                        </span>
                                        {member.status === 'inactive' && (
                                            <span className="text-[10px] font-bold font-body border border-neutral-gray/30 text-neutral-gray rounded-full px-2 py-0.5">
                                                Inactive
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                        <span className="text-neutral-gray text-xs font-body">{member.phone}</span>
                                        <span className="text-brown-light/40 text-xs">&middot;</span>
                                        <span className="text-neutral-gray text-xs font-body truncate">{member.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                        <span className="text-neutral-gray/60 text-[10px] font-body">Since {member.joinedAt}</span>
                                        {member.status === 'active' && member.ordersToday > 0 && (
                                            <>
                                                <span className="text-brown-light/30 text-xs">&middot;</span>
                                                <span className="text-neutral-gray/60 text-[10px] font-body">{member.ordersToday} orders today</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setEditingMember(member)}
                                        className="p-2 rounded-xl text-neutral-gray hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                                        title="Edit"
                                    >
                                        <PencilSimpleIcon size={16} weight="bold" />
                                    </button>
                                    {member.status === 'active' ? (
                                        <button
                                            type="button"
                                            onClick={() => setDeactivatingMember(member)}
                                            className="p-2 rounded-xl text-neutral-gray hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                                            title="Deactivate"
                                        >
                                            <LockKeyIcon size={16} weight="bold" />
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => handleReactivate(member.id)}
                                                className="p-2 rounded-xl text-neutral-gray hover:text-secondary hover:bg-secondary/10 transition-colors cursor-pointer"
                                                title="Reactivate"
                                            >
                                                <CheckCircleIcon size={16} weight="bold" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setArchivingMember(member)}
                                                className="p-2 rounded-xl text-neutral-gray hover:text-warning hover:bg-warning/10 transition-colors cursor-pointer"
                                                title="Archive"
                                            >
                                                <ArchiveIcon size={16} weight="bold" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Archived section ────────────────────────────────────────── */}
                {archivedStaff.length > 0 && (
                    <div className="mt-8">
                        <button
                            type="button"
                            onClick={() => setArchiveOpen(o => !o)}
                            className="flex items-center gap-2 text-neutral-gray text-sm font-semibold font-body mb-3 cursor-pointer hover:text-text-dark transition-colors"
                        >
                            {archiveOpen ? <CaretUpIcon size={14} weight="bold" /> : <CaretDownIcon size={14} weight="bold" />}
                            <ArchiveIcon size={15} weight="fill" />
                            Archived ({archivedStaff.length})
                        </button>

                        {archiveOpen && (
                            <div className="flex flex-col gap-2">
                                {archivedStaff.map(member => (
                                    <div
                                        key={member.id}
                                        className="bg-neutral-gray/5 border border-brown-light/10 rounded-2xl px-4 py-3 flex items-center gap-4 opacity-60"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-neutral-gray/10 flex items-center justify-center shrink-0">
                                            <span className="text-neutral-gray font-bold font-body text-sm">
                                                {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-neutral-gray text-sm font-semibold font-body">{member.name}</p>
                                                <span className={`text-[10px] font-bold font-body border rounded-full px-2 py-0.5 ${getRoleColor(member.role)}`}>
                                                    {ROLE_LABELS[member.role] ?? member.role}
                                                </span>
                                            </div>
                                            <span className="text-neutral-gray/60 text-xs font-body">Since {member.joinedAt}</span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleRestoreFromArchive(member.id)}
                                                className="p-2 rounded-xl text-neutral-gray hover:text-secondary hover:bg-secondary/10 transition-colors cursor-pointer"
                                                title="Restore"
                                            >
                                                <ArrowCounterClockwiseIcon size={16} weight="bold" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handlePermanentDelete(member.id)}
                                                className="p-2 rounded-xl text-neutral-gray hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                                                title="Delete permanently"
                                            >
                                                <TrashIcon size={16} weight="bold" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <p className="text-neutral-gray/40 text-xs font-body text-center mt-6">
                    Deactivated staff lose portal access immediately &middot; {currentBranch} branch
                </p>

            </div>

            {/* ── Modals ──────────────────────────────────────────────────────── */}
            {editingMember !== null && (
                <StaffModal
                    member={editingMember === 'new' ? null : editingMember}
                    onSave={handleSave}
                    onClose={() => setEditingMember(null)}
                    currentBranch={currentBranch}
                />
            )}
            {deactivatingMember && (
                <DeactivateConfirm
                    member={deactivatingMember}
                    onConfirm={handleDeactivate}
                    onClose={() => setDeactivatingMember(null)}
                />
            )}
            {archivingMember && (
                <ArchiveConfirm
                    member={archivingMember}
                    onConfirm={handleArchive}
                    onClose={() => setArchivingMember(null)}
                />
            )}
        </>
    );
}
