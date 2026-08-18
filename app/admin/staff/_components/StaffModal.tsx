'use client';

import { useState } from 'react';
import { WarningCircleIcon, XIcon, IdentificationCardIcon } from '@phosphor-icons/react';
import {
    type StaffMember, type StaffRole, type StaffStatus,
    type EmploymentStatus, type SystemAccess,
    ROLE_RULES, ASSIGNABLE_ROLES, roleDisplayName, roleNeedsBranch,
    roleAllowsManyBranches, branchRuleLabel, validateBranchSelection,
    employmentStatusLabel,
} from '@/types/staff';
import { useBranchesApi } from '@/lib/api/hooks/useBranchesApi';
import { employeeService } from '@/lib/api/services/employee.service';
import { isValidGhanaPhone, normalizeGhanaPhone } from '@/app/lib/phone';

// The Permissions tab is gone. It read a person's effective permissions, showed
// them as checkboxes, and wrote the lot back as grants attached to the user —
// which is how a branch manager kept getting `manage_employees` back after it
// had been taken off the manager role. What someone can do is decided by their
// role on the server; this form picks the role and nothing else.
type ModalTab = 'profile' | 'access' | 'hr';

interface StaffFormState {
    name:             string;
    phone:            string;
    email:            string;
    password:         string;
    passwordConfirm:  string;
    passwordMode:     'auto' | 'custom' | 'prompt';
    role:             StaffRole;
    /** Branch IDs, always. The form used to carry branch *names* and look their
     *  IDs back up on save, which threw "Invalid branch selected" whenever a
     *  branch was renamed or a name contained a comma. */
    branchIds:        string[];
    employmentStatus: EmploymentStatus;
    forcePasswordReset: boolean;
    // HR
    ssnit:            string;
    ghanaCard:        string;
    tinNumber:        string;
    dateOfBirth:      string;
    nationality:      string;
    emergencyName:    string;
    emergencyPhone:   string;
    emergencyRel:     string;
}

function memberToForm(s: StaffMember): StaffFormState {
    return {
        name: s.name,
        phone: s.phone ?? '',
        email: s.email ?? '',
        password: '',
        passwordConfirm: '',
        passwordMode: 'auto' as const,
        role: s.role,
        // Trim to what the role allows, so opening a record that predates the
        // rules does not silently resubmit an illegal set.
        branchIds: roleNeedsBranch(s.role)
            ? (roleAllowsManyBranches(s.role) ? s.branchIds : s.branchIds.slice(0, 1))
            : [],
        employmentStatus: s.employmentStatus,
        forcePasswordReset: false,
        ssnit: s.ssnit ?? '',
        ghanaCard: s.ghanaCard ?? '',
        tinNumber: s.tinNumber ?? '',
        dateOfBirth: s.dateOfBirth ?? '',
        nationality: s.nationality ?? 'Ghanaian',
        emergencyName: s.emergencyContact?.name ?? '',
        emergencyPhone: s.emergencyContact?.phone ?? '',
        emergencyRel: s.emergencyContact?.relationship ?? '',
    };
}

export interface StaffModalProps {
    staff: StaffMember | null;
    onClose: () => void;
    onSave: (s: StaffMember) => void | Promise<void>;
    /**
     * Branch to pre-select when adding somebody. Set when "Add staff" is pressed
     * from inside a branch's card — you already said which branch by being
     * there, so the form should not ask again.
     */
    defaultBranchId?: string;
    /** Role to pre-select, likewise, when adding from a group that implies one. */
    defaultRole?: StaffRole;
}

