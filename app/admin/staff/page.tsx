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
    BuildingsIcon,
    ClockIcon,
    ToggleLeftIcon,
    ToggleRightIcon,
    IdentificationCardIcon,
} from '@phosphor-icons/react';
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
import { useEmployees } from '@/lib/api/hooks/useEmployees';
import { useBranchesApi } from '@/lib/api/hooks/useBranchesApi';
import { useRoles, usePermissions } from '@/lib/api/hooks/useRoles';
import { employeeService, staffRoleToBackendRole, mapPermissionsToBackend } from '@/lib/api/services/employee.service';
import { toast } from '@/lib/utils/toast';
import { isValidGhanaPhone, normalizeGhanaPhone } from '@/app/lib/phone';

// ─── Display helpers ──────────────────────────────────────────────────────────

const ROLE_STYLES: Record<StaffRole, string> = {
    admin:          'bg-primary/10 text-primary',
    super_admin:    'bg-primary/10 text-primary',
    branch_partner: 'bg-purple-100 text-purple-700',
    manager:        'bg-secondary/10 text-secondary',
    call_center:    'bg-info/10 text-info',
    sales_staff:    'bg-neutral-200 text-neutral-700',
    kitchen:        'bg-warning/10 text-warning',
    rider:          'bg-secondary/15 text-secondary',
};

