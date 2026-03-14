'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    PlusIcon,
    PencilSimpleIcon,
    TrashIcon,
    ChartBarIcon,
    MapPinIcon,
    PhoneIcon,
    UserCircleIcon,
    ToggleLeftIcon,
    ToggleRightIcon,
    XIcon,
    WarningCircleIcon,
    BuildingsIcon,
    CheckCircleIcon,
} from '@phosphor-icons/react';

// ─── Types ────────────────────────────────────────────────────────────────────

type BranchStatus = 'active' | 'inactive';
type BranchOpenStatus = 'open' | 'closed' | 'busy';

interface Branch {
    id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    status: BranchStatus;
    openStatus: BranchOpenStatus;
    manager: string;
    ordersToday: number;
    revenueToday: number;
    deliveryRadius: number;
    baseDeliveryFee: number;
    perKmFee: number;
    minOrderValue: number;
    orderTypes: { delivery: boolean; pickup: boolean; dineIn: boolean };
    payments: { momo: boolean; cashOnDelivery: boolean; cashAtPickup: boolean };
    hours: Record<string, { open: boolean; from: string; to: string }>;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function defaultHours(): Branch['hours'] {
    return Object.fromEntries(DAYS.map(d => [d, { open: true, from: '08:00', to: '20:00' }]));
}

const INITIAL_BRANCHES: Branch[] = [
    {
        id: 'osu', name: 'Osu', address: '14 Ring Road, Osu, Accra', phone: '0302123456', email: 'osu@cedibites.com',
        status: 'active', openStatus: 'open', manager: 'Ama Boateng', ordersToday: 38, revenueToday: 3210,
        deliveryRadius: 5, baseDeliveryFee: 15, perKmFee: 3, minOrderValue: 50,
        orderTypes: { delivery: true, pickup: true, dineIn: false },
        payments: { momo: true, cashOnDelivery: true, cashAtPickup: true },
        hours: defaultHours(),
    },
    {
        id: 'east-legon', name: 'East Legon', address: 'East Legon Hills, Accra', phone: '0302789456', email: 'eastlegon@cedibites.com',
        status: 'active', openStatus: 'open', manager: 'Kwame Asante', ordersToday: 42, revenueToday: 3680,
        deliveryRadius: 6, baseDeliveryFee: 20, perKmFee: 4, minOrderValue: 60,
        orderTypes: { delivery: true, pickup: true, dineIn: true },
        payments: { momo: true, cashOnDelivery: true, cashAtPickup: false },
        hours: defaultHours(),
    },
    {
        id: 'spintex', name: 'Spintex', address: 'Spintex Road, Accra', phone: '0302654321', email: 'spintex@cedibites.com',
        status: 'active', openStatus: 'busy', manager: 'Abena Mensah', ordersToday: 17, revenueToday: 1522,
        deliveryRadius: 4, baseDeliveryFee: 12, perKmFee: 2.5, minOrderValue: 45,
        orderTypes: { delivery: true, pickup: false, dineIn: false },
        payments: { momo: true, cashOnDelivery: false, cashAtPickup: false },
        hours: defaultHours(),
    },
];

const ALL_MANAGERS = ['Ama Boateng', 'Kwame Asante', 'Abena Mensah', 'Kofi Acheampong', 'Efua Osei'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGHS(v: number) { return `₵${v.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

// ─── Branch status dot ────────────────────────────────────────────────────────

function StatusPill({ status }: { status: BranchOpenStatus }) {
    const cfg = {
        open:   { color: 'bg-secondary/10 text-secondary border-secondary/20', dot: 'bg-secondary', label: 'Open'   },
        closed: { color: 'bg-error/10 text-error border-error/20',             dot: 'bg-error',     label: 'Closed' },
        busy:   { color: 'bg-warning/10 text-warning border-warning/20',       dot: 'bg-warning',   label: 'Busy'   },
    }[status];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium font-body border ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

// ─── Confirm delete modal ─────────────────────────────────────────────────────

function ConfirmDeleteModal({
    branch,
    onConfirm,
    onCancel,
}: {
    branch: Branch;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const [input, setInput] = useState('');
    const confirmed = input === branch.name;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-neutral-card rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
                <div className="h-1.5 bg-error" />
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                        <WarningCircleIcon size={20} weight="fill" className="text-error" />
                        <h3 className="text-text-dark text-base font-bold font-body">Delete branch permanently?</h3>
                    </div>
                    <p className="text-neutral-gray text-sm font-body mb-4">
                        This will permanently delete <strong className="text-text-dark">{branch.name}</strong>. Historical orders will be retained under a &quot;[Deleted Branch]&quot; label. This cannot be undone.
                    </p>
                    <p className="text-xs font-body text-neutral-gray mb-2">Type <strong>{branch.name}</strong> to confirm:</p>
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-error/50 mb-4"
                        placeholder={branch.name}
                    />
                    <div className="flex gap-3">
                        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 bg-neutral-light text-text-dark rounded-xl text-sm font-medium font-body hover:bg-[#f0e8d8] transition-colors cursor-pointer">Cancel</button>
                        <button type="button" onClick={onConfirm} disabled={!confirmed} className="flex-1 px-4 py-2.5 bg-error text-white rounded-xl text-sm font-medium font-body disabled:opacity-40 hover:bg-error/90 transition-colors cursor-pointer disabled:cursor-not-allowed">
                            Delete permanently
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Branch modal ─────────────────────────────────────────────────────────────

function BranchModal({
    branch,
    onClose,
    onSave,
}: {
    branch: Branch | null;
    onClose: () => void;
    onSave: (b: Branch) => void;
}) {
    const isNew = !branch;
    const [form, setForm] = useState<Branch>(branch ?? {
        id: `branch-${Date.now()}`,
        name: '', address: '', phone: '', email: '',
        status: 'active', openStatus: 'open', manager: ALL_MANAGERS[0],
        ordersToday: 0, revenueToday: 0,
        deliveryRadius: 5, baseDeliveryFee: 15, perKmFee: 3, minOrderValue: 50,
        orderTypes: { delivery: true, pickup: true, dineIn: false },
        payments: { momo: true, cashOnDelivery: true, cashAtPickup: true },
        hours: defaultHours(),
    });

    function field(key: keyof Branch, value: Branch[typeof key]) {
        setForm(f => ({ ...f, [key]: value }));
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/30 backdrop-blur-sm overflow-y-auto">
            <div className="bg-neutral-card rounded-2xl shadow-2xl w-full max-w-2xl my-8">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0e8d8]">
                    <h2 className="text-text-dark text-lg font-bold font-body">{isNew ? 'Add New Branch' : `Edit — ${branch?.name}`}</h2>
                    <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-light cursor-pointer">
                        <XIcon size={16} className="text-neutral-gray" />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-6">

                    {/* Branch details */}
                    <Section title="Branch Details">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Branch Name" value={form.name} onChange={v => field('name', v)} placeholder="e.g. Accra Mall" />
                            <Field label="Phone Number" value={form.phone} onChange={v => field('phone', v)} placeholder="0302..." />
                            <Field label="Address" value={form.address} onChange={v => field('address', v)} placeholder="Street, Area, Accra" span={2} />
                            <Field label="Email" value={form.email} onChange={v => field('email', v)} placeholder="branch@cedibites.com" />
                            <div>
                                <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">Assigned Manager</label>
                                <select
                                    value={form.manager}
                                    onChange={e => field('manager', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40"
                                >
                                    {ALL_MANAGERS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                    </Section>

                    {/* Operating hours */}
                    <Section title="Operating Hours">
                        <div className="flex flex-col gap-2">
                            {DAYS.map(day => (
                                <div key={day} className="flex items-center gap-3">
                                    <span className="text-text-dark text-xs font-semibold font-body w-8">{day}</span>
                                    <Toggle
                                        checked={form.hours[day].open}
                                        onChange={v => setForm(f => ({ ...f, hours: { ...f.hours, [day]: { ...f.hours[day], open: v } } }))}
                                    />
                                    {form.hours[day].open ? (
                                        <>
                                            <input type="time" value={form.hours[day].from}
                                                onChange={e => setForm(f => ({ ...f, hours: { ...f.hours, [day]: { ...f.hours[day], from: e.target.value } } }))}
                                                className="px-2.5 py-1.5 bg-neutral-light border border-[#f0e8d8] rounded-lg text-text-dark text-xs font-body focus:outline-none focus:border-primary/40" />
                                            <span className="text-neutral-gray text-xs font-body">to</span>
                                            <input type="time" value={form.hours[day].to}
                                                onChange={e => setForm(f => ({ ...f, hours: { ...f.hours, [day]: { ...f.hours[day], to: e.target.value } } }))}
                                                className="px-2.5 py-1.5 bg-neutral-light border border-[#f0e8d8] rounded-lg text-text-dark text-xs font-body focus:outline-none focus:border-primary/40" />
                                        </>
                                    ) : (
                                        <span className="text-neutral-gray text-xs font-body">Closed</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Delivery settings */}
                    <Section title="Delivery Settings">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <NumberField label="Delivery Radius (km)" value={form.deliveryRadius} onChange={v => field('deliveryRadius', v)} />
                            <NumberField label="Base Fee (GHS)" value={form.baseDeliveryFee} onChange={v => field('baseDeliveryFee', v)} />
                            <NumberField label="Per-km Fee (GHS)" value={form.perKmFee} onChange={v => field('perKmFee', v)} />
                            <NumberField label="Min. Order (GHS)" value={form.minOrderValue} onChange={v => field('minOrderValue', v)} />
                        </div>
                    </Section>

                    {/* Order types */}
                    <Section title="Order Types">
                        <div className="flex gap-4">
                            {(['delivery', 'pickup', 'dineIn'] as const).map(t => (
                                <label key={t} className="flex items-center gap-2 cursor-pointer">
                                    <Toggle checked={form.orderTypes[t]} onChange={v => setForm(f => ({ ...f, orderTypes: { ...f.orderTypes, [t]: v } }))} />
                                    <span className="text-text-dark text-sm font-body capitalize">{t === 'dineIn' ? 'Dine-in' : t.charAt(0).toUpperCase() + t.slice(1)}</span>
                                </label>
                            ))}
                        </div>
                    </Section>

                    {/* Payment methods */}
                    <Section title="Payment Methods">
                        <div className="flex gap-4 flex-wrap">
                            {([['momo', 'Mobile Money'], ['cashOnDelivery', 'Cash on Delivery'], ['cashAtPickup', 'Cash at Pickup']] as const).map(([key, label]) => (
                                <label key={key} className="flex items-center gap-2 cursor-pointer">
                                    <Toggle checked={form.payments[key]} onChange={v => setForm(f => ({ ...f, payments: { ...f.payments, [key]: v } }))} />
                                    <span className="text-text-dark text-sm font-body">{label}</span>
                                </label>
                            ))}
                        </div>
                    </Section>

                    {/* Status */}
                    <Section title="Branch Status">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <Toggle checked={form.status === 'active'} onChange={v => field('status', v ? 'active' : 'inactive')} />
                            <div>
                                <p className="text-text-dark text-sm font-semibold font-body">{form.status === 'active' ? 'Active' : 'Inactive'}</p>
                                <p className="text-neutral-gray text-xs font-body">{form.status === 'active' ? 'Branch is visible to customers' : 'Branch hidden from customers'}</p>
                            </div>
                        </label>
                    </Section>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-[#f0e8d8]">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-neutral-light text-text-dark rounded-xl text-sm font-medium font-body hover:bg-[#f0e8d8] transition-colors cursor-pointer">
                        Cancel
                    </button>
                    <button type="button" onClick={() => onSave(form)} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body hover:bg-primary-hover transition-colors cursor-pointer">
                        {isNew ? 'Create Branch' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-3">{title}</p>
            {children}
        </div>
    );
}

function Field({ label, value, onChange, placeholder, span }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; span?: number }) {
    return (
        <div className={span === 2 ? 'col-span-2' : ''}>
            <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">{label}</label>
            <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40" />
        </div>
    );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
    return (
        <div>
            <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">{label}</label>
            <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40" />
        </div>
    );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button type="button" onClick={() => onChange(!checked)} className="cursor-pointer">
            {checked
                ? <ToggleRightIcon size={24} weight="fill" className="text-primary" />
                : <ToggleLeftIcon size={24} weight="fill" className="text-neutral-gray/40" />
            }
        </button>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminBranchesPage() {
    const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
    const [editBranch, setEditBranch] = useState<Branch | null | 'new'>(null);
    const [deleteBranch, setDeleteBranch] = useState<Branch | null>(null);
    const [deactivateConfirm, setDeactivateConfirm] = useState<Branch | null>(null);

    function saveBranch(b: Branch) {
        setBranches(prev => {
            const idx = prev.findIndex(x => x.id === b.id);
            if (idx >= 0) { const n = [...prev]; n[idx] = b; return n; }
            return [...prev, b];
        });
        setEditBranch(null);
    }

    function deleteBranchFn(b: Branch) {
        setBranches(prev => prev.filter(x => x.id !== b.id));
        setDeleteBranch(null);
    }

    function toggleOpen(b: Branch) {
        setBranches(prev => prev.map(x => x.id === b.id ? { ...x, openStatus: x.openStatus === 'open' ? 'closed' : 'open' } : x));
    }

    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-7">
                <div>
                    <h1 className="text-text-dark text-2xl font-bold font-body">Branches</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5">{branches.length} branches configured</p>
                </div>
                <button
                    type="button"
                    onClick={() => setEditBranch('new')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body hover:bg-primary-hover transition-colors cursor-pointer shrink-0"
                >
                    <PlusIcon size={16} weight="bold" />
                    Add Branch
                </button>
            </div>

            {/* Branch cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {branches.map(branch => (
                    <div key={branch.id} className={`bg-neutral-card border rounded-2xl overflow-hidden transition-all ${branch.status === 'inactive' ? 'border-[#f0e8d8] opacity-70' : 'border-[#f0e8d8]'}`}>

                        {/* Card header */}
                        <div className="px-5 py-4 flex items-start justify-between gap-3 border-b border-[#f0e8d8]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                    <BuildingsIcon size={20} weight="fill" className="text-primary" />
                                </div>
                                <div>
                                    <p className="text-text-dark text-base font-bold font-body">{branch.name}</p>
                                    {branch.status === 'inactive' && (
                                        <span className="text-xs font-body text-neutral-gray bg-neutral-light px-2 py-0.5 rounded-full">Inactive</span>
                                    )}
                                </div>
                            </div>
                            <StatusPill status={branch.openStatus} />
                        </div>

                        {/* Card body */}
                        <div className="px-5 py-4 flex flex-col gap-2.5">
                            <div className="flex items-start gap-2">
                                <MapPinIcon size={13} weight="fill" className="text-neutral-gray mt-0.5 shrink-0" />
                                <span className="text-neutral-gray text-xs font-body">{branch.address}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <PhoneIcon size={13} weight="fill" className="text-neutral-gray shrink-0" />
                                <span className="text-neutral-gray text-xs font-body">{branch.phone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <UserCircleIcon size={13} weight="fill" className="text-neutral-gray shrink-0" />
                                <span className="text-neutral-gray text-xs font-body">{branch.manager}</span>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <div className="bg-neutral-light rounded-xl px-3 py-2">
                                    <p className="text-neutral-gray text-[10px] font-body uppercase tracking-wider">Revenue Today</p>
                                    <p className="text-primary text-sm font-bold font-body">{formatGHS(branch.revenueToday)}</p>
                                </div>
                                <div className="bg-neutral-light rounded-xl px-3 py-2">
                                    <p className="text-neutral-gray text-[10px] font-body uppercase tracking-wider">Orders Today</p>
                                    <p className="text-text-dark text-sm font-bold font-body">{branch.ordersToday}</p>
                                </div>
                            </div>
                        </div>

                        {/* Quick actions */}
                        <div className="px-5 py-3 border-t border-[#f0e8d8] flex gap-2 flex-wrap">
                            <button type="button" onClick={() => setEditBranch(branch)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-neutral-light rounded-xl text-text-dark text-xs font-medium font-body hover:bg-[#f0e8d8] transition-colors cursor-pointer">
                                <PencilSimpleIcon size={13} weight="bold" className="text-primary" />
                                Edit
                            </button>
                            <button type="button" onClick={() => toggleOpen(branch)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-neutral-light rounded-xl text-text-dark text-xs font-medium font-body hover:bg-[#f0e8d8] transition-colors cursor-pointer">
                                {branch.openStatus === 'open'
                                    ? <ToggleRightIcon size={13} weight="fill" className="text-secondary" />
                                    : <ToggleLeftIcon size={13} weight="fill" className="text-neutral-gray" />
                                }
                                {branch.openStatus === 'open' ? 'Mark Closed' : 'Mark Open'}
                            </button>
                            <Link href={`/admin/analytics?branch=${branch.id}`}
                                className="flex items-center gap-1.5 px-3 py-2 bg-neutral-light rounded-xl text-text-dark text-xs font-medium font-body hover:bg-[#f0e8d8] transition-colors">
                                <ChartBarIcon size={13} weight="bold" className="text-primary" />
                                Analytics
                            </Link>
                            {branch.status === 'active' ? (
                                <button type="button" onClick={() => setDeactivateConfirm(branch)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-warning/10 rounded-xl text-warning text-xs font-medium font-body hover:bg-warning/20 transition-colors cursor-pointer">
                                    <ToggleLeftIcon size={13} weight="bold" />
                                    Deactivate
                                </button>
                            ) : (
                                <>
                                    <button type="button" onClick={() => setBranches(prev => prev.map(b => b.id === branch.id ? { ...b, status: 'active' } : b))}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-secondary/10 rounded-xl text-secondary text-xs font-medium font-body hover:bg-secondary/20 transition-colors cursor-pointer">
                                        <CheckCircleIcon size={13} weight="bold" />
                                        Reactivate
                                    </button>
                                    <button type="button" onClick={() => setDeleteBranch(branch)}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-error/10 rounded-xl text-error text-xs font-medium font-body hover:bg-error/20 transition-colors cursor-pointer">
                                        <TrashIcon size={13} weight="bold" />
                                        Delete
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modals */}
            {editBranch !== null && (
                <BranchModal
                    branch={editBranch === 'new' ? null : editBranch as Branch}
                    onClose={() => setEditBranch(null)}
                    onSave={saveBranch}
                />
            )}

            {deleteBranch && (
                <ConfirmDeleteModal
                    branch={deleteBranch}
                    onConfirm={() => deleteBranchFn(deleteBranch)}
                    onCancel={() => setDeleteBranch(null)}
                />
            )}

            {deactivateConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
                    <div className="bg-neutral-card rounded-2xl shadow-2xl max-w-sm w-full p-6">
                        <h3 className="text-text-dark text-base font-bold font-body mb-2">Deactivate {deactivateConfirm.name}?</h3>
                        <p className="text-neutral-gray text-sm font-body mb-6">
                            This branch will be hidden from customers and staff will be unable to log in. All active orders will remain unaffected.
                        </p>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setDeactivateConfirm(null)} className="flex-1 px-4 py-2.5 bg-neutral-light text-text-dark rounded-xl text-sm font-medium font-body cursor-pointer">Cancel</button>
                            <button type="button" onClick={() => {
                                setBranches(prev => prev.map(b => b.id === deactivateConfirm.id ? { ...b, status: 'inactive' } : b));
                                setDeactivateConfirm(null);
                            }} className="flex-1 px-4 py-2.5 bg-warning text-white rounded-xl text-sm font-medium font-body cursor-pointer">
                                Deactivate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
