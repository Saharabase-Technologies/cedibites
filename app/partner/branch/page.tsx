'use client';

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
} from '@phosphor-icons/react';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';

// ─── Mock branch data ──────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const BRANCH_DATA: Record<string, {
    address: string;
    phone: string;
    email: string;
    manager: string;
    openStatus: 'open' | 'closed' | 'busy';
    deliveryRadius: number;
    baseDeliveryFee: number;
    perKmFee: number;
    minOrderValue: number;
    orderTypes: { delivery: boolean; pickup: boolean; dineIn: boolean };
    payments: { momo: boolean; cashOnDelivery: boolean; cashAtPickup: boolean };
    hours: Record<string, { open: boolean; from: string; to: string }>;
}> = {
    'East Legon': {
        address: 'East Legon Hills, Accra',
        phone: '0302789456',
        email: 'eastlegon@cedibites.com',
        manager: 'Kwame Asante',
        openStatus: 'open',
        deliveryRadius: 6,
        baseDeliveryFee: 20,
        perKmFee: 4,
        minOrderValue: 60,
        orderTypes: { delivery: true, pickup: true, dineIn: true },
        payments: { momo: true, cashOnDelivery: true, cashAtPickup: false },
        hours: Object.fromEntries(DAYS.map(d => [d, { open: true, from: '08:00', to: '20:00' }])),
    },
    'Osu': {
        address: '14 Ring Road, Osu, Accra',
        phone: '0302123456',
        email: 'osu@cedibites.com',
        manager: 'Ama Boateng',
        openStatus: 'open',
        deliveryRadius: 5,
        baseDeliveryFee: 15,
        perKmFee: 3,
        minOrderValue: 50,
        orderTypes: { delivery: true, pickup: true, dineIn: false },
        payments: { momo: true, cashOnDelivery: true, cashAtPickup: true },
        hours: Object.fromEntries(DAYS.map(d => [d, { open: d !== 'Sun', from: '08:00', to: '21:00' }])),
    },
    'Spintex': {
        address: 'Spintex Road, Accra',
        phone: '0302654321',
        email: 'spintex@cedibites.com',
        manager: 'Abena Mensah',
        openStatus: 'busy',
        deliveryRadius: 4,
        baseDeliveryFee: 12,
        perKmFee: 2.5,
        minOrderValue: 45,
        orderTypes: { delivery: true, pickup: false, dineIn: false },
        payments: { momo: true, cashOnDelivery: false, cashAtPickup: false },
        hours: Object.fromEntries(DAYS.map(d => [d, { open: true, from: '09:00', to: '19:00' }])),
    },
};

const FALLBACK = BRANCH_DATA['East Legon'];

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
    const branchName = staffUser?.branch ?? 'East Legon';
    const branch = BRANCH_DATA[branchName] ?? FALLBACK;

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
                <StatusBadge status={branch.openStatus} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Contact info */}
                <SectionCard title="Contact & Location">
                    <InfoRow icon={MapPinIcon}    label="Address"  value={branch.address} />
                    <InfoRow icon={PhoneIcon}     label="Phone"    value={branch.phone} />
                    <InfoRow icon={EnvelopeIcon}  label="Email"    value={branch.email} />
                    <InfoRow icon={ForkKnifeIcon} label="Manager"  value={branch.manager} />
                </SectionCard>

                {/* Delivery settings */}
                <SectionCard title="Delivery Settings">
                    <InfoRow icon={TruckIcon}                label="Delivery Radius"   value={`${branch.deliveryRadius} km`} />
                    <InfoRow icon={CurrencyCircleDollarIcon} label="Base Delivery Fee" value={`₵${branch.baseDeliveryFee}`} />
                    <InfoRow icon={MotorcycleIcon}           label="Per-km Fee"        value={`₵${branch.perKmFee} / km`} />
                    <InfoRow icon={ShoppingBagIcon}          label="Min. Order Value"  value={`₵${branch.minOrderValue}`} />
                </SectionCard>

                {/* Order types */}
                <SectionCard title="Order Types">
                    <div className="flex flex-col gap-3">
                        {[
                            { icon: TruckIcon,       label: 'Delivery',  on: branch.orderTypes.delivery },
                            { icon: ShoppingBagIcon, label: 'Pickup',    on: branch.orderTypes.pickup   },
                            { icon: ForkKnifeIcon,   label: 'Dine In',   on: branch.orderTypes.dineIn   },
                        ].map(({ icon: Icon, label, on }) => (
                            <div key={label} className="flex items-center justify-between py-2 border-b border-[#f0e8d8] last:border-0">
                                <div className="flex items-center gap-2.5">
                                    <Icon size={15} weight="fill" className="text-neutral-gray" />
                                    <span className="text-text-dark text-sm font-body">{label}</span>
                                </div>
                                <Flag on={on} />
                            </div>
                        ))}
                    </div>
                </SectionCard>

                {/* Payment methods */}
                <SectionCard title="Payment Methods">
                    <div className="flex flex-col gap-3">
                        {[
                            { icon: DeviceMobileIcon, label: 'Mobile Money',     on: branch.payments.momo           },
                            { icon: MoneyIcon,         label: 'Cash on Delivery', on: branch.payments.cashOnDelivery },
                            { icon: MoneyIcon,         label: 'Cash at Pickup',   on: branch.payments.cashAtPickup   },
                        ].map(({ icon: Icon, label, on }) => (
                            <div key={label} className="flex items-center justify-between py-2 border-b border-[#f0e8d8] last:border-0">
                                <div className="flex items-center gap-2.5">
                                    <Icon size={15} weight="fill" className="text-neutral-gray" />
                                    <span className="text-text-dark text-sm font-body">{label}</span>
                                </div>
                                <Flag on={on} />
                            </div>
                        ))}
                    </div>
                </SectionCard>

                {/* Operating hours */}
                <div className="md:col-span-2">
                    <SectionCard title="Operating Hours">
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                            {DAYS.map(day => {
                                const h = branch.hours[day];
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
