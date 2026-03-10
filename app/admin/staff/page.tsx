'use client';

import { useState, useMemo } from 'react';
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
} from '@phosphor-icons/react';
import {
    type StaffMember,
    type StaffRole,
    type StaffStatus,
    MOCK_STAFF,
    roleDisplayName,
} from '@/lib/data/mockStaff';

// ─── Display helpers ──────────────────────────────────────────────────────────

const BRANCHES = ['Osu', 'East Legon', 'Spintex'];

const ROLE_STYLES: Record<StaffRole, string> = {
    admin:       'bg-primary/10 text-primary',
    manager:     'bg-secondary/10 text-secondary',
    sales:       'bg-info/10 text-info',
    kitchen:     'bg-warning/10 text-warning',
    rider:       'bg-secondary/15 text-secondary',
    call_center: 'bg-neutral-gray/10 text-neutral-gray',
};

function initials(name: string) {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
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

interface StaffFormState {
    name:      string;
    phone:     string;
    email:     string;
    role:      StaffRole;
    branch:    string | string[];
    status:    StaffStatus;
    pin:       string;
}

function blankForm(): StaffFormState {
    return { name: '', phone: '', email: '', role: 'sales', branch: 'Osu', status: 'active', pin: '' };
}

function memberToForm(s: StaffMember): StaffFormState {
    return { name: s.name, phone: s.phone, email: s.email, role: s.role, branch: s.branch, status: s.status, pin: s.pin };
}

function StaffModal({ staff, onClose, onSave }: { staff: StaffMember | null; onClose: () => void; onSave: (s: StaffMember) => void }) {
    const isNew = !staff;
    const [form, setForm] = useState<StaffFormState>(staff ? memberToForm(staff) : blankForm());
    const [forceReset, setForceReset] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const isPOS = form.role === 'sales';
    const isCallCenter = form.role === 'call_center';

    function validate() {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Name is required';
        if (!/^0[2-5][0-9]{8}$/.test(form.phone.replace(/\s/g, ''))) e.phone = 'Enter a valid Ghanaian phone number';
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address';
        if (isPOS && form.pin && !/^\d{4}$/.test(form.pin)) e.pin = 'PIN must be exactly 4 digits';
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    function handleSave() {
        if (!validate()) return;
        const updated: StaffMember = {
            ...(staff ?? {
                id:          `u${Date.now()}`,
                branchIds:   [],
                password:    'temp123',
                posAccess:   false,
                joinedAt:    new Date().toLocaleDateString('en-GH', { month: 'short', year: 'numeric' }),
                lastLogin:   'Never',
                ordersToday: 0,
            }),
            name:      form.name.trim(),
            phone:     form.phone.trim(),
            email:     form.email.trim(),
            role:      form.role,
            branch:    form.branch,
            status:    form.status,
            pin:       form.pin,
            posAccess: isPOS && !!form.pin,
        };
        onSave(updated);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/30 backdrop-blur-sm overflow-y-auto">
            <div className="bg-neutral-card rounded-2xl shadow-2xl w-full max-w-lg my-8">
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0e8d8]">
                    <h2 className="text-text-dark text-lg font-bold font-body">{isNew ? 'Add Staff Member' : `Edit — ${staff?.name}`}</h2>
                    <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-light cursor-pointer">
                        <XIcon size={16} className="text-neutral-gray" />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-5">
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
                                onChange={e => setForm(f => ({ ...f, role: e.target.value as StaffRole, pin: '' }))}
                                className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40"
                            >
                                {(['admin','manager','sales','kitchen','rider','call_center'] as StaffRole[]).map(r => (
                                    <option key={r} value={r}>{roleDisplayName(r)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">
                                {isCallCenter ? 'Branches' : 'Branch'}
                            </label>
                            {isCallCenter ? (
                                <div className="flex flex-col gap-1.5">
                                    {BRANCHES.map(b => {
                                        const arr = Array.isArray(form.branch) ? form.branch : [form.branch];
                                        const checked = arr.includes(b);
                                        return (
                                            <label key={b} className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={checked} onChange={e => {
                                                    const branches = Array.isArray(form.branch) ? form.branch : [form.branch];
                                                    setForm(f => ({ ...f, branch: e.target.checked ? [...branches, b] : branches.filter(x => x !== b) }));
                                                }} className="accent-primary" />
                                                <span className="text-text-dark text-sm font-body">{b}</span>
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
                                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            )}
                        </div>
                    </div>

                    {/* POS PIN — only for sales staff */}
                    {isPOS && (
                        <div>
                            <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">
                                POS PIN <span className="normal-case font-normal">(4 digits · leave blank to disable POS access)</span>
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                value={form.pin}
                                onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                                placeholder="e.g. 1234"
                                className={`w-full px-3 py-2.5 bg-neutral-light border rounded-xl text-text-dark text-sm font-body font-mono tracking-widest focus:outline-none ${errors.pin ? 'border-error/50 focus:border-error/70' : 'border-[#f0e8d8] focus:border-primary/40'}`}
                            />
                            {errors.pin && <p className="text-error text-[10px] font-body mt-1">{errors.pin}</p>}
                        </div>
                    )}

                    <div className="flex items-center justify-between p-3 bg-neutral-light rounded-xl">
                        <div>
                            <p className="text-text-dark text-sm font-semibold font-body">Account Status</p>
                            <p className="text-neutral-gray text-xs font-body">{form.status === 'active' ? 'Can log in and use portal' : 'Login blocked'}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, status: f.status === 'active' ? 'inactive' : 'active' }))}
                            className="cursor-pointer"
                        >
                            <span className={`text-xs font-bold font-body px-3 py-1.5 rounded-lg ${form.status === 'active' ? 'bg-secondary/15 text-secondary' : 'bg-error/10 text-error'}`}>
                                {form.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                        </button>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-warning/5 border border-warning/20 rounded-xl">
                        <input type="checkbox" checked={forceReset} onChange={e => setForceReset(e.target.checked)} className="accent-warning" />
                        <div>
                            <p className="text-text-dark text-sm font-semibold font-body">Force password reset on next login</p>
                            <p className="text-neutral-gray text-xs font-body">Staff must set a new password before accessing the portal</p>
                        </div>
                    </label>
                </div>

                <div className="flex gap-3 px-6 py-4 border-t border-[#f0e8d8]">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-neutral-light text-text-dark rounded-xl text-sm font-medium font-body cursor-pointer">Cancel</button>
                    <button type="button" onClick={handleSave} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body cursor-pointer hover:bg-primary-hover transition-colors">
                        {isNew ? 'Create Account' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function FieldInput({ label, value, onChange, placeholder, error, span }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; error?: string; span?: number }) {
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

type FilterTab = 'All' | 'Admin' | 'Branch Manager' | 'Branch Staff' | 'Call Center' | 'Inactive' | 'Archived';

const BRANCH_STAFF_ROLES: StaffRole[] = ['sales', 'kitchen', 'rider'];

function matchesTab(s: StaffMember, tab: FilterTab): boolean {
    if (tab === 'Inactive')      return s.status === 'inactive';
    if (tab === 'Archived')      return s.status === 'archived';
    if (tab === 'All')           return s.status !== 'archived';
    if (tab === 'Admin')         return s.role === 'admin'       && s.status !== 'archived';
    if (tab === 'Branch Manager')return s.role === 'manager'     && s.status !== 'archived';
    if (tab === 'Branch Staff')  return BRANCH_STAFF_ROLES.includes(s.role) && s.status !== 'archived';
    if (tab === 'Call Center')   return s.role === 'call_center' && s.status !== 'archived';
    return false;
}

function tabCount(staff: StaffMember[], tab: FilterTab): number {
    return staff.filter(s => matchesTab(s, tab)).length;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminStaffPage() {
    const [staff, setStaff] = useState<StaffMember[]>(MOCK_STAFF);
    const [tab, setTab] = useState<FilterTab>('All');
    const [search, setSearch] = useState('');
    const [editStaff, setEditStaff] = useState<StaffMember | null | 'new'>(null);
    const [deleteStaff, setDeleteStaff] = useState<StaffMember | null>(null);

    const TABS: FilterTab[] = ['All', 'Admin', 'Branch Manager', 'Branch Staff', 'Call Center', 'Inactive', 'Archived'];

    const filtered = useMemo(() => {
        let list = staff.filter(s => matchesTab(s, tab));
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(s => s.name.toLowerCase().includes(q) || s.phone.includes(q) || s.email.toLowerCase().includes(q));
        }
        return list;
    }, [staff, tab, search]);

    function saveStaff(s: StaffMember) {
        setStaff(prev => {
            const idx = prev.findIndex(x => x.id === s.id);
            if (idx >= 0) { const n = [...prev]; n[idx] = s; return n; }
            return [...prev, s];
        });
        setEditStaff(null);
    }

    function deleteStaffFn(s: StaffMember) {
        setStaff(prev => prev.filter(x => x.id !== s.id));
        setDeleteStaff(null);
    }

    function suspend(s: StaffMember)   { setStaff(prev => prev.map(x => x.id === s.id ? { ...x, status: 'inactive' } : x)); }
    function reinstate(s: StaffMember) { setStaff(prev => prev.map(x => x.id === s.id ? { ...x, status: 'active'   } : x)); }
    function archive(s: StaffMember)   { setStaff(prev => prev.map(x => x.id === s.id ? { ...x, status: 'archived' } : x)); }

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
                <div className="relative flex-1 min-w-[180px]">
                    <MagnifyingGlassIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, email…"
                        className="w-full pl-9 pr-3 py-2.5 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40" />
                </div>
            </div>

            {/* Staff list */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                {filtered.length === 0 ? (
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
                                        {member.posAccess && (
                                            <span className="text-[10px] font-body bg-primary/8 text-primary/70 px-2 py-0.5 rounded-full">POS</span>
                                        )}
                                        {member.status === 'inactive' && <span className="text-[10px] font-body bg-error/10 text-error px-2 py-0.5 rounded-full">Suspended</span>}
                                        {member.status === 'archived' && <span className="text-[10px] font-body bg-neutral-light text-neutral-gray px-2 py-0.5 rounded-full">Archived</span>}
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
                                        <ActionBtn icon={LockSimpleIcon} label="Reset PW" onClick={() => {}} color="text-neutral-gray" />
                                        <ActionBtn icon={SignOutIcon} label="Force Logout" onClick={() => {}} color="text-neutral-gray" />
                                        {member.status === 'active'
                                            ? <ActionBtn icon={ArchiveIcon} label="Suspend" onClick={() => suspend(member)} color="text-warning" />
                                            : <ActionBtn icon={ArrowCounterClockwiseIcon} label="Reinstate" onClick={() => reinstate(member)} color="text-secondary" />
                                        }
                                        {member.status === 'inactive' && (
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