export function StaffModal({ staff, onClose, onSave, defaultBranchId, defaultRole }: StaffModalProps) {
    const { branches, isLoading: branchesLoading } = useBranchesApi();
    const isNew = !staff;

    const createBlankForm = (): StaffFormState => {
        const role: StaffRole = defaultRole ?? 'sales_staff';
        return {
            name: '', phone: '', email: '', password: '', passwordConfirm: '',
            passwordMode: 'auto' as const,
            role,
            branchIds: defaultBranchId && roleNeedsBranch(role) ? [defaultBranchId] : [],
            employmentStatus: 'active',
            forcePasswordReset: false,
            ssnit: '', ghanaCard: '', tinNumber: '',
            dateOfBirth: '', nationality: 'Ghanaian',
            emergencyName: '', emergencyPhone: '', emergencyRel: '',
        };
    };

    const [form, setForm] = useState<StaffFormState>(staff ? memberToForm(staff) : createBlankForm());
    const [modalTab, setModalTab] = useState<ModalTab>('profile');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const rule = ROLE_RULES[form.role];
    const needsBranch = roleNeedsBranch(form.role);
    const allowsMany = roleAllowsManyBranches(form.role);

    /**
     * Changing the role changes what the account is, so the branch selection has
     * to be re-fitted to the new rule rather than carried over: a manager
     * becoming an admin loses the branch entirely, a rider becoming a manager
     * keeps only the first of theirs and has to confirm it.
     */
    function handleRoleChange(newRole: StaffRole) {
        setForm(f => ({
            ...f,
            role: newRole,
            branchIds: !roleNeedsBranch(newRole)
                ? []
                : roleAllowsManyBranches(newRole) ? f.branchIds : f.branchIds.slice(0, 1),
        }));
        setErrors(e => ({ ...e, branchIds: '' }));
    }

    function toggleBranch(id: string) {
        setForm(f => ({
            ...f,
            branchIds: allowsMany
                ? (f.branchIds.includes(id) ? f.branchIds.filter(b => b !== id) : [...f.branchIds, id])
                : [id],
        }));
        setErrors(e => ({ ...e, branchIds: '' }));
    }

    function validate() {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Name is required';
        if (!isValidGhanaPhone(form.phone)) e.phone = 'Enter a valid Ghanaian phone number (e.g. 0241234567 or +233241234567)';
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address';
        if (isNew && form.passwordMode === 'custom') {
            if (!form.password || form.password.length < 8) e.password = 'Min 8 characters';
            else if (form.password !== form.passwordConfirm) e.passwordConfirm = 'Passwords do not match';
        }
        // The role decides how many branches, so the form asks the role rather
        // than applying one rule to everyone. Mirrors the server, which enforces
        // the same thing whatever the client sends.
        const branchError = validateBranchSelection(form.role, form.branchIds);
        if (branchError) e.branchIds = branchError;

        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function handleSave() {
        setSubmitError(null);
        if (!validate()) return;

        if (needsBranch && branches.length === 0) {
            setSubmitError('Branches are still loading. Please wait and try again.');
            return;
        }

        const branchIds = [...new Set(form.branchIds)];
        const branchNames = branchIds
            .map(id => branches.find(b => String(b.id) === id)?.name)
            .filter((n): n is string => Boolean(n));

        const updated: StaffMember = {
            ...(staff ?? {
                id:          `u${Date.now()}`,
                status:      'active' as StaffStatus,
                joinedAt:    new Date().toLocaleDateString('en-GH', { month: 'short', year: 'numeric' }),
                lastLogin:   'Never',
                ordersToday: 0,
                permissions: [],
            }),
            name:             form.name.trim(),
            phone:            normalizeGhanaPhone(form.phone.trim()),
            email:            form.email.trim(),
            role:             form.role,
            branch:           allowsMany ? branchNames : branchNames[0] ?? '',
            branchIds:        branchIds,
            employmentStatus: form.employmentStatus,
            // Access follows employment, rather than being a second switch that
            // could disagree with it. The server treats anything but active as
            // no access, so the UI says the same.
            systemAccess:     (form.employmentStatus === 'active' ? 'enabled' : 'disabled') as SystemAccess,
            ...(isNew ? { password: form.password, passwordMode: form.passwordMode } : {}),
            ssnit:            form.ssnit || undefined,
            ghanaCard:        form.ghanaCard || undefined,
            tinNumber:        form.tinNumber || undefined,
            dateOfBirth:      form.dateOfBirth || undefined,
            nationality:      form.nationality || undefined,
            emergencyContact: form.emergencyName ? {
                name:         form.emergencyName,
                phone:        form.emergencyPhone,
                relationship: form.emergencyRel,
            } : undefined,
        };
        setIsSaving(true);
        try {
            await onSave(updated);

            if (!isNew && form.forcePasswordReset) {
                await employeeService.requirePasswordReset(updated.id);
            }

            onClose();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save. Please try again.';
            setSubmitError(message);
        } finally {
            setIsSaving(false);
        }
    }

    const MODAL_TABS: { id: ModalTab; label: string }[] = [
        { id: 'profile', label: 'Profile' },
        { id: 'access',  label: 'Access' },
        { id: 'hr',      label: 'HR Info' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/30 backdrop-blur-sm overflow-y-auto">
            <div className="bg-neutral-card rounded-2xl shadow-2xl w-full max-w-lg my-8">
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0e8d8]">
                    <h2 className="text-text-dark text-lg font-bold font-body">
                        {isNew ? 'Add Staff Member' : `Edit ${staff?.name}`}
                    </h2>
                    <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-light cursor-pointer">
                        <XIcon size={16} className="text-neutral-gray" />
                    </button>
                </div>

                <div className="flex gap-1 px-6 pt-4 border-b border-[#f0e8d8]">
                    {MODAL_TABS.map(t => (
                        <button key={t.id} type="button" onClick={() => setModalTab(t.id)}
                            className={`px-3 py-2 text-xs font-medium font-body rounded-t-lg border-b-2 transition-colors cursor-pointer ${modalTab === t.id ? 'border-primary text-primary' : 'border-transparent text-neutral-gray hover:text-text-dark'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="p-6 flex flex-col gap-5">

                    {modalTab === 'profile' && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FieldInput label="Full Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} error={errors.name} span={2} />
                                <FieldInput label="Phone (+233)" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="024..." error={errors.phone} />
                                <FieldInput label="Email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="name@example.com" error={errors.email} />
                            </div>

                            {/* Role, and what it means. The role is the only thing
                                that decides a person's powers, so the form says
                                out loud what is being handed over. */}
                            <div>
                                <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">Role</label>
                                <select
                                    value={form.role}
                                    onChange={e => handleRoleChange(e.target.value as StaffRole)}
                                    className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40"
                                >
                                    {ASSIGNABLE_ROLES.map(role => (
                                        <option key={role} value={role}>{roleDisplayName(role)}</option>
                                    ))}
                                </select>
                                <div className="mt-2 p-3 bg-neutral-light border border-[#f0e8d8] rounded-xl">
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <p className="text-text-dark text-[11px] font-bold font-body">{rule.portal}</p>
                                        <span className="text-[10px] font-body text-neutral-gray">{branchRuleLabel(form.role)}</span>
                                    </div>
                                    <ul className="flex flex-col gap-1">
                                        {rule.can.map(line => (
                                            <li key={line} className="text-neutral-gray text-[11px] font-body leading-snug">· {line}</li>
                                        ))}
                                    </ul>
                                    <p className="text-neutral-gray text-[10px] font-body mt-2 pt-2 border-t border-[#f0e8d8]">
                                        Permissions come from the role. There is nothing to tick. To change what this person can do, change their role.
                                    </p>
                                </div>
                            </div>

                            {/* Branch — asked for only when the role has one. Head
                                office, the warehouse and the call centre serve the
                                whole company, so pinning them to a branch would be
                                asking a question with no answer. */}
                            {needsBranch ? (
                                <div>
                                    <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">
                                        {allowsMany ? 'Branches' : 'Branch'}
                                    </label>
                                    {branchesLoading ? (
                                        <div className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-neutral-gray text-sm font-body">
                                            Loading branches...
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {branches.map(b => {
                                                const id = String(b.id);
                                                return (
                                                    <label key={id} className="flex items-center gap-1.5 cursor-pointer">
                                                        <input
                                                            type={allowsMany ? 'checkbox' : 'radio'}
                                                            name="staff-branch"
                                                            checked={form.branchIds.includes(id)}
                                                            onChange={() => toggleBranch(id)}
                                                            className="accent-primary"
                                                        />
                                                        <span className="text-text-dark text-xs font-body">{b.name}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {errors.branchIds && <p className="text-error text-[10px] font-body mt-1">{errors.branchIds}</p>}
                                </div>
                            ) : (
                                <div className="px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl">
                                    <p className="text-neutral-gray text-[11px] font-body">
                                        <strong className="text-text-dark">{roleDisplayName(form.role)}</strong> works across the whole company, so there is no branch to assign.
                                    </p>
                                </div>
                            )}

                            {isNew && (
                                <div className="mt-1">
                                    <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Password Setup</label>
                                    <div className="flex gap-2 flex-wrap mb-3">
                                        {([
                                            { value: 'auto' as const, label: 'Auto-Generate' },
                                            { value: 'custom' as const, label: 'Set Password' },
                                            { value: 'prompt' as const, label: 'Send Prompt' },
                                        ]).map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setForm(f => ({ ...f, passwordMode: opt.value, password: '', passwordConfirm: '' }))}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-body cursor-pointer transition-colors ${
                                                    form.passwordMode === opt.value
                                                        ? 'bg-primary text-white'
                                                        : 'bg-neutral-light text-neutral-gray border border-[#f0e8d8]'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-neutral-gray text-[10px] font-body mb-2">
                                        {form.passwordMode === 'auto' && 'A secure password will be generated and shared with the staff member.'}
                                        {form.passwordMode === 'custom' && 'You set the password. The staff member will receive it directly.'}
                                        {form.passwordMode === 'prompt' && 'Staff member will receive a prompt to create their own password on first login.'}
                                    </p>
                                    {form.passwordMode === 'custom' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <FieldInput label="Password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} placeholder="Min 8 characters" error={errors.password} />
                                            <FieldInput label="Confirm" value={form.passwordConfirm} onChange={v => setForm(f => ({ ...f, passwordConfirm: v }))} placeholder="Re-type password" error={errors.passwordConfirm} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {modalTab === 'access' && (
                        <>
                            <div>
                                <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Employment Status</label>
                                <div className="flex gap-2 flex-wrap">
                                    {(['active', 'on_leave', 'suspended', 'terminated'] as EmploymentStatus[]).map(s => (
                                        <button key={s} type="button"
                                            onClick={() => setForm(f => ({ ...f, employmentStatus: s }))}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-body cursor-pointer transition-colors ${form.employmentStatus === s
                                                ? s === 'active' ? 'bg-secondary text-white' : s === 'on_leave' ? 'bg-warning text-white' : 'bg-error text-white'
                                                : 'bg-neutral-light text-neutral-gray border border-[#f0e8d8]'
                                            }`}>
                                            {employmentStatusLabel(s)}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-neutral-gray text-[10px] font-body mt-2">
                                    {form.employmentStatus === 'active' ? 'Currently employed and working.' : form.employmentStatus === 'on_leave' ? 'Employee is on approved leave.' : 'Employee has left the company.'}
                                </p>
                            </div>

                            <div className="p-4 bg-neutral-light rounded-xl flex flex-col gap-3 border border-[#f0e8d8]">
                                <div>
                                    <p className="text-text-dark text-sm font-bold font-body">System Access</p>
                                    <p className="text-neutral-gray text-xs font-body">
                                        Follows employment status. It is not a second switch that can disagree with it.
                                    </p>
                                </div>
                                {form.employmentStatus === 'active' ? (
                                    <p className="text-secondary text-xs font-bold font-body">
                                        Enabled: can sign in to the staff portal and POS.
                                    </p>
                                ) : (
                                    <p className="text-error text-xs font-bold font-body">
                                        Disabled: saving this signs them out everywhere and blocks sign-in.
                                    </p>
                                )}
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer p-3 bg-warning/5 border border-warning/20 rounded-xl">
                                <input
                                    type="checkbox"
                                    className="accent-warning"
                                    checked={form.forcePasswordReset}
                                    onChange={e => setForm(f => ({ ...f, forcePasswordReset: e.target.checked }))}
                                />
                                <div>
                                    <p className="text-text-dark text-sm font-semibold font-body">Force password reset on next login</p>
                                    <p className="text-neutral-gray text-xs font-body">Staff must set a new password before accessing the portal</p>
                                </div>
                            </label>
                        </>
                    )}

                    {modalTab === 'hr' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <FieldInput label="Date of Birth" value={form.dateOfBirth} onChange={v => setForm(f => ({ ...f, dateOfBirth: v }))} placeholder="e.g. 1992-04-15" />
                                <FieldInput label="Nationality" value={form.nationality} onChange={v => setForm(f => ({ ...f, nationality: v }))} placeholder="Ghanaian" />
                                <FieldInput label="SSNIT Number" value={form.ssnit} onChange={v => setForm(f => ({ ...f, ssnit: v }))} placeholder="C000000000" />
                                <FieldInput label="Ghana Card ID" value={form.ghanaCard} onChange={v => setForm(f => ({ ...f, ghanaCard: v }))} placeholder="GHA-000000000-0" />
                                <FieldInput label="TIN Number" value={form.tinNumber} onChange={v => setForm(f => ({ ...f, tinNumber: v }))} placeholder="P0000000000" span={2} />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Emergency Contact</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <FieldInput label="Name" value={form.emergencyName} onChange={v => setForm(f => ({ ...f, emergencyName: v }))} placeholder="Full name" span={2} />
                                    <FieldInput label="Phone" value={form.emergencyPhone} onChange={v => setForm(f => ({ ...f, emergencyPhone: v }))} placeholder="024..." />
                                    <FieldInput label="Relationship" value={form.emergencyRel} onChange={v => setForm(f => ({ ...f, emergencyRel: v }))} placeholder="Spouse, Parent…" />
                                </div>
                            </div>

                            <div className="p-3 bg-neutral-light rounded-xl border border-[#f0e8d8] flex items-center gap-3">
                                <IdentificationCardIcon size={32} weight="thin" className="text-neutral-gray/40 shrink-0" />
                                <div>
                                    <p className="text-text-dark text-sm font-medium font-body">Staff Photo</p>
                                    <p className="text-neutral-gray text-xs font-body">Photo upload coming soon</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {submitError && (
                    <div className="mx-6 px-4 py-2.5 rounded-xl bg-error/10 border border-error/20 flex items-center gap-2">
                        <WarningCircleIcon size={18} className="text-error shrink-0" />
                        <p className="text-error text-sm font-body">{submitError}</p>
                    </div>
                )}

                <div className="flex gap-3 px-6 py-4 border-t border-[#f0e8d8]">
                    <button type="button" onClick={onClose} disabled={isSaving} className="flex-1 px-4 py-2.5 bg-neutral-light text-text-dark rounded-xl text-sm font-medium font-body cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">Cancel</button>
                    <button type="button" onClick={() => void handleSave()} disabled={isSaving || (needsBranch && branchesLoading)} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body cursor-pointer hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                        {isSaving ? (isNew ? 'Creating…' : 'Saving…') : needsBranch && branchesLoading ? 'Loading...' : (isNew ? 'Create Account' : 'Save Changes')}
                    </button>
                </div>
            </div>
        </div>
    );
}

function FieldInput({ label, value, onChange, placeholder, error, span }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; error?: string; span?: number;
}) {
    return (
        <div className={span === 2 ? 'col-span-2' : ''}>
            <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">{label}</label>
            <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className={`w-full px-3 py-2.5 bg-neutral-light border rounded-xl text-text-dark text-sm font-body focus:outline-none ${error ? 'border-error/50 focus:border-error/70' : 'border-[#f0e8d8] focus:border-primary/40'}`} />
            {error && <p className="text-error text-[10px] font-body mt-1">{error}</p>}
        </div>
    );
}
