'use client';

import { useMemo } from 'react';
import {
    BuildingsIcon,
    PhoneIcon,
    EnvelopeIcon,
    MapPinIcon,
    ClockIcon,
    TruckIcon,
    CurrencyCircleDollarIcon,
    CheckCircleIcon,
    XCircleIcon,
    ShoppingBagIcon,
    ForkKnifeIcon,
    MotorcycleIcon,
    MoneyIcon,
    DeviceMobileIcon,
    SpinnerIcon,
    WarningIcon,
    CreditCardIcon,
} from '@phosphor-icons/react';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useBranch } from '@/lib/api/hooks/useBranches';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DAY_KEY_MAP: Record<string, string> = {
    monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
    friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
    '0': 'Mon', '1': 'Tue', '2': 'Wed', '3': 'Thu', '4': 'Fri', '5': 'Sat', '6': 'Sun',
    Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun',
};

const PAYMENT_LABELS: Record<string, { icon: React.ElementType; label: string }> = {
    mobile_money: { icon: DeviceMobileIcon, label: 'Mobile Money' },
    cash: { icon: MoneyIcon, label: 'Cash' },
    card: { icon: CreditCardIcon, label: 'Card' },
};

const ORDER_TYPE_LABELS: Record<string, { icon: React.ElementType; label: string }> = {
    delivery: { icon: TruckIcon, label: 'Delivery' },
    pickup: { icon: ShoppingBagIcon, label: 'Pickup' },
    dine_in: { icon: ForkKnifeIcon, label: 'Dine In' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'open' | 'closed' | 'busy' }) {
    const cfg = {
        open:   { color: 'bg-secondary/10 text-secondary border-secondary/20', dot: 'bg-secondary', label: 'Open'   },
        closed: { color: 'bg-error/10 text-error border-error/20',             dot: 'bg-error',     label: 'Closed' },
        busy:   { color: 'bg-warning/10 text-warning border-warning/20',       dot: 'bg-warning',   label: 'Busy'   },
    }[status];
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold font-body border ${cfg.color}`}>
            <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
            {cfg.label}
        </span>
    );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-[#f0e8d8] last:border-0">
            <div className="w-8 h-8 rounded-lg bg-neutral-light flex items-center justify-center shrink-0 mt-0.5">
                <Icon size={14} weight="fill" className="text-neutral-gray" />
            </div>
            <div>
                <p className="text-neutral-gray text-[11px] font-body uppercase tracking-wider">{label}</p>
                <p className="text-text-dark text-sm font-body mt-0.5">{value}</p>
            </div>
        </div>
    );
}

function Flag({ on }: { on: boolean }) {
    return on
        ? <CheckCircleIcon size={16} weight="fill" className="text-secondary shrink-0" />
        : <XCircleIcon     size={16} weight="fill" className="text-neutral-gray/30 shrink-0" />;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f0e8d8]">
                <h2 className="text-text-dark text-sm font-bold font-body">{title}</h2>
            </div>
            <div className="px-5 py-4">{children}</div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartnerBranchPage() {
    const { staffUser } = useStaffAuth();
    const branchId = staffUser?.branches[0]?.id ? Number(staffUser.branches[0].id) : null;
    const { branch: apiBranch, isLoading, error } = useBranch(branchId ?? 0);
    const branchName = staffUser?.branches[0]?.name ?? apiBranch?.name ?? '—';

    const hours = useMemo(() => {
        const result: Record<string, { open: boolean; from: string; to: string }> = {};
        DAYS.forEach(d => { result[d] = { open: false, from: '', to: '' }; });

        if (apiBranch?.operating_hours) {
            for (const [key, oh] of Object.entries(apiBranch.operating_hours)) {
                const day = DAY_KEY_MAP[key.toLowerCase()] ?? DAY_KEY_MAP[key];
                if (day && oh) {
                    result[day] = {
                        open: oh.is_open,
                        from: oh.open_time?.slice(0, 5) ?? '',
                        to: oh.close_time?.slice(0, 5) ?? '',
                    };
                }
            }
        }
        return result;
    }, [apiBranch]);

    const orderTypes = useMemo(() => {
        if (!apiBranch?.order_types) return [];
        return Object.entries(apiBranch.order_types).map(([key, val]) => ({
            key,
            ...(ORDER_TYPE_LABELS[key] ?? { icon: ShoppingBagIcon, label: key.replace(/_/g, ' ') }),
            enabled: val.is_enabled,
        }));
    }, [apiBranch]);

    const paymentMethods = useMemo(() => {
        if (!apiBranch?.payment_methods) return [];
        return Object.entries(apiBranch.payment_methods).map(([key, val]) => ({
            key,
            ...(PAYMENT_LABELS[key] ?? { icon: CurrencyCircleDollarIcon, label: key.replace(/_/g, ' ') }),
            enabled: val.is_enabled,
        }));
    }, [apiBranch]);

    const openStatus: 'open' | 'closed' = apiBranch?.is_open ? 'open' : 'closed';

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <SpinnerIcon size={32} className="text-primary animate-spin" />
            </div>
        );
    }

    if (error || !apiBranch) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 px-4">
                <WarningIcon size={32} weight="fill" className="text-warning" />
                <p className="text-text-dark text-sm font-body font-semibold">Unable to load branch data</p>
                <p className="text-neutral-gray text-xs font-body text-center">
                    {!branchId ? 'No branch assigned to your account.' : 'Please check your connection and try again.'}
                </p>
            </div>
        );
    }

    return (
        <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">

            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <BuildingsIcon size={20} weight="fill" className="text-primary" />
                        <h1 className="text-text-dark text-2xl font-bold font-body">{branchName}</h1>
                    </div>
                    <p className="text-neutral-gray text-sm font-body">Branch information · read-only</p>
                </div>
                <StatusBadge status={openStatus} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Contact info */}
                <SectionCard title="Contact & Location">
                    <InfoRow icon={MapPinIcon}    label="Address"  value={apiBranch.address ?? '—'} />
                    <InfoRow icon={PhoneIcon}     label="Phone"    value={apiBranch.phone ?? '—'} />
                    <InfoRow icon={EnvelopeIcon}  label="Email"    value={apiBranch.email ?? '—'} />
                    <InfoRow icon={ForkKnifeIcon} label="Manager"  value={apiBranch.manager?.name ?? '—'} />
                </SectionCard>

                {/* Delivery settings */}
                <SectionCard title="Delivery Settings">
                    <InfoRow icon={TruckIcon}                label="Delivery Radius"   value={`${apiBranch.delivery_settings?.delivery_radius_km ?? 0} km`} />
                    <InfoRow icon={CurrencyCircleDollarIcon} label="Base Delivery Fee" value={`₵${apiBranch.delivery_settings?.base_delivery_fee ?? 0}`} />
                    <InfoRow icon={MotorcycleIcon}           label="Per-km Fee"        value={`₵${apiBranch.delivery_settings?.per_km_fee ?? 0} / km`} />
                    <InfoRow icon={ShoppingBagIcon}          label="Min. Order Value"  value={`₵${apiBranch.delivery_settings?.min_order_value ?? 0}`} />
                </SectionCard>

                {/* Order types */}
                <SectionCard title="Order Types">
                    <div className="flex flex-col gap-3">
                        {orderTypes.length > 0 ? orderTypes.map(({ key, icon: Icon, label, enabled }) => (
                            <div key={key} className="flex items-center justify-between py-2 border-b border-[#f0e8d8] last:border-0">
                                <div className="flex items-center gap-2.5">
                                    <Icon size={15} weight="fill" className="text-neutral-gray" />
                                    <span className="text-text-dark text-sm font-body capitalize">{label}</span>
                                </div>
                                <Flag on={enabled} />
                            </div>
                        )) : (
                            <p className="text-neutral-gray text-sm font-body">No order types configured</p>
                        )}
                    </div>
                </SectionCard>

                {/* Payment methods */}
                <SectionCard title="Payment Methods">
                    <div className="flex flex-col gap-3">
                        {paymentMethods.length > 0 ? paymentMethods.map(({ key, icon: Icon, label, enabled }) => (
                            <div key={key} className="flex items-center justify-between py-2 border-b border-[#f0e8d8] last:border-0">
                                <div className="flex items-center gap-2.5">
                                    <Icon size={15} weight="fill" className="text-neutral-gray" />
                                    <span className="text-text-dark text-sm font-body capitalize">{label}</span>
                                </div>
                                <Flag on={enabled} />
                            </div>
                        )) : (
                            <p className="text-neutral-gray text-sm font-body">No payment methods configured</p>
                        )}
                    </div>
                </SectionCard>

                {/* Operating hours */}
                <div className="md:col-span-2">
                    <SectionCard title="Operating Hours">
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                            {DAYS.map(day => {
                                const h = hours[day];
                                return (
                                    <div key={day} className={`rounded-xl px-3 py-3 ${h.open ? 'bg-secondary/5 border border-secondary/15' : 'bg-neutral-light border border-[#f0e8d8]'}`}>
                                        <p className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider mb-1">{day}</p>
                                        {h.open ? (
                                            <div>
                                                <div className="flex items-center gap-1 mb-0.5">
                                                    <ClockIcon size={10} weight="fill" className="text-secondary" />
                                                    <span className="text-text-dark text-[11px] font-body">{h.from}</span>
                                                </div>
                                                <span className="text-neutral-gray text-[11px] font-body">– {h.to}</span>
                                            </div>
                                        ) : (
                                            <span className="text-neutral-gray/50 text-xs font-body">Closed</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}
