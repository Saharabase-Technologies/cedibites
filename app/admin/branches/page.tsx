'use client';

import { useState, useMemo } from 'react';
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
import { useBranches } from '@/lib/api/hooks/useBranches';
import { useEmployees } from '@/lib/api/hooks/useEmployees';
import { branchService } from '@/lib/api/services/branch.service';
import { mapApiBranchToDisplay } from '@/lib/api/adapters/branch.adapter';
import type { DisplayBranch } from '@/lib/api/adapters/branch.adapter';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/utils/toast';
import { isValidGhanaPhone, normalizeGhanaPhone } from '@/app/lib/phone';

// ─── Types ────────────────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function defaultHours(): DisplayBranch['hours'] {
    return Object.fromEntries(DAYS.map((d) => [d, { open: true, from: '08:00', to: '20:00' }]));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGHS(v: number) { return `₵${v.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

// ─── Branch status dot ────────────────────────────────────────────────────────

function StatusPill({ status }: { status: DisplayBranch['openStatus'] }) {
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
    branch: DisplayBranch;
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
    employees,
}: {
    branch: DisplayBranch | null;
    onClose: () => void;
    onSave: (b: DisplayBranch) => void;
    employees: Array<{ id: string; name: string }>;
}) {
    const isNew = !branch;
    const getEmployeeNameById = (id: string | null): string => {
        if (!id) {
            return '—';
        }

        return employees.find((employee) => employee.id === id)?.name ?? '—';
    };

    const [form, setForm] = useState<DisplayBranch>(
        branch ?? {
            id: `branch-${Date.now()}`,
            name: '',
            address: '',
            phone: '',
            email: '',
            status: 'active',
            openStatus: 'open',
            managerId: null,
            manager: '—',
            ordersToday: 0,
            revenueToday: 0,
            deliveryRadius: 5,
            baseDeliveryFee: 15,
            perKmFee: 3,
            minOrderValue: 50,
            orderTypes: { delivery: true, pickup: true, dineIn: false },
            payments: { momo: true, cashOnDelivery: true, cashAtPickup: true },
            hours: defaultHours(),
        }
    );
    const [errors, setErrors] = useState<Record<string, string>>({});

    function field(key: keyof DisplayBranch, value: DisplayBranch[typeof key]) {
        setForm(f => ({ ...f, [key]: value }));
        // Clear error when field is updated
        if (errors[key]) {
            setErrors(e => ({ ...e, [key]: '' }));
        }
    }

    function validateForm(): boolean {
        const newErrors: Record<string, string> = {};

        // Required fields
        if (!form.name.trim()) newErrors.name = 'Branch name is required';
        if (!form.address.trim()) newErrors.address = 'Address is required';
        if (!form.phone.trim()) newErrors.phone = 'Phone number is required';
        
        // Email validation (if provided)
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            newErrors.email = 'Invalid email format';
        }

        // Phone validation (basic Ghana format)
        if (form.phone && !isValidGhanaPhone(form.phone)) {
            newErrors.phone = 'Invalid phone format (e.g., 0241234567 or +233241234567)';
        }

        // Numeric validations
        if (form.deliveryRadius <= 0) newErrors.deliveryRadius = 'Must be greater than 0';
        if (form.baseDeliveryFee < 0) newErrors.baseDeliveryFee = 'Cannot be negative';
        if (form.perKmFee < 0) newErrors.perKmFee = 'Cannot be negative';
        if (form.minOrderValue < 0) newErrors.minOrderValue = 'Cannot be negative';

        // At least one order type must be enabled
        if (!form.orderTypes.delivery && !form.orderTypes.pickup && !form.orderTypes.dineIn) {
            newErrors.orderTypes = 'At least one order type must be enabled';
        }

        // At least one payment method must be enabled
        if (!form.payments.momo && !form.payments.cashOnDelivery && !form.payments.cashAtPickup) {
            newErrors.payments = 'At least one payment method must be enabled';
        }

        // At least one day must be open
        const hasOpenDay = Object.values(form.hours).some(h => h.open);
        if (!hasOpenDay) {
            newErrors.hours = 'Branch must be open at least one day';
        }

        // Validate operating hours
        Object.entries(form.hours).forEach(([day, hours]) => {
            if (hours.open && hours.from && hours.to) {
                if (hours.from >= hours.to) {
                    newErrors[`hours_${day}`] = `${day}: Opening time must be before closing time`;
                }
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    function handleSave() {
        if (validateForm()) {
            onSave({
                ...form,
                phone: form.phone ? normalizeGhanaPhone(form.phone) : form.phone,
            });
        }
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
                            <Field label="Branch Name" value={form.name} onChange={v => field('name', v)} placeholder="e.g. Accra Mall" error={errors.name} />
                            <Field label="Phone Number" value={form.phone} onChange={v => field('phone', v)} placeholder="0302..." error={errors.phone} />
                            <Field label="Address" value={form.address} onChange={v => field('address', v)} placeholder="Street, Area, Accra" span={2} error={errors.address} />
                            <Field label="Email" value={form.email} onChange={v => field('email', v)} placeholder="branch@cedibites.com" error={errors.email} />
                            <div>
                                <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">Assigned Manager</label>
                                <select
                                    value={form.managerId ?? ''}
                                    onChange={e => {
                                        const managerId = e.target.value || null;
                                        setForm((current) => ({
                                            ...current,
                                            managerId,
                                            manager: getEmployeeNameById(managerId),
                                        }));
                                    }}
                                    className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40"
                                >
                                    <option value="">No manager</option>
                                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </Section>

                    {/* Operating hours */}
                    <Section title="Operating Hours">
                        {errors.hours && <p className="text-error text-xs font-body mb-2">{errors.hours}</p>}
                        <div className="flex flex-col gap-2">
                            {DAYS.map(day => (
                                <div key={day}>
                                    <div className="flex items-center gap-3">
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
                                    {errors[`hours_${day}`] && <p className="text-error text-xs font-body mt-1 ml-12">{errors[`hours_${day}`]}</p>}
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Delivery settings */}
                    <Section title="Delivery Settings">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <NumberField label="Delivery Radius (km)" value={form.deliveryRadius} onChange={v => field('deliveryRadius', v)} error={errors.deliveryRadius} />
                            <NumberField label="Base Fee (GHS)" value={form.baseDeliveryFee} onChange={v => field('baseDeliveryFee', v)} error={errors.baseDeliveryFee} />
                            <NumberField label="Per-km Fee (GHS)" value={form.perKmFee} onChange={v => field('perKmFee', v)} error={errors.perKmFee} />
                            <NumberField label="Min. Order (GHS)" value={form.minOrderValue} onChange={v => field('minOrderValue', v)} error={errors.minOrderValue} />
                        </div>
                    </Section>

                    {/* Order types */}
                    <Section title="Order Types">
                        {errors.orderTypes && <p className="text-error text-xs font-body mb-2">{errors.orderTypes}</p>}
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
                        {errors.payments && <p className="text-error text-xs font-body mb-2">{errors.payments}</p>}
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
                    <button type="button" onClick={handleSave} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body hover:bg-primary-hover transition-colors cursor-pointer">
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

function Field({ label, value, onChange, placeholder, span, error }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; span?: number; error?: string }) {
    return (
        <div className={span === 2 ? 'col-span-2' : ''}>
            <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">{label}</label>
            <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className={`w-full px-3 py-2.5 bg-neutral-light border rounded-xl text-text-dark text-sm font-body focus:outline-none ${error ? 'border-error focus:border-error' : 'border-[#f0e8d8] focus:border-primary/40'}`} />
            {error && <p className="text-error text-xs font-body mt-1">{error}</p>}
        </div>
    );
}

function NumberField({ label, value, onChange, error }: { label: string; value: number; onChange: (v: number) => void; error?: string }) {
    return (
        <div>
            <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">{label}</label>
            <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
                className={`w-full px-3 py-2.5 bg-neutral-light border rounded-xl text-text-dark text-sm font-body focus:outline-none ${error ? 'border-error focus:border-error' : 'border-[#f0e8d8] focus:border-primary/40'}`} />
            {error && <p className="text-error text-xs font-body mt-1">{error}</p>}
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
    const queryClient = useQueryClient();
    const { branches: apiBranches, isLoading, refetch } = useBranches();
    const { employees, isLoading: isLoadingEmployees } = useEmployees({ status: 'active' });
    const [editBranch, setEditBranch] = useState<DisplayBranch | null | 'new'>(null);
    const [deleteBranch, setDeleteBranch] = useState<DisplayBranch | null>(null);
    const [deactivateConfirm, setDeactivateConfirm] = useState<DisplayBranch | null>(null);
    const [localOpenStatus, setLocalOpenStatus] = useState<Record<string, DisplayBranch['openStatus']>>({});
    const [localStatus, setLocalStatus] = useState<Record<string, DisplayBranch['status']>>({});

    const branches = useMemo(() => {
        return apiBranches.map((api: any) => {
            const display = mapApiBranchToDisplay(api);
            return {
                ...display,
                openStatus: localOpenStatus[display.id] ?? display.openStatus,
                status: localStatus[display.id] ?? display.status,
            };
        });
    }, [apiBranches, localOpenStatus, localStatus]);

    // Map employees to simple format for dropdown
    const employeeOptions = useMemo(() => {
        return employees.map(emp => ({ id: emp.id, name: emp.name }));
    }, [employees]);

    async function saveBranch(b: DisplayBranch) {
        try {
            const managerId = b.managerId;

            // Map DisplayBranch to normalized backend structure
            const payload: any = {
                name: b.name,
                area: b.name, // Using name as area for now
                address: b.address,
                phone: b.phone,
                email: b.email,
                is_active: b.status === 'active',
                // Default coordinates (Accra, Ghana) - should be updated with actual geocoding
                latitude: 5.6037,
                longitude: -0.1870,
                
                // Include manager_id if a manager is selected
                ...(managerId !== null && managerId !== '' && { manager_id: Number(managerId) }),
                
                // Map operating hours: { Mon: {...}, Tue: {...} } → { monday: {...}, tuesday: {...} }
                operating_hours: mapOperatingHours(b.hours),
                
                // Map delivery settings
                delivery_settings: {
                    base_delivery_fee: b.baseDeliveryFee,
                    per_km_fee: b.perKmFee,
                    delivery_radius_km: b.deliveryRadius,
                    min_order_value: b.minOrderValue,
                    estimated_delivery_time: `${Math.round(b.deliveryRadius * 5)}-${Math.round(b.deliveryRadius * 7)} mins`,
                },
                
                // Map order types: { delivery: true, pickup: false } → { delivery: { is_enabled: true }, pickup: { is_enabled: false } }
                order_types: {
                    delivery: { is_enabled: b.orderTypes.delivery },
                    pickup: { is_enabled: b.orderTypes.pickup },
                    dine_in: { is_enabled: b.orderTypes.dineIn },
                },
                
                // Map payment methods: { momo: true, cashOnDelivery: false } → { momo: { is_enabled: true }, cash_on_delivery: { is_enabled: false } }
                payment_methods: {
                    momo: { is_enabled: b.payments.momo },
                    cash_on_delivery: { is_enabled: b.payments.cashOnDelivery },
                    cash_at_pickup: { is_enabled: b.payments.cashAtPickup },
                },
            };

            if (b.id.startsWith('branch-')) {
                await branchService.createBranch(payload);
                toast.success(`${b.name} has been created successfully`);
            } else {
                await branchService.updateBranch(Number(b.id), payload);
                toast.success(`${b.name} has been updated successfully`);
            }
            
            queryClient.invalidateQueries({ queryKey: ['branches'] });
            setEditBranch(null);
        } catch (error) {
            console.error('Failed to save branch:', error);
            toast.error('Failed to save branch. Please try again.');
        }
    }

    function mapOperatingHours(hours: DisplayBranch['hours']) {
        const dayMap: Record<string, string> = {
            Mon: 'monday',
            Tue: 'tuesday',
            Wed: 'wednesday',
            Thu: 'thursday',
            Fri: 'friday',
            Sat: 'saturday',
            Sun: 'sunday',
        };

        const result: Record<string, { is_open: boolean; open_time: string | null; close_time: string | null }> = {};
        
        for (const [shortDay, config] of Object.entries(hours)) {
            const fullDay = dayMap[shortDay];
            result[fullDay] = {
                is_open: config.open,
                open_time: config.open ? config.from : null,
                close_time: config.open ? config.to : null,
            };
        }
        
        return result;
    }

    async function deleteBranchFn(b: DisplayBranch) {
        try {
            await branchService.deleteBranch(Number(b.id));
            toast.success(`${b.name} has been deleted successfully`);
            queryClient.invalidateQueries({ queryKey: ['branches'] });
            setDeleteBranch(null);
        } catch (error) {
            console.error('Failed to delete branch:', error);
            toast.error('Failed to delete branch. Please try again.');
            setDeleteBranch(null);
        }
    }

    async function toggleOpen(b: DisplayBranch) {
        try {
            const result = await branchService.toggleDailyStatus(Number(b.id));
            toast.success(result.message);
            
            // Update local state to reflect the change immediately
            setLocalOpenStatus((prev) => ({
                ...prev,
                [b.id]: result.is_open ? 'open' : 'closed',
            }));
            
            // Refresh the data from the server
            queryClient.invalidateQueries({ queryKey: ['branches'] });
        } catch (error) {
            console.error('Failed to toggle branch status:', error);
            toast.error('Failed to update branch status. Please try again.');
        }
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
                {isLoading ? (
                    <div className="col-span-2 py-16 text-center text-neutral-gray text-sm font-body">Loading branches…</div>
                ) : (
                branches.map((branch: any) => (
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
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                await branchService.updateBranch(Number(branch.id), { is_active: true });
                                                toast.success(`${branch.name} has been reactivated`);
                                                queryClient.invalidateQueries({ queryKey: ['branches'] });
                                                setLocalStatus((prev) => ({ ...prev, [branch.id]: 'active' }));
                                            } catch (error) {
                                                console.error('Failed to reactivate branch:', error);
                                                toast.error('Failed to reactivate branch. Please try again.');
                                            }
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-secondary/10 rounded-xl text-secondary text-xs font-medium font-body hover:bg-secondary/20 transition-colors cursor-pointer"
                                    >
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
                ))
                )}
            </div>

            {/* Modals */}
            {editBranch !== null && (
                <BranchModal
                    branch={editBranch === 'new' ? null : editBranch}
                    onClose={() => setEditBranch(null)}
                    onSave={saveBranch}
                    employees={employeeOptions}
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
                            <button
                                type="button"
                                onClick={async () => {
                                    try {
                                        await branchService.updateBranch(Number(deactivateConfirm.id), { is_active: false });
                                        toast.success(`${deactivateConfirm.name} has been deactivated`);
                                        queryClient.invalidateQueries({ queryKey: ['branches'] });
                                        setLocalStatus((prev) => ({ ...prev, [deactivateConfirm.id]: 'inactive' }));
                                        setDeactivateConfirm(null);
                                    } catch (error) {
                                        console.error('Failed to deactivate branch:', error);
                                        toast.error('Failed to deactivate branch. Please try again.');
                                        setDeactivateConfirm(null);
                                    }
                                }}
                                className="flex-1 px-4 py-2.5 bg-warning text-white rounded-xl text-sm font-medium font-body cursor-pointer"
                            >
                                Deactivate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
