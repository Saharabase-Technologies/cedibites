'use client';

import { useState, useEffect } from 'react';
import {
    GearSixIcon,
    FloppyDiskIcon,
    StorefrontIcon,
    ClockIcon,
    TruckIcon,
} from '@phosphor-icons/react';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useBranch } from '@/lib/api/hooks/useBranches';
import { branchService } from '@/lib/api/services/branch.service';
import { toast } from '@/lib/utils/toast';

// ─── Local types (previously from useMenuConfig) ──────────────────────────────

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface DayHours {
    open: string;
    close: string;
    closed: boolean;
}

export interface BranchSettings {
    isOpen: boolean;
    orderTypes: { delivery: boolean; pickup: boolean; dineIn: boolean };
    paymentMethods: { momo: boolean; cashDelivery: boolean };
    hours: Record<DayKey, DayHours>;
}

const DEFAULT_HOURS: Record<DayKey, DayHours> = {
    mon: { open: '09:00', close: '22:00', closed: false },
    tue: { open: '09:00', close: '22:00', closed: false },
    wed: { open: '09:00', close: '22:00', closed: false },
    thu: { open: '09:00', close: '22:00', closed: false },
    fri: { open: '09:00', close: '23:00', closed: false },
    sat: { open: '09:00', close: '23:00', closed: false },
    sun: { open: '10:00', close: '21:00', closed: false },
};

const DEFAULT_BRANCH: BranchSettings = {
    isOpen: true,
    orderTypes: { delivery: true, pickup: true, dineIn: false },
    paymentMethods: { momo: true, cashDelivery: true },
    hours: DEFAULT_HOURS,
};

// ─── Shared input class (light text on dark bg) ───────────────────────────────

const inputCls = 'w-full bg-neutral-light border border-brown-light/20 rounded-xl px-3 py-2.5 text-sm font-body text-text-dark placeholder:text-neutral-gray/50 focus:outline-none focus:border-primary transition-colors';

// ─── Reusable toggle ──────────────────────────────────────────────────────────

function Toggle({ checked, onChange, size = 'md' }: { checked: boolean; onChange: () => void; size?: 'sm' | 'md' }) {
    const track = size === 'sm' ? 'w-8 h-5'  : 'w-10 h-6';
    const thumb = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
    const shift = size === 'sm' ? 'translate-x-3' : 'translate-x-4';
    return (
        <div onClick={onChange}
            className={`${track} rounded-full flex items-center px-0.5 transition-colors duration-200 cursor-pointer shrink-0 ${checked ? 'bg-secondary' : 'bg-brown-light/30'}`}>
            <div className={`${thumb} rounded-full bg-white shadow transition-transform duration-200 ${checked ? shift : 'translate-x-0'}`} />
        </div>
    );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, color, title, sub }: { icon: React.ElementType; color: string; title: string; sub: string }) {
    return (
        <div className="flex items-center gap-3 mb-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                <Icon size={15} weight="fill" className="text-white" />
            </div>
            <div>
                <h2 className="text-text-dark text-base font-bold font-body">{title}</h2>
                <p className="text-neutral-gray text-xs font-body">{sub}</p>
            </div>
        </div>
    );
}

// ─── Day labels ───────────────────────────────────────────────────────────────

const DAY_LABELS: Record<DayKey, string> = {
    mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
    fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};