function initials(name?: string | null) {
    const safeName = (name ?? '').trim();
    if (!safeName) {
        return 'NA';
    }
    return safeName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function branchDisplay(branch: string | string[]) {
    return Array.isArray(branch) ? branch.join(', ') : branch;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: StaffRole }) {
    return (
        <span className={`text-[10px] font-bold font-body px-2.5 py-1 rounded-full ${ROLE_STYLES[role]}`}>
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

interface StaffFormState {
    name:             string;
    phone:            string;
    email:            string;
    password:         string;
    passwordConfirm:  string;
    role:             StaffRole;
    branch:           string | string[];
    employmentStatus: EmploymentStatus;
    systemAccess:     SystemAccess;
    permissions:      StaffPermissions;
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
    // Handle branch data properly - convert string to array if needed
    let branchValue: string | string[];
    if (MULTI_BRANCH_ROLES.includes(s.role)) {
        // For multi-branch roles, ensure branch is an array
        if (typeof s.branch === 'string') {
            // Split comma-separated string into array
            branchValue = s.branch.split(',').map(b => b.trim()).filter(b => b.length > 0);
        } else {
            branchValue = Array.isArray(s.branch) ? s.branch : [s.branch];
        }
    } else {
        // For single-branch roles, ensure branch is a string
        if (Array.isArray(s.branch)) {
            branchValue = s.branch[0] || '';
        } else if (typeof s.branch === 'string') {
            // If it's a comma-separated string, take the first branch
            branchValue = s.branch.split(',')[0]?.trim() || '';
        } else {
            branchValue = s.branch || '';
        }
    }

    return {
        name: s.name,
        phone: s.phone ?? '',
        email: s.email ?? '',
        password: '',
        passwordConfirm: '',
        role: s.role,
        branch: branchValue,
        employmentStatus: s.employmentStatus,
        systemAccess: s.systemAccess,
        permissions: { ...s.permissions },
        forcePasswordReset: false, // Always default to false for existing staff
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

// Roles that can span multiple branches
const MULTI_BRANCH_ROLES: StaffRole[] = ['call_center', 'branch_partner', 'super_admin'];

function StaffModal({ staff, onClose, onSave }: { staff: StaffMember | null; onClose: () => void; onSave: (s: StaffMember) => void | Promise<void> }) {
    const { branches, isLoading: branchesLoading } = useBranchesApi();
    const { roles, isLoading: rolesLoading } = useRoles();
    const { permissions, isLoading: permissionsLoading } = usePermissions();
    const ALL_BRANCHES = branches.map((b) => b.name);
    const BRANCH_ID_MAP: Record<string, string> = Object.fromEntries(branches.map((b) => [b.name, String(b.id)]));
    const isNew = !staff;
    
    // Create a dynamic blank form that uses the first available branch
    const createBlankForm = (): StaffFormState => ({
        name: '', phone: '', email: '', password: '', passwordConfirm: '',
        role: 'sales_staff',
        branch: ALL_BRANCHES[0] || '',
        employmentStatus: 'active',
        systemAccess: 'enabled',
        permissions: defaultPermissions('sales_staff'),
        forcePasswordReset: false,
        ssnit: '', ghanaCard: '', tinNumber: '',
        dateOfBirth: '', nationality: 'Ghanaian',
        emergencyName: '', emergencyPhone: '', emergencyRel: '',
    });
    
    const [form, setForm] = useState<StaffFormState>(staff ? memberToForm(staff) : createBlankForm());
    const [modalTab, setModalTab] = useState<ModalTab>('profile');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    
    // Update form branch when branches load (for new staff only)
    React.useEffect(() => {
        if (isNew && ALL_BRANCHES.length > 0 && !form.branch) {
            setForm(f => ({ ...f, branch: ALL_BRANCHES[0] }));
        }
    }, [ALL_BRANCHES, isNew, form.branch]);

    // Convert database role name to StaffRole
    const dbRoleToStaffRole = (dbRoleName: string): StaffRole => {
        const mapping: Record<string, StaffRole> = {
            'super_admin': 'super_admin',
            'admin': 'super_admin', // Map admin to super_admin for display
            'branch_partner': 'branch_partner',
            'manager': 'manager',
            'call_center': 'call_center',
            'sales_staff': 'sales_staff',
            'kitchen': 'kitchen',
            'rider': 'rider',
            'employee': 'sales_staff', // Map legacy employee to sales_staff
        };
        return mapping[dbRoleName] ?? 'sales_staff';
    };

    // Convert StaffRole to database role name
    const staffRoleToDbRole = (staffRole: StaffRole): string => {
        const mapping: Record<StaffRole, string> = {
            'admin': 'admin',
            'super_admin': 'super_admin',
            'branch_partner': 'branch_partner',
            'manager': 'manager',
            'call_center': 'call_center',
            'sales_staff': 'sales_staff',
            'kitchen': 'kitchen',
            'rider': 'rider',
        };
        return mapping[staffRole] ?? 'sales_staff';
    };

    // Get available roles for the dropdown (filter to only show roles that map to valid StaffRole)
    const availableRoles = roles.filter(role => {
        if (role.name === 'employee') {
            return false;
        }
        const staffRole = dbRoleToStaffRole(role.name);
        return ['super_admin', 'branch_partner', 'manager', 'call_center', 'sales_staff', 'kitchen', 'rider'].includes(staffRole);
    });

    // Map database permissions to frontend permission structure
    const getPermissionMapping = () => {
        const mapping: Record<string, { key: keyof StaffPermissions; label: string; description: string }> = {};
        
        permissions.forEach(perm => {
            switch (perm.name) {
                case 'create_orders':
                    mapping[perm.name] = { key: 'canPlaceOrders', label: perm.display_name, description: perm.description };
                    break;
                case 'update_orders':
                    mapping[perm.name] = { key: 'canAdvanceOrders', label: perm.display_name, description: perm.description };
                    break;
                case 'access_pos':
                    mapping[perm.name] = { key: 'canAccessPOS', label: 'Can Access POS Terminal', description: 'Allows logging in to the POS terminal with a PIN' };
                    break;
                case 'view_analytics':
                    mapping[perm.name] = { key: 'canViewReports', label: perm.display_name, description: perm.description };
                    break;
                case 'manage_menu':
                    mapping[perm.name] = { key: 'canManageMenu', label: perm.display_name, description: perm.description };
                    break;
                case 'manage_employees':
                    mapping[perm.name] = { key: 'canManageStaff', label: perm.display_name, description: perm.description };
                    break;
                case 'manage_shifts':
                    mapping[perm.name] = { key: 'canManageShifts', label: perm.display_name, description: perm.description };
                    break;
                case 'manage_settings':
                    mapping[perm.name] = { key: 'canManageSettings', label: perm.display_name, description: perm.description };
                    break;
                case 'view_my_shifts':
                    mapping[perm.name] = { key: 'canViewMyShifts', label: perm.display_name, description: perm.description };
                    break;
                case 'view_my_sales':
                    mapping[perm.name] = { key: 'canViewMySales', label: perm.display_name, description: perm.description };
                    break;
            }
        });
        
        return mapping;
    };

    const permissionMapping = getPermissionMapping();
    // Only show permissions not already granted by the selected role
    const rolePermissions = new Set(roles.find(r => r.name === staffRoleToBackendRole(form.role))?.permissions ?? []);
    const displayPermissions = Object.entries(permissionMapping).filter(([permName]) => !rolePermissions.has(permName));

    const isMultiBranch = MULTI_BRANCH_ROLES.includes(form.role);

    // When role changes, reset permissions to role defaults
    function handleRoleChange(newRole: StaffRole) {
        setForm(f => ({
            ...f,
            role: newRole,
            permissions: defaultPermissions(newRole),
            branch: MULTI_BRANCH_ROLES.includes(newRole)
                ? (Array.isArray(f.branch) ? f.branch : [f.branch as string])
                : (Array.isArray(f.branch) ? f.branch[0] : f.branch),
        }));
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
        
        // Ensure branches are loaded
        if (branches.length === 0) {
            setSubmitError('Branches are still loading. Please wait and try again.');
            return;
        }
        
        // Process branch data properly
        let branchNames: string[] = [];
        if (Array.isArray(form.branch)) {
            // If it's already an array, flatten any comma-separated strings
            branchNames = form.branch.flatMap(b => 
                typeof b === 'string' ? b.split(',').map(name => name.trim()).filter(name => name.length > 0) : []
            );
        } else if (typeof form.branch === 'string') {
            // If it's a string, split by comma
            branchNames = form.branch.split(',').map(name => name.trim()).filter(name => name.length > 0);
        }
        
        // Remove duplicates
        branchNames = [...new Set(branchNames)];
        
        // Validate that all selected branches exist in the branch map
        const branchIds = branchNames.map(branchName => {
            const branchId = BRANCH_ID_MAP[branchName];
            if (!branchId) {
                console.error(`Branch "${branchName}" not found in BRANCH_ID_MAP:`, BRANCH_ID_MAP);
                console.error('Available branches:', Object.keys(BRANCH_ID_MAP));
                console.error('Processed branch names:', branchNames);
                console.error('Original form.branch:', form.branch);
                throw new Error(`Invalid branch selected: ${branchName}`);
            }
            return branchId;
        });
        
        if (branchIds.length === 0) {
            setSubmitError('Please select at least one branch.');
            return;
        }
        
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
            branch:           isMultiBranch ? branchNames : branchNames[0],
            branchIds:        branchIds,
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
            
            // Handle force password reset separately for existing staff
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
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0e8d8]">
                    <h2 className="text-text-dark text-lg font-bold font-body">
                        {isNew ? 'Add Staff Member' : `Edit — ${staff?.name}`}
                    </h2>
                    <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-light cursor-pointer">
                        <XIcon size={16} className="text-neutral-gray" />
                    </button>
                </div>

                {/* Tabs */}
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
                                    <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">
                                        {isMultiBranch ? 'Branches' : 'Branch'}
                                    </label>
                                    {branchesLoading ? (
                                        <div className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-neutral-gray text-sm font-body">
                                            Loading branches...
                                        </div>
                                    ) : isMultiBranch ? (
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {ALL_BRANCHES.map((b, i) => {
                                                const arr = Array.isArray(form.branch) ? form.branch : [form.branch as string];
                                                return (
                                                    <label key={`${b}-${i}`} className="flex items-center gap-1.5 cursor-pointer">
                                                        <input type="checkbox" checked={arr.includes(b)} onChange={e => {
                                                            const branches = Array.isArray(form.branch) ? form.branch : [form.branch as string];
                                                            setForm(f => ({ ...f, branch: e.target.checked ? [...branches, b] : branches.filter(x => x !== b) }));
                                                        }} className="accent-primary" />
                                                        <span className="text-text-dark text-xs font-body">{b}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <select
                                            value={Array.isArray(form.branch) ? form.branch[0] : form.branch}
                                            onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}
                                            className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40"
                                        >
                                            {ALL_BRANCHES.map((b, i) => <option key={`${b}-${i}`} value={b}>{b}</option>)}
                                        </select>
                                    )}
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
                                    {(['active', 'on_leave', 'resigned'] as EmploymentStatus[]).map(s => (
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

                    {/* ── Permissions tab ── */}
                    {modalTab === 'permissions' && (
                        <div className="flex flex-col gap-0.5">
                            <p className="text-neutral-gray text-xs font-body mb-2">
                                Permissions already included in the <strong className="text-text-dark">{roleDisplayName(form.role)}</strong> role are not shown. These are extras you can grant individually.
                            </p>
                            {permissionsLoading ? (
                                <div className="text-center py-4">
                                    <p className="text-neutral-gray text-sm font-body">Loading permissions...</p>
                                </div>
                            ) : displayPermissions.length === 0 ? (
                                <p className="text-center text-neutral-gray text-sm font-body py-6">
                                    All available permissions are already included in the {roleDisplayName(form.role)} role.
                                </p>
                            ) : (
                                <div className="divide-y divide-[#f0e8d8]">
                                    {displayPermissions.map(([permName, permConfig]) => (
                                        <Toggle
                                            key={permName}
                                            checked={form.permissions[permConfig.key]}
                                            onChange={v => setForm(f => ({ 
                                                ...f, 
                                                permissions: { 
                                                    ...f.permissions, 
                                                    [permConfig.key]: v
                                                },
                                                            }))}
                                            label={permConfig.label}
                                            sub={permConfig.description}
                                        />
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
                    <button type="button" onClick={() => void handleSave()} disabled={isSaving || branchesLoading || rolesLoading} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body cursor-pointer hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                        {isSaving ? (isNew ? 'Creating…' : 'Saving…') : branchesLoading || rolesLoading ? 'Loading...' : (isNew ? 'Create Account' : 'Save Changes')}
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

// ─── Tab types ────────────────────────────────────────────────────────────────

type FilterTab = 'All' | 'Super Admin' | 'Branch Partner' | 'Branch Manager' | 'Call Center' | 'Support Staff' | 'Suspended' | 'Archived';

const SUPPORT_ROLES: StaffRole[] = ['kitchen', 'rider'];

function matchesTab(s: StaffMember, tab: FilterTab): boolean {
    if (tab === 'Suspended') return s.systemAccess === 'disabled' && s.status !== 'archived';
    if (tab === 'Archived')  return s.status === 'archived';
    if (tab === 'All')       return s.status !== 'archived';
    if (tab === 'Super Admin')    return s.role === 'super_admin'    && s.status !== 'archived';
    if (tab === 'Branch Partner') return s.role === 'branch_partner' && s.status !== 'archived';
    if (tab === 'Branch Manager') return s.role === 'manager'        && s.status !== 'archived';
    if (tab === 'Call Center')    return s.role === 'call_center'    && s.status !== 'archived';
    if (tab === 'Support Staff')  return SUPPORT_ROLES.includes(s.role) && s.status !== 'archived';
    return false;
}

function tabCount(staff: StaffMember[], tab: FilterTab): number {
    return staff.filter(s => matchesTab(s, tab)).length;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function isNewStaffId(id: string): boolean {
    return id.startsWith('u');
}

export default function AdminStaffPage() {
    const { employees: apiStaff, isLoading, refetch } = useEmployees();
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
    const [editStaff, setEditStaff] = useState<StaffMember | null | 'new'>(null);
    const [deleteStaff, setDeleteStaff] = useState<StaffMember | null>(null);

    const TABS: FilterTab[] = ['All', 'Super Admin', 'Branch Partner', 'Branch Manager', 'Call Center', 'Support Staff', 'Suspended', 'Archived'];

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

    async function saveStaff(s: StaffMember) {
        const branchIds = s.branchIds ?? [];
        const isNew = isNewStaffId(s.id);
        try {
            if (isNew) {
                if (branchIds.length === 0) throw new Error('Select at least one branch.');
                await employeeService.createEmployee({
                    name: s.name,
                    email: s.email || null,
                    phone: s.phone,
                    branch_ids: branchIds.map((id) => Number(id)),
                    role: staffRoleToBackendRole(s.role),
                    hire_date: s.joinedAt || undefined,
                    // HR fields
                    ssnit_number: s.ssnit || undefined,
                    ghana_card_id: s.ghanaCard || undefined,
                    tin_number: s.tinNumber || undefined,
                    date_of_birth: s.dateOfBirth || undefined,
                    nationality: s.nationality || undefined,
                    emergency_contact_name: s.emergencyContact?.name || undefined,
                    emergency_contact_phone: s.emergencyContact?.phone || undefined,
                    emergency_contact_relationship: s.emergencyContact?.relationship || undefined,
                    // Individual permissions
                    permissions: mapPermissionsToBackend(s.permissions),
                });
            } else {
                await employeeService.updateEmployee(s.id, {
                    name: s.name,
                    email: s.email || null,
                    phone: s.phone,
                    ...(branchIds.length > 0 && { branch_ids: branchIds.map((id) => Number(id)) }),
                    role: staffRoleToBackendRole(s.role),
                    hire_date: s.joinedAt || undefined,
                    // HR fields
                    ssnit_number: s.ssnit || undefined,
                    ghana_card_id: s.ghanaCard || undefined,
                    tin_number: s.tinNumber || undefined,
                    date_of_birth: s.dateOfBirth || undefined,
                    nationality: s.nationality || undefined,
                    emergency_contact_name: s.emergencyContact?.name || undefined,
                    emergency_contact_phone: s.emergencyContact?.phone || undefined,
                    emergency_contact_relationship: s.emergencyContact?.relationship || undefined,
                    // Individual permissions
                    permissions: mapPermissionsToBackend(s.permissions),
                });
            }
            const result = await refetch();
            setStaff(Array.isArray(result.data) ? result.data : []);
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
        } catch (error) {
            console.error('Failed to delete employee:', error);
            toast.error('Failed to delete employee. Please try again.');
            setDeleteStaff(null);
        }
    }

    async function suspend(s: StaffMember) {
        try {
            await employeeService.updateEmployee(s.id, { status: 'suspended' });
            setStaff(prev => prev.map(x => x.id === s.id ? { 
                ...x, 
                status: 'inactive' as StaffStatus, 
                systemAccess: 'disabled' as SystemAccess 
            } : x));
            toast.success(`${s.name} has been suspended`);
        } catch (error) {
            console.error('Failed to suspend employee:', error);
            toast.error('Failed to suspend employee. Please try again.');
        }
    }

    async function reinstate(s: StaffMember) {
        try {
            await employeeService.updateEmployee(s.id, { status: 'active' });
            setStaff(prev => prev.map(x => x.id === s.id ? { 
                ...x, 
                status: 'active' as StaffStatus, 
                systemAccess: 'enabled' as SystemAccess 
            } : x));
            toast.success(`${s.name} has been reinstated`);
        } catch (error) {
            console.error('Failed to reinstate employee:', error);
            toast.error('Failed to reinstate employee. Please try again.');
        }
    }

    async function archive(s: StaffMember) {
        try {
            await employeeService.updateEmployee(s.id, { status: 'archived' });
            setStaff(prev => prev.map(x => x.id === s.id ? { 
                ...x, 
                status: 'archived' as StaffStatus, 
                systemAccess: 'disabled' as SystemAccess, 
                employmentStatus: 'resigned' as EmploymentStatus 
            } : x));
            toast.success(`${s.name} has been archived`);
        } catch (error) {
            console.error('Failed to archive employee:', error);
            toast.error('Failed to archive employee. Please try again.');
        }
    }

    async function forceLogout(s: StaffMember) {
        try {
            await employeeService.forceLogout(s.id);
            toast.success(`${s.name} has been logged out from all devices`);
        } catch (error) {
            console.error('Failed to force logout employee:', error);
            toast.error('Failed to force logout. Please try again.');
        }
    }

    async function requirePasswordReset(s: StaffMember) {
        try {
            await employeeService.requirePasswordReset(s.id);
            toast.success(`Password reset required for ${s.name}. Notification sent.`);
        } catch (error) {
            console.error('Failed to require password reset:', error);
            toast.error('Failed to require password reset. Please try again.');
        }
    }

    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-text-dark text-2xl font-bold font-body">Staff</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5">{filtered.length} accounts shown</p>
                </div>
                <button type="button" onClick={() => setEditStaff('new')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body hover:bg-primary-hover transition-colors cursor-pointer shrink-0">
                    <PlusIcon size={16} weight="bold" />
                    Add Staff Member
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

            {/* Staff list */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                {isLoading && staff.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <p className="text-neutral-gray text-sm font-body">Loading staff…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <UserCircleIcon size={32} weight="thin" className="text-neutral-gray/40 mx-auto mb-3" />
                        <p className="text-neutral-gray text-sm font-body">No staff found.</p>
                    </div>
                ) : (
                    filtered.map((member, i) => (
                        <div key={member.id}
                            className={`px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3 ${i < filtered.length - 1 ? 'border-b border-[#f0e8d8]' : ''} hover:bg-neutral-light/40 transition-colors`}>

                            {/* Avatar + info */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <AvatarCircle name={member.name} />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-text-dark text-sm font-semibold font-body">{member.name}</p>
                                        <RoleBadge role={member.role} />
                                        {member.systemAccess === 'disabled' && member.status !== 'archived' && (
                                            <span className="text-[10px] font-body bg-error/10 text-error px-2 py-0.5 rounded-full">No Access</span>
                                        )}
                                        {member.employmentStatus === 'on_leave' && (
                                            <span className="text-[10px] font-body bg-warning/10 text-warning px-2 py-0.5 rounded-full">On Leave</span>
                                        )}
                                        {member.employmentStatus === 'resigned' && member.status !== 'archived' && (
                                            <span className="text-[10px] font-body bg-error/10 text-error px-2 py-0.5 rounded-full">Resigned</span>
                                        )}
                                        {member.status === 'archived' && (
                                            <span className="text-[10px] font-body bg-neutral-light text-neutral-gray px-2 py-0.5 rounded-full">Archived</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                        <span className="text-neutral-gray text-[10px] font-body">{member.phone}</span>
                                        <span className="text-neutral-gray text-[10px] font-body">{member.email}</span>
                                        <span className="text-neutral-gray text-[10px] font-body flex items-center gap-1">
                                            <BuildingsIcon size={10} weight="fill" />
                                            {branchDisplay(member.branch)}
                                        </span>
                                        <span className="text-neutral-gray text-[10px] font-body flex items-center gap-1">
                                            <ClockIcon size={10} weight="fill" />
                                            {member.lastLogin}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                                {member.status !== 'archived' && (
                                    <>
                                        <ActionBtn icon={PencilSimpleIcon} label="Edit" onClick={() => setEditStaff(member)} color="text-primary" />
                                        <ActionBtn icon={LockSimpleIcon} label="Reset PW" onClick={() => requirePasswordReset(member)} color="text-neutral-gray" />
                                        <ActionBtn icon={SignOutIcon} label="Force Logout" onClick={() => forceLogout(member)} color="text-neutral-gray" />
                                        {member.systemAccess === 'enabled'
                                            ? <ActionBtn icon={ArchiveIcon} label="Suspend" onClick={() => suspend(member)} color="text-warning" />
                                            : <ActionBtn icon={ArrowCounterClockwiseIcon} label="Reinstate" onClick={() => reinstate(member)} color="text-secondary" />
                                        }
                                        {member.systemAccess === 'disabled' && (
                                            <ActionBtn icon={ArchiveIcon} label="Archive" onClick={() => archive(member)} color="text-neutral-gray" />
                                        )}
                                    </>
                                )}
                                {member.status === 'archived' && (
                                    <>
                                        <ActionBtn icon={ArrowCounterClockwiseIcon} label="Restore" onClick={() => reinstate(member)} color="text-secondary" />
                                        <ActionBtn icon={TrashIcon} label="Delete" onClick={() => setDeleteStaff(member)} color="text-error" />
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modals */}
            {editStaff !== null && (
                <StaffModal staff={editStaff === 'new' ? null : editStaff as StaffMember} onClose={() => setEditStaff(null)} onSave={saveStaff} />
            )}
            {deleteStaff && (
                <ConfirmDeleteModal staff={deleteStaff} onConfirm={() => deleteStaffFn(deleteStaff)} onCancel={() => setDeleteStaff(null)} />
            )}
        </div>
    );
}

function ActionBtn({ icon: Icon, label, onClick, color }: { icon: React.ElementType; label: string; onClick: () => void; color: string }) {
    return (
        <button type="button" onClick={onClick} title={label}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-light hover:bg-[#f0e8d8] text-xs font-medium font-body transition-colors cursor-pointer ${color}`}>
            <Icon size={12} weight="bold" />
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}
