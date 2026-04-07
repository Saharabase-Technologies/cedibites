'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import * as React from 'react';
import {
    PlusIcon,
    PencilSimpleIcon,
    TrashIcon,
    LockSimpleIcon,
    SignOutIcon,
    ArrowCounterClockwiseIcon,
    ArchiveIcon,
    UserCircleIcon,
    MagnifyingGlassIcon,
    XIcon,
    WarningCircleIcon,
    ClockIcon,
    ToggleLeftIcon,
    ToggleRightIcon,
    IdentificationCardIcon,
    CaretLeftIcon,
    CaretRightIcon,
} from '@phosphor-icons/react';
import ActionMenu from '@/app/components/ui/ActionMenu';
import type { ActionMenuItem } from '@/app/components/ui/ActionMenu';
import {
    type StaffMember,
    type StaffRole,
    type StaffStatus,
    type EmploymentStatus,
    type SystemAccess,
    type StaffPermissions,
    roleDisplayName,
    employmentStatusLabel,
    defaultPermissions,
} from '@/types/staff';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useBranchesApi } from '@/lib/api/hooks/useBranchesApi';
import { useRoles, usePermissions } from '@/lib/api/hooks/useRoles';
import { employeeService, staffRoleToBackendRole, mapPermissionsToBackend } from '@/lib/api/services/employee.service';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/utils/toast';
import { isValidGhanaPhone, normalizeGhanaPhone } from '@/app/lib/phone';

// ─── Display helpers ──────────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, string> = {
    tech_admin:     'bg-primary/10 text-primary',
    admin:          'bg-primary/10 text-primary',
    branch_partner: 'bg-purple-100 text-purple-700',
    manager:        'bg-secondary/10 text-secondary',
    call_center:    'bg-info/10 text-info',
    sales_staff:    'bg-neutral-200 text-neutral-700',
    kitchen:        'bg-warning/10 text-warning',
    rider:          'bg-secondary/15 text-secondary',
};