const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MenuSettingsPage() {
    const { staffUser } = useStaffAuth();
    const branchId = staffUser?.branches[0]?.id ? Number(staffUser.branches[0].id) : undefined;

    // Fetch real branch data from API
    const { branch: apiBranch } = useBranch(branchId ?? 0);

    // Local working copies
    const [branch,     setBranch]     = useState<BranchSettings>(DEFAULT_BRANCH);
    const [dirty, setDirty] = useState(false);
    
    // Update branch settings when API data loads
    useEffect(() => {
        if (apiBranch && apiBranch.operating_hours) {
            const hours: Record<DayKey, DayHours> = {
                mon: { open: '09:00', close: '22:00', closed: false },
                tue: { open: '09:00', close: '22:00', closed: false },
                wed: { open: '09:00', close: '22:00', closed: false },
                thu: { open: '09:00', close: '22:00', closed: false },
                fri: { open: '09:00', close: '22:00', closed: false },
                sat: { open: '09:00', close: '22:00', closed: false },
                sun: { open: '09:00', close: '22:00', closed: false },
            };
            
            // Map API operating hours to our format
            Object.entries(apiBranch.operating_hours).forEach(([day, data]) => {
                const dayKey = day.substring(0, 3).toLowerCase() as DayKey;
                if (dayKey in hours) {
                    hours[dayKey] = {
                        open: data.open_time || '09:00',
                        close: data.close_time || '22:00',
                        closed: !data.is_open,
                    };
                }
            });
            
            const orderTypes = {
                delivery: apiBranch.order_types?.delivery?.is_enabled ?? true,
                pickup: apiBranch.order_types?.pickup?.is_enabled ?? true,
                dineIn: apiBranch.order_types?.dine_in?.is_enabled ?? false,
            };
            
            const paymentMethods = {
                momo: apiBranch.payment_methods?.momo?.is_enabled ?? true,
                cashDelivery: apiBranch.payment_methods?.cash_on_delivery?.is_enabled ?? true,
            };
            
            setBranch({
                isOpen: apiBranch.is_active,
                hours,
                orderTypes,
                paymentMethods,
            });
        }
    }, [apiBranch]);

    function mark() { setDirty(true); }

    // ── Branch settings ──────────────────────────────────────────────────────

    function setBranchField<K extends keyof BranchSettings>(key: K, value: BranchSettings[K]) {
        setBranch(prev => ({ ...prev, [key]: value }));
        mark();
    }

    function setOrderType(key: keyof BranchSettings['orderTypes'], val: boolean) {
        setBranch(prev => ({ ...prev, orderTypes: { ...prev.orderTypes, [key]: val } }));
        mark();
    }

    function setPaymentMethod(key: keyof BranchSettings['paymentMethods'], val: boolean) {
        setBranch(prev => ({ ...prev, paymentMethods: { ...prev.paymentMethods, [key]: val } }));
        mark();
    }

    function setDayHours(day: DayKey, field: keyof DayHours, value: string | boolean) {
        setBranch(prev => ({
            ...prev,
            hours: { ...prev.hours, [day]: { ...prev.hours[day], [field]: value } },
        }));
        mark();
    }

    // ── Commit ───────────────────────────────────────────────────────────────

    async function handleSave() {
        if (!branchId) {
            toast.error('No branch ID found');
            return;
        }

        try {
            // Save branch settings to API
            const operatingHours: Record<string, { is_open: boolean; open_time: string | null; close_time: string | null }> = {};
            
            DAY_KEYS.forEach(day => {
                const dayName = DAY_LABELS[day].toLowerCase();
                const hours = branch.hours[day];
                operatingHours[dayName] = {
                    is_open: !hours.closed,
                    open_time: hours.closed ? null : hours.open,
                    close_time: hours.closed ? null : hours.close,
                };
            });

            const orderTypes = {
                delivery: { is_enabled: branch.orderTypes.delivery },
                pickup: { is_enabled: branch.orderTypes.pickup },
                dine_in: { is_enabled: branch.orderTypes.dineIn },
            };

            const paymentMethods = {
                momo: { is_enabled: branch.paymentMethods.momo },
                cash_on_delivery: { is_enabled: branch.paymentMethods.cashDelivery },
            };

            await branchService.updateBranch(branchId, {
                is_active: branch.isOpen,
                operating_hours: operatingHours,
                order_types: orderTypes,
                payment_methods: paymentMethods,
            });

            setDirty(false);
            toast.success('Settings saved successfully');
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error('Failed to save settings');
        }
    }

    return (
        <>
            <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto pb-24">

                {/* ── Header ──────────────────────────────────────────────────── */}
                <div className="flex items-start justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-text-dark text-xl font-bold font-body">Configurator</h1>
                        <p className="text-neutral-gray text-sm font-body mt-0.5 flex items-center gap-1.5">
                            <GearSixIcon size={13} weight="fill" />
                            Branch settings, menu defaults &amp; operational config
                        </p>
                    </div>
                    {dirty && (
                        <button type="button" onClick={handleSave}
                            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-brand-darker font-semibold font-body text-sm px-4 py-2.5 rounded-xl transition-colors cursor-pointer shrink-0">
                            <FloppyDiskIcon size={16} weight="bold" />
                            Save Changes
                        </button>
                    )}
                </div>

                {/* ═══════════════════════════════════════════════════════════════
                    SECTION 1 — BRANCH STATUS
                ════════════════════════════════════════════════════════════════ */}
                <section className="mb-10">
                    <SectionHeader icon={StorefrontIcon} color="bg-secondary" title="Branch Status" sub="Instantly open or close the branch for all order types" />

                    <div className={`rounded-2xl border p-5 flex items-center justify-between gap-4 transition-colors ${branch.isOpen ? 'bg-secondary/8 border-secondary/25' : 'bg-error/8 border-error/25'}`}>
                        <div>
                            <p className={`text-base font-bold font-body ${branch.isOpen ? 'text-secondary' : 'text-error'}`}>
                                {branch.isOpen ? 'Branch is Open' : 'Branch is Closed'}
                            </p>
                            <p className="text-neutral-gray text-xs font-body mt-0.5">
                                {branch.isOpen ? 'Customers can place orders right now' : 'All new orders are blocked until you re-open'}
                            </p>
                        </div>
                        <Toggle checked={branch.isOpen} onChange={() => setBranchField('isOpen', !branch.isOpen)} />
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════════
                    SECTION 2 — BRANCH HOURS
                ════════════════════════════════════════════════════════════════ */}
                <section className="mb-10">
                    <SectionHeader icon={ClockIcon} color="bg-info" title="Branch Hours" sub="Set opening and closing times for each day" />

                    <div className="bg-neutral-card border border-brown-light/15 rounded-2xl overflow-hidden">
                        {DAY_KEYS.map((day, i) => {
                            const h = branch.hours[day];
                            return (
                                <div key={day} className={`flex items-center gap-3 px-4 py-3 ${i < DAY_KEYS.length - 1 ? 'border-b border-brown-light/10' : ''}`}>
                                    <span className="w-24 shrink-0 text-sm font-medium font-body text-text-dark">{DAY_LABELS[day]}</span>

                                    {/* Closed toggle */}
                                    <button type="button" onClick={() => setDayHours(day, 'closed', !h.closed)}
                                        className="flex items-center gap-2 cursor-pointer shrink-0">
                                        <Toggle checked={!h.closed} onChange={() => setDayHours(day, 'closed', !h.closed)} size="sm" />
                                        <span className={`text-xs font-body font-medium w-12 ${h.closed ? 'text-neutral-gray/50' : 'text-secondary'}`}>
                                            {h.closed ? 'Closed' : 'Open'}
                                        </span>
                                    </button>

                                    {/* Time inputs */}
                                    {!h.closed ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            <input type="time" value={h.open}  onChange={e => setDayHours(day, 'open',  e.target.value)}
                                                className="flex-1 bg-neutral-light border border-brown-light/15 rounded-lg px-2.5 py-1.5 text-sm font-body text-text-dark focus:outline-none focus:border-primary transition-colors" />
                                            <span className="text-neutral-gray text-xs font-body shrink-0">to</span>
                                            <input type="time" value={h.close} onChange={e => setDayHours(day, 'close', e.target.value)}
                                                className="flex-1 bg-neutral-light border border-brown-light/15 rounded-lg px-2.5 py-1.5 text-sm font-body text-text-dark focus:outline-none focus:border-primary transition-colors" />
                                        </div>
                                    ) : (
                                        <span className="text-neutral-gray/40 text-xs font-body flex-1">—</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════════
                    SECTION 3 — ORDER TYPES + PAYMENT METHODS
                ════════════════════════════════════════════════════════════════ */}
                <section className="mb-10">
                    <SectionHeader icon={TruckIcon} color="bg-primary" title="Order Types &amp; Payments" sub="Control what customers can order and how they pay" />

                    <div className="grid sm:grid-cols-2 gap-3">
                        {/* Order types */}
                        <div className="bg-neutral-card border border-brown-light/15 rounded-2xl overflow-hidden">
                            <p className="text-text-dark text-xs font-bold font-body uppercase tracking-wider px-4 py-3 border-b border-brown-light/10">Order Types</p>
                            {([
                                { key: 'delivery', label: 'Delivery' },
                                { key: 'pickup',   label: 'Pickup'   },
                                { key: 'dineIn',   label: 'Dine-in'  },
                            ] as { key: keyof BranchSettings['orderTypes']; label: string }[]).map(({ key, label }, i, arr) => (
                                <div key={key} className={`flex items-center justify-between px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-brown-light/10' : ''}`}>
                                    <span className="text-sm font-body text-text-dark">{label}</span>
                                    <Toggle checked={branch.orderTypes[key]} onChange={() => setOrderType(key, !branch.orderTypes[key])} size="sm" />
                                </div>
                            ))}
                        </div>

                        {/* Payment methods */}
                        <div className="bg-neutral-card border border-brown-light/15 rounded-2xl overflow-hidden">
                            <p className="text-text-dark text-xs font-bold font-body uppercase tracking-wider px-4 py-3 border-b border-brown-light/10">Payment Methods</p>
                            {([
                                { key: 'momo',         label: 'Mobile Money (MoMo)' },
                                { key: 'cashDelivery', label: 'Cash on Delivery'    },
                            ] as { key: keyof BranchSettings['paymentMethods']; label: string }[]).map(({ key, label }, i, arr) => (
                                <div key={key} className={`flex items-center justify-between px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-brown-light/10' : ''}`}>
                                    <span className="text-sm font-body text-text-dark">{label}</span>
                                    <Toggle checked={branch.paymentMethods[key]} onChange={() => setPaymentMethod(key, !branch.paymentMethods[key])} size="sm" />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Sticky save bar ─────────────────────────────────────────── */}
                {dirty && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 bg-neutral-card border border-brown-light/20 shadow-2xl rounded-2xl px-5 py-3.5">
                        <p className="text-text-dark text-sm font-body">Unsaved changes</p>
                        <button type="button" onClick={handleSave}
                            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-brand-darker font-bold font-body text-sm px-4 py-2 rounded-xl transition-colors cursor-pointer">
                            <FloppyDiskIcon size={15} weight="bold" /> Save
                        </button>
                    </div>
                )}

            </div>
        </>
    );
}