function initials(name?: string | null) {
    const safeName = (name ?? '').trim();
    if (!safeName) return 'NA';
    return safeName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function RoleBadge({ role }: { role: StaffRole }) {
    return (
        <span className={`text-[10px] font-bold font-body px-2.5 py-1 rounded-full ${ROLE_STYLES[role] ?? 'bg-neutral-light text-neutral-gray'}`}>
            {roleDisplayName(role)}
        </span>
    );
}

function AvatarCircle({ name }: { name: string }) {
    return (
        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <span className="text-primary text-xs font-bold font-body">{initials(name)}</span>
        </div>
    );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
    return (
        <div className="flex items-center justify-between gap-3 py-1.5">
            <div className="flex-1 cursor-pointer" onClick={() => onChange(!checked)}>
                <p className="text-text-dark text-sm font-medium font-body">{label}</p>
                {sub && <p className="text-neutral-gray text-xs font-body">{sub}</p>}
            </div>
            <button type="button" onClick={() => onChange(!checked)} className="shrink-0 cursor-pointer">
                {checked
                    ? <ToggleRightIcon size={28} weight="fill" className="text-secondary" />
                    : <ToggleLeftIcon  size={28} weight="fill" className="text-neutral-gray/40" />
                }
            </button>
        </div>
    );
}

// ─── Confirm delete modal ─────────────────────────────────────────────────────

function ConfirmDeleteModal({ staff, onConfirm, onCancel }: { staff: StaffMember; onConfirm: () => void; onCancel: () => void }) {
    const [input, setInput] = useState('');
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-neutral-card rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
                <div className="h-1.5 bg-error" />
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <WarningCircleIcon size={18} weight="fill" className="text-error" />
                        <h3 className="text-text-dark text-base font-bold font-body">Delete account permanently?</h3>
                    </div>
                    <p className="text-neutral-gray text-sm font-body mb-4">
                        This will permanently delete <strong className="text-text-dark">{staff.name}</strong>&apos;s account.
                        Orders they processed will retain a &quot;[Deleted Staff]&quot; label.
                    </p>
                    <p className="text-xs font-body text-neutral-gray mb-2">Type <strong>CONFIRM</strong> to proceed:</p>
                    <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="CONFIRM"
                        className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-error/50 mb-4" />
                    <div className="flex gap-3">
                        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 bg-neutral-light text-text-dark rounded-xl text-sm font-medium font-body cursor-pointer">Cancel</button>
                        <button type="button" onClick={onConfirm} disabled={input !== 'CONFIRM'}
                            className="flex-1 px-4 py-2.5 bg-error text-white rounded-xl text-sm font-medium font-body disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
                            Delete permanently
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Staff modal ──────────────────────────────────────────────────────────────

type ModalTab = 'profile' | 'access' | 'permissions' | 'hr';

// Roles a branch manager can assign
const MANAGER_ASSIGNABLE_ROLES: StaffRole[] = ['manager', 'sales_staff', 'call_center', 'kitchen', 'rider'];

interface StaffFormState {
    name:             string;
    phone:            string;
    email:            string;
    password:         string;
    passwordConfirm:  string;
    role:             StaffRole;
    branch:           string;
    employmentStatus: EmploymentStatus;
    systemAccess:     SystemAccess;
    permissions:      StaffPermissions;
    forcePasswordReset: boolean;
    ssnit:            string;
    ghanaCard:        string;
    tinNumber:        string;
    dateOfBirth:      string;
    nationality:      string;
    emergencyName:    string;
    emergencyPhone:   string;
    emergencyRel:     string;
}

function memberToForm(s: StaffMember, branchName: string): StaffFormState {
    return {
        name: s.name,
        phone: s.phone ?? '',
        email: s.email ?? '',
        password: '',
        passwordConfirm: '',
        role: s.role,
        branch: branchName,
        employmentStatus: s.employmentStatus,
        systemAccess: s.systemAccess,
        permissions: { ...s.permissions },
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

function StaffModal({ staff, onClose, onSave, branchName, branchId }: {
    staff: StaffMember | null;
    onClose: () => void;
    onSave: (s: StaffMember) => void | Promise<void>;
    branchName: string;
    branchId: string;
}) {
    const { roles, isLoading: rolesLoading } = useRoles();
    const { permissions, isLoading: permissionsLoading } = usePermissions();
    const isNew = !staff;

    const blankForm = (): StaffFormState => ({
        name: '', phone: '', email: '', password: '', passwordConfirm: '',
        role: 'sales_staff',
        branch: branchName,
        employmentStatus: 'active',
        systemAccess: 'enabled',
        permissions: defaultPermissions('sales_staff'),
        forcePasswordReset: false,
        ssnit: '', ghanaCard: '', tinNumber: '',
        dateOfBirth: '', nationality: 'Ghanaian',
        emergencyName: '', emergencyPhone: '', emergencyRel: '',
    });

    const [form, setForm] = useState<StaffFormState>(staff ? memberToForm(staff, branchName) : blankForm());
    const [modalTab, setModalTab] = useState<ModalTab>('profile');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const dbRoleToStaffRole = (dbRoleName: string): StaffRole => {
        const mapping: Record<string, StaffRole> = {
            'tech_admin': 'tech_admin', 'admin': 'admin', 'branch_partner': 'branch_partner',
            'manager': 'manager', 'call_center': 'call_center', 'sales_staff': 'sales_staff',
            'kitchen': 'kitchen', 'rider': 'rider', 'employee': 'sales_staff',
        };
        return mapping[dbRoleName] ?? 'sales_staff';
    };

    const availableRoles = roles.filter(role => {
        const staffRole = dbRoleToStaffRole(role.name);
        return MANAGER_ASSIGNABLE_ROLES.includes(staffRole);
    });

    const BACKEND_TO_FRONTEND: Record<string, keyof StaffPermissions> = {
        view_orders:           'canViewOrders',
        create_orders:         'canPlaceOrders',
        update_orders:         'canAdvanceOrders',
        delete_orders:         'canDeleteOrders',
        view_menu:             'canViewMenu',
        manage_menu:           'canManageMenu',
        view_branches:         'canViewBranches',
        manage_branches:       'canManageBranches',
        view_customers:        'canViewCustomers',
        manage_customers:      'canManageCustomers',
        view_employees:        'canViewEmployees',
        manage_employees:      'canManageStaff',
        view_analytics:        'canViewReports',
        view_activity_log:     'canViewActivityLog',
        access_admin_panel:    'canAccessAdminPanel',
        access_manager_portal: 'canAccessManagerPortal',
        access_sales_portal:   'canAccessSalesPortal',
        access_partner_portal: 'canAccessPartnerPortal',
        access_pos:            'canAccessPOS',
        access_kitchen:        'canAccessKitchen',
        access_order_manager:  'canAccessOrderManager',
        manage_shifts:         'canManageShifts',
        manage_settings:       'canManageSettings',
        view_my_shifts:        'canViewMyShifts',
        view_my_sales:         'canViewMySales',
    };

    const getPermissionMapping = () => {
        const mapping: Record<string, { key: keyof StaffPermissions; label: string; description: string }> = {};
        permissions.forEach(perm => {
            const frontendKey = BACKEND_TO_FRONTEND[perm.name];
            if (frontendKey) {
                mapping[perm.name] = { key: frontendKey, label: perm.display_name, description: perm.description };
            }
        });
        return mapping;
    };

    const permissionMapping = getPermissionMapping();
    const rolePermissions = new Set(roles.find(r => r.name === staffRoleToBackendRole(form.role))?.permissions ?? []);
    const displayPermissions = Object.entries(permissionMapping).filter(([permName]) => !rolePermissions.has(permName));

    function handleRoleChange(newRole: StaffRole) {
        setForm(f => ({ ...f, role: newRole, permissions: defaultPermissions(newRole) }));
    }

    function validate() {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Name is required';
        if (!isValidGhanaPhone(form.phone)) e.phone = 'Enter a valid Ghanaian phone number (e.g. 0241234567 or +233241234567)';
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address';
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function handleSave() {
        setSubmitError(null);
        if (!validate()) return;

        const updated: StaffMember = {
            ...(staff ?? {
                id:          `u${Date.now()}`,
                status:      'active' as StaffStatus,
                password:    form.password,
                joinedAt:    new Date().toLocaleDateString('en-GH', { month: 'short', year: 'numeric' }),
                lastLogin:   'Never',
                ordersToday: 0,
            }),
            name:             form.name.trim(),
            phone:            normalizeGhanaPhone(form.phone.trim()),
            email:            form.email.trim(),
            role:             form.role,
            branch:           branchName,
            branchIds:        [branchId],
            employmentStatus: form.employmentStatus,
            systemAccess:     form.systemAccess,
            permissions:      form.permissions,
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
        { id: 'profile',     label: 'Profile' },
        { id: 'access',      label: 'Access' },
        { id: 'permissions', label: 'Permissions' },
        { id: 'hr',          label: 'HR Info' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/30 backdrop-blur-sm overflow-y-auto">
            <div className="bg-neutral-card rounded-2xl shadow-2xl w-full max-w-lg my-8">
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0e8d8]">
                    <h2 className="text-text-dark text-lg font-bold font-body">{isNew ? 'Add Staff Member' : `Edit — ${staff?.name}`}</h2>
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

                    {/* ── Profile tab ── */}
                    {modalTab === 'profile' && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FieldInput label="Full Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} error={errors.name} span={2} />
                                <FieldInput label="Phone (+233)" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="024..." error={errors.phone} />
                                <FieldInput label="Email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="name@example.com" error={errors.email} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">Role</label>
                                    <select
                                        value={form.role}
                                        onChange={e => handleRoleChange(e.target.value as StaffRole)}
                                        className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40"
                                        disabled={rolesLoading}
                                    >
                                        {rolesLoading ? (
                                            <option>Loading roles...</option>
                                        ) : (
                                            availableRoles.map(role => {
                                                const staffRole = dbRoleToStaffRole(role.name);
                                                return (
                                                    <option key={role.name} value={staffRole}>
                                                        {role.display_name}
                                                    </option>
                                                );
                                            })
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">Branch</label>
                                    <div className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body">
                                        {branchName}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── Access tab ── */}
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
                                    <p className="text-neutral-gray text-xs font-body">Controls whether this person can log in to the staff portal or POS terminal.</p>
                                </div>
                                <div className="flex gap-2">
                                    {(['enabled', 'disabled'] as SystemAccess[]).map(a => (
                                        <button key={a} type="button"
                                            onClick={() => setForm(f => ({ ...f, systemAccess: a }))}
                                            className={`flex-1 py-2 rounded-xl text-xs font-bold font-body cursor-pointer transition-colors ${form.systemAccess === a
                                                ? a === 'enabled' ? 'bg-secondary text-white' : 'bg-error/10 text-error border border-error/30'
                                                : 'bg-neutral-card text-neutral-gray border border-[#f0e8d8]'
                                            }`}>
                                            {a === 'enabled' ? 'Enabled' : 'Disabled'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer p-3 bg-warning/5 border border-warning/20 rounded-xl">
                                <input type="checkbox" className="accent-warning"
                                    checked={form.forcePasswordReset}
                                    onChange={e => setForm(f => ({ ...f, forcePasswordReset: e.target.checked }))} />
                                <div>
                                    <p className="text-text-dark text-sm font-semibold font-body">Force password reset on next login</p>
                                    <p className="text-neutral-gray text-xs font-body">Staff must set a new password before accessing the portal</p>
                                </div>
                            </label>
                        </>
                    )}

                    {/* ── Permissions tab ── */}
                    {modalTab === 'permissions' && (
                        <div className="flex flex-col gap-0.5">
                            <p className="text-neutral-gray text-xs font-body mb-2">
                                Permissions already included in the <strong className="text-text-dark">{roleDisplayName(form.role)}</strong> role are not shown. These are extras you can grant individually.
                            </p>
                            {permissionsLoading ? (
                                <div className="text-center py-4"><p className="text-neutral-gray text-sm font-body">Loading permissions...</p></div>
                            ) : displayPermissions.length === 0 ? (
                                <p className="text-center text-neutral-gray text-sm font-body py-6">All available permissions are already included in the {roleDisplayName(form.role)} role.</p>
                            ) : (
                                <div className="divide-y divide-[#f0e8d8]">
                                    {displayPermissions.map(([permName, permConfig]) => (
                                        <Toggle key={permName}
                                            checked={form.permissions[permConfig.key]}
                                            onChange={v => setForm(f => ({ ...f, permissions: { ...f.permissions, [permConfig.key]: v } }))}
                                            label={permConfig.label} sub={permConfig.description} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── HR Info tab ── */}
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
                    <button type="button" onClick={() => void handleSave()} disabled={isSaving || rolesLoading}
                        className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body cursor-pointer hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                        {isSaving ? (isNew ? 'Creating…' : 'Saving…') : rolesLoading ? 'Loading...' : (isNew ? 'Create Account' : 'Save Changes')}
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

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type FilterTab = 'All' | 'Manager' | 'Sales Staff' | 'Call Center' | 'Kitchen' | 'Rider' | 'Suspended' | 'Terminated';

function matchesTab(s: StaffMember, tab: FilterTab): boolean {
    if (tab === 'Suspended')  return s.status === 'suspended';
    if (tab === 'Terminated') return s.status === 'terminated';
    if (tab === 'All')        return s.status !== 'terminated';
    if (tab === 'Manager')     return s.role === 'manager'      && s.status !== 'terminated';
    if (tab === 'Sales Staff') return s.role === 'sales_staff' && s.status !== 'terminated';
    if (tab === 'Call Center') return s.role === 'call_center' && s.status !== 'terminated';
    if (tab === 'Kitchen')     return s.role === 'kitchen'      && s.status !== 'terminated';
    if (tab === 'Rider')       return s.role === 'rider'        && s.status !== 'terminated';
    return false;
}

function tabCount(staff: StaffMember[], tab: FilterTab): number {
    return staff.filter(s => matchesTab(s, tab)).length;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function isNewStaffId(id: string): boolean {
    return id.startsWith('u');
}

export default function ManagerStaffPage() {
    const { staffUser } = useStaffAuth();
    const branchName = staffUser?.branches[0]?.name ?? '';
    const branchId = staffUser?.branches[0]?.id ?? '';
    const queryClient = useQueryClient();

    const { data: apiStaff = [], isLoading } = useQuery({
        queryKey: ['branch-employees', branchId],
        queryFn: () => branchId ? employeeService.getBranchEmployees(branchId) : Promise.resolve([]),
        enabled: !!branchId,
        staleTime: 5 * 60 * 1000,
    });

    const [staff, setStaff] = useState<StaffMember[]>([]);
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (!hasInitialized.current && apiStaff.length > 0) {
            hasInitialized.current = true;
            setStaff(apiStaff);
        }
    }, [apiStaff]);

    const [tab, setTab] = useState<FilterTab>('All');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [editStaff, setEditStaff] = useState<StaffMember | null | 'new'>(null);
    const [deleteStaff, setDeleteStaff] = useState<StaffMember | null>(null);

    const PER_PAGE = 10;
    const TABS: FilterTab[] = ['All', 'Manager', 'Sales Staff', 'Call Center', 'Kitchen', 'Rider', 'Suspended', 'Terminated'];

    const filtered = useMemo(() => {
        let list = staff.filter(s => matchesTab(s, tab));
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                s => s.name.toLowerCase().includes(q)
                    || (s.phone ?? '').includes(q)
                    || (s.email ?? '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [staff, tab, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const paged = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);

    // Reset page when filters change
    useEffect(() => { setPage(1); }, [tab, search]);

    async function saveStaff(s: StaffMember) {
        const isNew = isNewStaffId(s.id);
        try {
            if (isNew) {
                await employeeService.createEmployee({
                    name: s.name,
                    email: s.email || null,
                    phone: s.phone,
                    branch_ids: [Number(branchId)],
                    role: staffRoleToBackendRole(s.role),
                    hire_date: s.joinedAt || undefined,
                    ssnit_number: s.ssnit || undefined,
                    ghana_card_id: s.ghanaCard || undefined,
                    tin_number: s.tinNumber || undefined,
                    date_of_birth: s.dateOfBirth || undefined,
                    nationality: s.nationality || undefined,
                    emergency_contact_name: s.emergencyContact?.name || undefined,
                    emergency_contact_phone: s.emergencyContact?.phone || undefined,
                    emergency_contact_relationship: s.emergencyContact?.relationship || undefined,
                    permissions: mapPermissionsToBackend(s.permissions),
                });
            } else {
                await employeeService.updateEmployee(s.id, {
                    name: s.name,
                    email: s.email || null,
                    phone: s.phone,
                    branch_ids: [Number(branchId)],
                    role: staffRoleToBackendRole(s.role),
                    hire_date: s.joinedAt || undefined,
                    ssnit_number: s.ssnit || undefined,
                    ghana_card_id: s.ghanaCard || undefined,
                    tin_number: s.tinNumber || undefined,
                    date_of_birth: s.dateOfBirth || undefined,
                    nationality: s.nationality || undefined,
                    emergency_contact_name: s.emergencyContact?.name || undefined,
                    emergency_contact_phone: s.emergencyContact?.phone || undefined,
                    emergency_contact_relationship: s.emergencyContact?.relationship || undefined,
                    permissions: mapPermissionsToBackend(s.permissions),
                });
            }
            await queryClient.invalidateQueries({ queryKey: ['branch-employees', branchId] });
            const result = await queryClient.fetchQuery({ queryKey: ['branch-employees', branchId], queryFn: () => employeeService.getBranchEmployees(branchId) });
            setStaff(Array.isArray(result) ? result : []);
            setEditStaff(null);
            toast.success(isNew ? `${s.name} has been added successfully` : `${s.name} has been updated successfully`);
        } catch (err: unknown) {
            let msg = 'Failed to save. Please try again.';
            if (err && typeof err === 'object' && 'response' in err) {
                const res = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
                if (res?.message) msg = res.message;
                else if (res?.errors && typeof res.errors === 'object') {
                    const first = Object.values(res.errors).flat()[0];
                    if (first) msg = first;
                }
            } else if (err instanceof Error) msg = err.message;
            throw new Error(msg);
        }
    }

    async function deleteStaffFn(s: StaffMember) {
        try {
            await employeeService.deleteEmployee(s.id);
            setStaff(prev => prev.filter(x => x.id !== s.id));
            setDeleteStaff(null);
            toast.success(`${s.name} has been deleted successfully`);
        } catch {
            toast.error('Failed to delete employee. Please try again.');
            setDeleteStaff(null);
        }
    }

    async function suspend(s: StaffMember) {
        try {
            await employeeService.updateEmployee(s.id, { status: 'suspended' });
            setStaff(prev => prev.map(x => x.id === s.id ? { ...x, status: 'suspended' as StaffStatus, systemAccess: 'disabled' as SystemAccess } : x));
            toast.success(`${s.name} has been suspended`);
        } catch { toast.error('Failed to suspend. Please try again.'); }
    }

    async function reinstate(s: StaffMember) {
        try {
            await employeeService.updateEmployee(s.id, { status: 'active' });
            setStaff(prev => prev.map(x => x.id === s.id ? { ...x, status: 'active' as StaffStatus, systemAccess: 'enabled' as SystemAccess } : x));
            toast.success(`${s.name} has been reinstated`);
        } catch { toast.error('Failed to reinstate. Please try again.'); }
    }

    async function archive(s: StaffMember) {
        try {
            await employeeService.updateEmployee(s.id, { status: 'terminated' });
            setStaff(prev => prev.map(x => x.id === s.id ? { ...x, status: 'terminated' as StaffStatus, systemAccess: 'disabled' as SystemAccess, employmentStatus: 'terminated' as EmploymentStatus } : x));
            toast.success(`${s.name} has been terminated`);
        } catch { toast.error('Failed to terminate. Please try again.'); }
    }

    async function forceLogout(s: StaffMember) {
        try {
            await employeeService.forceLogout(s.id);
            toast.success(`${s.name} has been logged out from all devices`);
        } catch { toast.error('Failed to force logout. Please try again.'); }
    }

    async function requirePasswordReset(s: StaffMember) {
        try {
            await employeeService.requirePasswordReset(s.id);
            toast.success(`Password reset required for ${s.name}. Notification sent.`);
        } catch { toast.error('Failed to require password reset. Please try again.'); }
    }

    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-text-dark text-2xl font-bold font-body">Staff Management</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5">{branchName} · {filtered.length} staff shown</p>
                </div>
                <button type="button" onClick={() => setEditStaff('new')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body hover:bg-primary-hover transition-colors cursor-pointer shrink-0">
                    <PlusIcon size={16} weight="bold" /> Add Staff Member
                </button>
            </div>

            {/* Tabs + search */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {TABS.map(t => (
                        <button key={t} type="button" onClick={() => setTab(t)}
                            className={`px-3 py-2 rounded-xl text-xs font-medium font-body whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${tab === t ? 'bg-primary text-white' : 'bg-neutral-card border border-[#f0e8d8] text-neutral-gray hover:text-text-dark'}`}>
                            {t}
                            <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${tab === t ? 'bg-neutral-card/20 text-white' : 'bg-neutral-light text-neutral-gray'}`}>{tabCount(staff, t)}</span>
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 min-w-45">
                    <MagnifyingGlassIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, email…"
                        className="w-full pl-9 pr-3 py-2.5 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40" />
                </div>
            </div>

            {/* Staff table */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                {isLoading && staff.length === 0 ? (
                    <div className="px-4 py-16 text-center"><p className="text-neutral-gray text-sm font-body">Loading staff…</p></div>
                ) : filtered.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <UserCircleIcon size={32} weight="thin" className="text-neutral-gray/40 mx-auto mb-3" />
                        <p className="text-neutral-gray text-sm font-body">No staff found.</p>
                    </div>
                ) : (
                    <>
                        <div className="hidden sm:grid grid-cols-[minmax(0,1.5fr)_100px_minmax(0,1fr)_100px_140px] gap-3 px-5 py-2.5 border-b border-[#f0e8d8] text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">
                            <span>Name</span>
                            <span>Role</span>
                            <span>Contact</span>
                            <span>Last Login</span>
                            <span className="text-right">Actions</span>
                        </div>
                        {paged.map((member, i) => (
                            <div key={member.id}
                                className={`px-5 py-3.5 flex flex-col sm:grid sm:grid-cols-[minmax(0,1.5fr)_100px_minmax(0,1fr)_100px_140px] gap-2 sm:gap-3 sm:items-center ${i < paged.length - 1 ? 'border-b border-[#f0e8d8]' : ''} hover:bg-neutral-light/40 transition-colors`}>

                                {/* Name + avatar + status */}
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <AvatarCircle name={member.name} />
                                    <div className="min-w-0">
                                        <p className="text-text-dark text-sm font-semibold font-body truncate">{member.name}</p>
                                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                            {member.status === 'suspended' && (
                                                <span className="text-[10px] font-body bg-error/10 text-error px-2 py-0.5 rounded-full">Suspended</span>
                                            )}
                                            {member.status === 'on_leave' && (
                                                <span className="text-[10px] font-body bg-warning/10 text-warning px-2 py-0.5 rounded-full">On Leave</span>
                                            )}
                                            {member.status === 'terminated' && (
                                                <span className="text-[10px] font-body bg-neutral-light text-neutral-gray px-2 py-0.5 rounded-full">Terminated</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Role */}
                                <div><RoleBadge role={member.role} /></div>

                                {/* Contact */}
                                <div className="min-w-0">
                                    <p className="text-text-dark text-xs font-body truncate">{member.phone}</p>
                                    <p className="text-neutral-gray text-[10px] font-body truncate">{member.email}</p>
                                </div>

                                {/* Last Login */}
                                <div className="flex items-center gap-1">
                                    <ClockIcon size={11} weight="fill" className="text-neutral-gray shrink-0" />
                                    <p className="text-neutral-gray text-[10px] font-body">{member.lastLogin}</p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end shrink-0">
                                    <ActionMenu items={(() => {
                                        const actions: ActionMenuItem[] = [];
                                        if (member.status !== 'terminated') {
                                            actions.push(
                                                { icon: PencilSimpleIcon, label: 'Edit', onClick: () => setEditStaff(member), color: 'text-primary' },
                                                { icon: LockSimpleIcon, label: 'Reset PW', onClick: () => requirePasswordReset(member), color: 'text-neutral-gray' },
                                                { icon: SignOutIcon, label: 'Force Logout', onClick: () => forceLogout(member), color: 'text-neutral-gray' },
                                            );
                                            if (member.status !== 'suspended') {
                                                actions.push({ icon: ArchiveIcon, label: 'Suspend', onClick: () => suspend(member), color: 'text-warning' });
                                            } else {
                                                actions.push({ icon: ArrowCounterClockwiseIcon, label: 'Reinstate', onClick: () => reinstate(member), color: 'text-secondary' });
                                            }
                                            actions.push(
                                                { icon: ArchiveIcon, label: 'Terminate', onClick: () => archive(member), color: 'text-neutral-gray' },
                                                { icon: TrashIcon, label: 'Delete', onClick: () => setDeleteStaff(member), color: 'text-error' },
                                            );
                                        } else {
                                            actions.push(
                                                { icon: ArrowCounterClockwiseIcon, label: 'Restore', onClick: () => reinstate(member), color: 'text-secondary' },
                                                { icon: TrashIcon, label: 'Delete', onClick: () => setDeleteStaff(member), color: 'text-error' },
                                            );
                                        }
                                        return actions;
                                    })()} />
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <p className="text-neutral-gray text-xs font-body">
                        Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
                    </p>
                    <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium font-body bg-neutral-card border border-[#f0e8d8] text-neutral-gray hover:text-text-dark transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                            <CaretLeftIcon size={12} weight="bold" /> Prev
                        </button>
                        <span className="text-neutral-gray text-xs font-body px-2">Page {page} of {totalPages}</span>
                        <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium font-body bg-neutral-card border border-[#f0e8d8] text-neutral-gray hover:text-text-dark transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                            Next <CaretRightIcon size={12} weight="bold" />
                        </button>
                    </div>
                </div>
            )}

            {/* Modals */}
            {editStaff !== null && (
                <StaffModal
                    staff={editStaff === 'new' ? null : editStaff as StaffMember}
                    onClose={() => setEditStaff(null)}
                    onSave={saveStaff}
                    branchName={branchName}
                    branchId={branchId}
                />
            )}
            {deleteStaff && (
                <ConfirmDeleteModal staff={deleteStaff} onConfirm={() => deleteStaffFn(deleteStaff)} onCancel={() => setDeleteStaff(null)} />
            )}
        </div>
    );
}
