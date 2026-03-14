'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    PhoneIcon,
    WhatsappLogoIcon,
    ShareNetworkIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    MinusIcon,
    XIcon,
    CaretLeftIcon,
    CaretRightIcon,
    MapPinIcon,
    UserIcon,
    EnvelopeIcon,
    NoteIcon,
    DeviceMobileIcon,
    MoneyIcon,
    HandCoinsIcon,
    CheckCircleIcon,
    SpinnerIcon,
    WarningCircleIcon,
    ClockIcon,
} from '@phosphor-icons/react';
import Input from '@/app/components/base/Input';
import { sampleMenuItems, menuCategories, type MenuItem } from '@/lib/data/SampleMenu';
import { BRANCHES } from '@/app/components/providers/BranchProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderSource = 'phone' | 'whatsapp' | 'social_media';
type OrderType = 'delivery' | 'pickup';
type PaymentMethod = 'momo' | 'cash_delivery' | 'cash_pickup';

interface StaffCartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    category: string;
}

interface CustomerDetails {
    name: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
}



const ORDER_SOURCES: { id: OrderSource; label: string; icon: React.ElementType }[] = [
    { id: 'phone',        label: 'Phone',        icon: PhoneIcon },
    { id: 'whatsapp',     label: 'WhatsApp',     icon: WhatsappLogoIcon },
    { id: 'social_media', label: 'Social Media', icon: ShareNetworkIcon },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGHS(amount: number) {
    return `GHS ${amount.toFixed(2)}`;
}

function formatPhone(raw: string): string {
    // Strip non-digits
    const digits = raw.replace(/\D/g, '');
    // If starts with 233, keep as is
    if (digits.startsWith('233')) return '+' + digits;
    // If starts with 0, format as 0XX XXX XXXX
    if (digits.startsWith('0') && digits.length <= 10) {
        const d = digits.slice(1);
        if (d.length <= 2) return '0' + d;
        if (d.length <= 5) return '0' + d.slice(0, 2) + ' ' + d.slice(2);
        return '0' + d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5);
    }
    return raw;
}

function generateOrderCode() {
    return `CB${Date.now().toString().slice(-6)}`;
}

// Returns the lowest applicable price for any menu item (flat, sized, or variant)
function getBasePrice(item: MenuItem): number {
    if (item.price !== undefined) return item.price;
    if (item.variants) return Math.min(item.variants.plain ?? Infinity, item.variants.assorted ?? Infinity);
    if (item.sizes) return Math.min(...item.sizes.map(s => s.price));
    return 0;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEP_LABELS = ['Setup', 'Menu', 'Customer', 'Review'];

function StepIndicator({ current }: { current: number }) {
    return (
        <div className="flex items-center gap-0 mb-6">
            {STEP_LABELS.map((label, i) => {
                const step = i + 1;
                const done = step < current;
                const active = step === current;
                const isLast = i === STEP_LABELS.length - 1;

                return (
                    <div key={label} className="flex items-center flex-1">
                        <div className="flex flex-col items-center gap-1 shrink-0">
                            <div className={`
                w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-body
                transition-all duration-200
                ${done ? 'bg-secondary text-white' : ''}
                ${active ? 'bg-primary text-brand-darker' : ''}
                ${!done && !active ? 'bg-brown-light/20 text-neutral-gray' : ''}
              `}>
                                {done ? <CheckCircleIcon size={16} weight="fill" /> : step}
                            </div>
                            <span className={`text-[10px] font-body hidden sm:block ${active ? 'text-primary' : done ? 'text-secondary' : 'text-neutral-gray'}`}>
                                {label}
                            </span>
                        </div>
                        {!isLast && (
                            <div className={`h-px flex-1 mx-1 transition-colors duration-200 ${done ? 'bg-secondary' : 'bg-brown-light/20'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Step 1: Setup ────────────────────────────────────────────────────────────

function StepSetup({
    source,
    branchId,
    onSource,
    onBranch,
    onNext,
}: {
    source: OrderSource | null;
    branchId: string | null;
    onSource: (s: OrderSource) => void;
    onBranch: (id: string) => void;
    onNext: () => void;
}) {
    const canProceed = !!source && !!branchId;

    return (
        <div className="flex flex-col gap-8">

            {/* Order source */}
            <div>
                <h2 className="text-text-dark dark:text-text-light text-sm font-semibold font-body mb-3">
                    Where is this order coming from?
                </h2>
                <div className="grid grid-cols-4 gap-2">
                    {ORDER_SOURCES.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onSource(id)}
                            className={`
                flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2
                font-body text-xs font-medium transition-all duration-150 cursor-pointer
                ${source === id
                                    ? 'border-primary bg-primary/10 text-text-dark dark:text-primary'
                                    : 'border-brown-light/20 bg-transparent text-neutral-gray hover:border-brown-light/40 hover:text-text-dark dark:hover:text-text-light'
                                }
              `}
                        >
                            <Icon size={22} weight={source === id ? 'fill' : 'regular'} />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Branch selection */}
            <div>
                <h2 className="text-text-dark dark:text-text-light text-sm font-semibold font-body mb-3">
                    Which branch fulfills this order?
                </h2>
                <div className="flex flex-col gap-2">
                    {BRANCHES.map(branch => (
                        <button
                            key={branch.id}
                            type="button"
                            disabled={!branch.isOpen}
                            onClick={() => onBranch(branch.id)}
                            className={`
                flex items-center justify-between px-4 py-3.5 rounded-2xl border-2
                transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
                text-left
                ${branchId === branch.id
                                    ? 'border-primary bg-primary/10'
                                    : 'border-brown-light/20 hover:border-brown-light/40'
                                }
              `}
                        >
                            <div>
                                <p className={`font-semibold font-body text-sm ${branchId === branch.id ? 'text-text-dark dark:text-primary' : 'text-text-dark dark:text-text-light'}`}>
                                    {branch.name}
                                </p>
                                <p className="text-neutral-gray text-xs font-body mt-0.5">{branch.area}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-neutral-gray text-xs font-body">
                                    +{formatGHS(branch.deliveryFee)} delivery
                                </span>
                                <span className={`text-[10px] font-medium font-body px-2 py-1 rounded-full ${branch.isOpen ? 'bg-secondary/15 text-secondary' : 'bg-error/15 text-error'}`}>
                                    {branch.isOpen ? 'Open' : 'Closed'}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Next */}
            <button
                type="button"
                disabled={!canProceed}
                onClick={onNext}
                className="
          w-full flex items-center justify-center gap-2
          bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed
          text-brand-darker font-semibold font-body py-4 rounded-full
          transition-all duration-150 cursor-pointer
        "
            >
                Pick Items
                <CaretRightIcon size={18} weight="bold" />
            </button>
        </div>
    );
}

// ─── Step 2: Menu ─────────────────────────────────────────────────────────────

function StepMenu({
    cart,
    onAdd,
    onRemove,
    onNext,
    onBack,
}: {
    cart: StaffCartItem[];
    onAdd: (item: MenuItem) => void;
    onRemove: (id: string) => void;
    onNext: () => void;
    onBack: () => void;
}) {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const searchRef = useRef<HTMLInputElement>(null);

    const filtered = useMemo(() => {
        let items = sampleMenuItems;
        if (category !== 'all') items = items.filter(i => i.category === category);
        if (search.trim()) {
            const q = search.toLowerCase();
            items = items.filter(i => i.name.toLowerCase().includes(q));
        }
        return items;
    }, [search, category]);

    const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

    const getQty = (id: string) => cart.find(c => c.id === id)?.quantity ?? 0;

    const canProceed = cartCount > 0;

    return (
        <div className="flex flex-col gap-4">

            {/* Search */}
            <Input
                type="search"
                placeholder="Search menu..."
                value={search}
                onChange={val => { setSearch(val); setCategory('all'); }}
                leftIcon={<MagnifyingGlassIcon size={20} weight="bold" />}
                clearable
            />

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {menuCategories.map(cat => (
                    <button
                        key={cat.id}
                        type="button"
                        onClick={() => { setCategory(cat.id); setSearch(''); }}
                        className={`
              shrink-0 px-4 py-1.5 rounded-full text-sm font-medium font-body
              border transition-all duration-150 cursor-pointer
              ${category === cat.id
                                ? 'bg-primary text-brand-darker border-primary'
                                : 'border-brown-light/25 text-neutral-gray hover:text-text-dark dark:hover:text-text-light hover:border-brown-light/50'
                            }
            `}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Menu items */}
            <div className="flex flex-col gap-1.5">
                {filtered.length === 0 && (
                    <p className="text-neutral-gray text-sm font-body text-center py-8">No items found.</p>
                )}
                {filtered.map(item => {
                    const qty = getQty(item.id);
                    return (
                        <div
                            key={item.id}
                            className={`
                flex items-center justify-between px-4 py-3 rounded-2xl border
                transition-colors duration-150
                ${qty > 0 ? 'border-primary/40 bg-primary/5' : 'border-brown-light/20'}
              `}
                        >
                            <div className="min-w-0 flex-1">
                                <p className="text-text-dark dark:text-text-light text-sm font-medium font-body">{item.name}</p>
                                <p className="text-neutral-gray text-xs font-body">from {formatGHS(getBasePrice(item))}</p>
                            </div>

                            {/* Qty controls */}
                            <div className="flex items-center gap-2 shrink-0">
                                {qty > 0 ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => onRemove(item.id)}
                                            className="w-8 h-8 rounded-full border border-brown-light/30 flex items-center justify-center text-neutral-gray hover:text-error hover:border-error/50 transition-colors cursor-pointer"
                                        >
                                            <MinusIcon size={14} weight="bold" />
                                        </button>
                                        <span className="text-text-dark dark:text-text-light text-sm font-bold font-body w-5 text-center">{qty}</span>
                                        <button
                                            type="button"
                                            onClick={() => onAdd(item)}
                                            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-brand-darker hover:bg-primary-hover transition-colors cursor-pointer"
                                        >
                                            <PlusIcon size={14} weight="bold" />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => onAdd(item)}
                                        className="w-8 h-8 rounded-full border border-brown-light/30 flex items-center justify-center text-neutral-gray hover:text-primary hover:border-primary transition-colors cursor-pointer"
                                    >
                                        <PlusIcon size={14} weight="bold" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Cart summary sticky footer */}
            <div className="sticky bottom-0 pt-4 pb-2 bg-brand-darker">
                <div className={`rounded-2xl p-4 border transition-all duration-200 ${canProceed ? 'border-primary/40 bg-brown' : 'border-brown-light/20 bg-brown/60'}`}>
                    {canProceed ? (
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-text-light text-sm font-semibold font-body">
                                    {cartCount} item{cartCount > 1 ? 's' : ''} &mdash; {formatGHS(cartTotal)}
                                </p>
                                <p className="text-neutral-gray text-xs font-body">Subtotal, excl. delivery</p>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={onBack} className="px-4 py-2.5 rounded-full border border-brown-light/30 text-neutral-gray text-sm font-body hover:text-text-light transition-colors cursor-pointer">
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={onNext}
                                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-brand-darker text-sm font-semibold font-body transition-colors cursor-pointer"
                                >
                                    Customer <CaretRightIcon size={14} weight="bold" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-neutral-gray text-sm font-body text-center">Add at least one item to continue.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Step 3: Customer details ─────────────────────────────────────────────────

function StepCustomer({
    details,
    orderType,
    onDetails,
    onOrderType,
    onNext,
    onBack,
}: {
    details: CustomerDetails;
    orderType: OrderType;
    onDetails: (d: Partial<CustomerDetails>) => void;
    onOrderType: (t: OrderType) => void;
    onNext: () => void;
    onBack: () => void;
}) {
    const [showEmail, setShowEmail] = useState(!!details.email);
    const [showNotes, setShowNotes] = useState(!!details.notes);
    const [errors, setErrors] = useState<Partial<CustomerDetails>>({});

    const validate = () => {
        const e: Partial<CustomerDetails> = {};
        if (!details.name.trim()) e.name = 'Customer name is required';
        if (!details.phone.trim()) e.phone = 'Phone number is required';
        else {
            const digits = details.phone.replace(/\D/g, '');
            if (digits.length < 10) e.phone = 'Enter a valid phone number';
        }
        if (orderType === 'delivery' && !details.address.trim()) {
            e.address = 'Delivery address is required';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = () => {
        if (validate()) onNext();
    };

    return (
        <div className="flex flex-col gap-6">

            {/* Delivery / Pickup toggle */}
            <div>
                <h2 className="text-text-dark dark:text-text-light text-sm font-semibold font-body mb-3">Order type</h2>
                <div className="flex gap-2 p-1 bg-brown rounded-2xl">
                    {(['delivery', 'pickup'] as OrderType[]).map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => onOrderType(t)}
                            className={`
                flex-1 py-2.5 rounded-xl text-sm font-semibold font-body capitalize
                transition-all duration-150 cursor-pointer
                ${orderType === t
                                    ? 'bg-primary text-brand-darker shadow-sm'
                                    : 'text-neutral-gray hover:text-text-light'
                                }
              `}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Name */}
            <Input
                label="Customer Name"
                placeholder="Full name"
                value={details.name}
                onChange={v => { onDetails({ name: v }); setErrors(e => ({ ...e, name: undefined })); }}
                leftIcon={<UserIcon size={20} weight="bold" />}
                errorText={errors.name}
                required
                autoComplete="off"
            />

            {/* Phone */}
            <div>
                <Input
                    label="Phone Number"
                    type="tel"
                    placeholder="024 XXX XXXX"
                    value={details.phone}
                    onChange={v => {
                        onDetails({ phone: formatPhone(v) });
                        setErrors(e => ({ ...e, phone: undefined }));
                    }}
                    leftIcon={<DeviceMobileIcon size={20} weight="bold" />}
                    errorText={errors.phone}
                    required
                    autoComplete="off"
                />
                <p className="text-neutral-gray text-xs font-body mt-1.5 px-1">
                    Customer will receive SMS updates on this number.
                </p>
            </div>

            {/* Address — delivery only */}
            {orderType === 'delivery' && (
                <div>
                    <Input
                        label="Delivery Address"
                        placeholder="Start typing address..."
                        value={details.address}
                        onChange={v => { onDetails({ address: v }); setErrors(e => ({ ...e, address: undefined })); }}
                        leftIcon={<MapPinIcon size={20} weight="bold" />}
                        errorText={errors.address}
                        required
                        autoComplete="off"
                    />
                    <p className="text-neutral-gray text-xs font-body mt-1.5 px-1">
                        Address autocomplete active when Google Maps is available.
                        {/* TODO: wire AddressSearchField component here for full autocomplete */}
                    </p>
                </div>
            )}

            {/* Email — optional, collapsed */}
            {showEmail ? (
                <Input
                    label="Email Address"
                    type="email"
                    placeholder="customer@email.com"
                    value={details.email}
                    onChange={v => onDetails({ email: v })}
                    leftIcon={<EnvelopeIcon size={20} weight="bold" />}
                    helperText="Optional — for order confirmation"
                    autoComplete="off"
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setShowEmail(true)}
                    className="flex items-center gap-2 text-neutral-gray hover:text-primary text-sm font-body transition-colors cursor-pointer w-fit"
                >
                    <PlusIcon size={16} weight="bold" />
                    Add email address (optional)
                </button>
            )}

            {/* Notes — optional, collapsed */}
            {showNotes ? (
                <div>
                    <label className="block text-sm font-medium text-text-dark dark:text-text-light font-body mb-1.5">
                        Order Notes
                    </label>
                    <div className="relative">
                        <NoteIcon size={20} weight="bold" className="absolute left-4 top-3.5 text-neutral-gray pointer-events-none" />
                        <textarea
                            value={details.notes}
                            onChange={e => onDetails({ notes: e.target.value })}
                            placeholder="Special instructions from customer..."
                            maxLength={200}
                            rows={3}
                            className="
                w-full pl-12 pr-4 py-3
                bg-neutral-light dark:bg-brand-dark
                border-2 border-neutral-gray/50 focus:border-primary
                rounded-2xl text-text-dark dark:text-text-light
                placeholder:text-neutral-gray
                text-sm font-body
                outline-none resize-none transition-colors duration-150
              "
                        />
                        <span className="absolute bottom-2.5 right-3 text-xs text-neutral-gray font-body">
                            {details.notes.length}/200
                        </span>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setShowNotes(true)}
                    className="flex items-center gap-2 text-neutral-gray hover:text-primary text-sm font-body transition-colors cursor-pointer w-fit"
                >
                    <PlusIcon size={16} weight="bold" />
                    Add order notes (optional)
                </button>
            )}

            {/* Nav buttons */}
            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-5 py-3.5 rounded-full border border-brown-light/30 text-neutral-gray text-sm font-body hover:text-text-light transition-colors cursor-pointer"
                >
                    <CaretLeftIcon size={14} weight="bold" /> Back
                </button>
                <button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-brand-darker font-semibold font-body py-3.5 rounded-full transition-colors cursor-pointer text-sm"
                >
                    Review & Pay <CaretRightIcon size={14} weight="bold" />
                </button>
            </div>
        </div>
    );
}

// ─── Step 4: Review & Pay ─────────────────────────────────────────────────────

function StepReview({
    cart,
    customer,
    orderType,
    source,
    branchId,
    payment,
    onPayment,
    onSubmit,
    onBack,
    isSubmitting,
}: {
    cart: StaffCartItem[];
    customer: CustomerDetails;
    orderType: OrderType;
    source: OrderSource;
    branchId: string;
    payment: PaymentMethod | null;
    onPayment: (p: PaymentMethod) => void;
    onSubmit: () => void;
    onBack: () => void;
    isSubmitting: boolean;
}) {
    const branch = BRANCHES.find(b => b.id === branchId);
    const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const deliveryFee = orderType === 'delivery' ? (branch?.deliveryFee ?? 0) : 0;
    const total = cartTotal + deliveryFee;

    const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; sub: string; icon: React.ElementType; only?: OrderType }[] = [
        { id: 'momo', label: 'Mobile Money', sub: 'MTN, Telecel, AirtelTigo', icon: DeviceMobileIcon },
        { id: 'cash_delivery', label: 'Cash on Delivery', sub: 'Paid when delivered', icon: MoneyIcon, only: 'delivery' },
        { id: 'cash_pickup', label: 'Cash at Pickup', sub: 'Paid at branch', icon: HandCoinsIcon, only: 'pickup' },
    ];

    const availablePayments = PAYMENT_OPTIONS.filter(p => !p.only || p.only === orderType);

    const sourceLabel = ORDER_SOURCES.find(s => s.id === source)?.label ?? source;

    return (
        <div className="flex flex-col gap-6">

            {/* Order summary */}
            <div className="bg-brown border border-brown-light/15 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-brown-light/15 flex items-center justify-between">
                    <p className="text-text-light text-sm font-semibold font-body">Order Summary</p>
                    <span className="text-[10px] font-medium text-neutral-gray bg-brown-light/10 border border-brown-light/20 px-2 py-0.5 rounded-full font-body">
                        via {sourceLabel}
                    </span>
                </div>

                {/* Items */}
                <div className="px-4 py-3 flex flex-col gap-2 border-b border-brown-light/15">
                    {cart.map(item => (
                        <div key={item.id} className="flex items-center justify-between">
                            <span className="text-text-light text-sm font-body">
                                {item.quantity}× {item.name}
                            </span>
                            <span className="text-neutral-gray text-sm font-body">
                                {formatGHS(item.price * item.quantity)}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Totals */}
                <div className="px-4 py-3 flex flex-col gap-1.5">
                    <div className="flex justify-between text-sm font-body">
                        <span className="text-neutral-gray">Subtotal</span>
                        <span className="text-text-light">{formatGHS(cartTotal)}</span>
                    </div>
                    {orderType === 'delivery' && (
                        <div className="flex justify-between text-sm font-body">
                            <span className="text-neutral-gray">Delivery ({branch?.name})</span>
                            <span className="text-text-light">{formatGHS(deliveryFee)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-base font-semibold font-body pt-1 border-t border-brown-light/15 mt-1">
                        <span className="text-text-light">Total</span>
                        <span className="text-primary">{formatGHS(total)}</span>
                    </div>
                </div>
            </div>

            {/* Customer summary */}
            <div className="bg-brown border border-brown-light/15 rounded-2xl px-4 py-4 flex flex-col gap-2">
                <p className="text-text-light text-sm font-semibold font-body mb-1">Customer</p>
                <div className="flex items-center gap-2">
                    <UserIcon size={14} className="text-neutral-gray shrink-0" />
                    <span className="text-text-light text-sm font-body">{customer.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <DeviceMobileIcon size={14} className="text-neutral-gray shrink-0" />
                    <span className="text-text-light text-sm font-body">{customer.phone}</span>
                </div>
                {orderType === 'delivery' && (
                    <div className="flex items-start gap-2">
                        <MapPinIcon size={14} className="text-neutral-gray shrink-0 mt-0.5" />
                        <span className="text-text-light text-sm font-body">{customer.address}</span>
                    </div>
                )}
                {orderType === 'pickup' && (
                    <div className="flex items-center gap-2">
                        <MapPinIcon size={14} className="text-neutral-gray shrink-0" />
                        <span className="text-text-light text-sm font-body">Pickup at {branch?.name}</span>
                    </div>
                )}
                {customer.notes && (
                    <div className="flex items-start gap-2 mt-1 pt-2 border-t border-brown-light/15">
                        <NoteIcon size={14} className="text-neutral-gray shrink-0 mt-0.5" />
                        <span className="text-neutral-gray text-xs font-body italic">{customer.notes}</span>
                    </div>
                )}
            </div>

            {/* Payment method */}
            <div>
                <h2 className="text-text-dark dark:text-text-light text-sm font-semibold font-body mb-3">Payment Method</h2>
                <div className="flex flex-col gap-2">
                    {availablePayments.map(({ id, label, sub, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onPayment(id)}
                            className={`
                flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left
                transition-all duration-150 cursor-pointer
                ${payment === id
                                    ? 'border-primary bg-primary/10'
                                    : 'border-brown-light/20 hover:border-brown-light/40'
                                }
              `}
                        >
                            <Icon
                                size={22}
                                weight={payment === id ? 'fill' : 'regular'}
                                className={payment === id ? 'text-primary shrink-0' : 'text-neutral-gray shrink-0'}
                            />
                            <div>
                                <p className={`text-sm font-semibold font-body ${payment === id ? 'text-text-dark dark:text-primary' : 'text-text-dark dark:text-text-light'}`}>
                                    {label}
                                </p>
                                <p className="text-neutral-gray text-xs font-body">{sub}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Missing payment warning */}
            {!payment && (
                <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-xl px-4 py-2.5">
                    <WarningCircleIcon size={16} weight="fill" className="text-warning shrink-0" />
                    <p className="text-warning text-xs font-body">Select a payment method to place the order.</p>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onBack}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-5 py-3.5 rounded-full border border-brown-light/30 text-neutral-gray text-sm font-body hover:text-text-light disabled:opacity-40 transition-colors cursor-pointer"
                >
                    <CaretLeftIcon size={14} weight="bold" /> Back
                </button>
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={!payment || isSubmitting}
                    className="
            flex-1 flex items-center justify-center gap-2
            bg-primary hover:bg-primary-hover
            disabled:opacity-40 disabled:cursor-not-allowed
            text-brand-darker font-semibold font-body py-3.5 rounded-full
            transition-all duration-150 cursor-pointer text-sm
          "
                >
                    {isSubmitting ? (
                        <><SpinnerIcon size={18} weight="bold" className="animate-spin" /> Placing Order...</>
                    ) : (
                        <>Place Order &mdash; {formatGHS(total)}</>
                    )}
                </button>
            </div>
        </div>
    );
}

// ─── Confirmation screen ──────────────────────────────────────────────────────

function OrderConfirmed({
    orderCode,
    branchId,
    onNewOrder,
}: {
    orderCode: string;
    branchId: string;
    onNewOrder: () => void;
}) {
    const branch = BRANCHES.find(b => b.id === branchId);

    return (
        <div className="flex flex-col items-center text-center gap-6 py-8">
            <div className="w-16 h-16 rounded-full bg-secondary/15 flex items-center justify-center">
                <CheckCircleIcon size={40} weight="fill" className="text-secondary" />
            </div>

            <div>
                <h2 className="text-text-dark dark:text-text-light text-xl font-bold font-body">Order Placed</h2>
                <p className="text-neutral-gray text-sm font-body mt-1">
                    {branch?.name} branch has been notified.
                </p>
            </div>

            <div className="bg-brown border border-brown-light/15 rounded-2xl px-8 py-5 w-full">
                <p className="text-neutral-gray text-xs font-body mb-1">Order Number</p>
                <p className="text-primary text-3xl font-bold font-body tracking-wider">{orderCode}</p>
                <p className="text-neutral-gray text-xs font-body mt-2 flex items-center justify-center gap-1">
                    <ClockIcon size={12} weight="fill" />
                    Customer SMS sent with this code
                </p>
            </div>

            <div className="flex flex-col gap-2 w-full">
                <button
                    type="button"
                    onClick={onNewOrder}
                    className="w-full bg-primary hover:bg-primary-hover text-brand-darker font-semibold font-body py-4 rounded-full transition-colors cursor-pointer text-sm"
                >
                    Create Another Order
                </button>
                <a
                    href="/staff/orders"
                    className="w-full border border-brown-light/25 text-neutral-gray hover:text-text-light font-body py-4 rounded-full transition-colors text-sm text-center block"
                >
                    View All Orders
                </a>
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NewOrderPage() {
    const router = useRouter();

    // Step state
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

    // Step 1 state
    const [source, setSource] = useState<OrderSource | null>(null);
    const [branchId, setBranchId] = useState<string | null>(null);

    // Step 2 state — local cart, separate from customer CartProvider
    const [cart, setCart] = useState<StaffCartItem[]>([]);

    // Step 3 state
    const [orderType, setOrderType] = useState<OrderType>('delivery');
    const [customer, setCustomer] = useState<CustomerDetails>({
        name: '', phone: '', email: '', address: '', notes: '',
    });

    // Step 4 state
    const [payment, setPayment] = useState<PaymentMethod | null>(null);

    // Submission state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderCode, setOrderCode] = useState<string | null>(null);

    // ── Cart handlers ──
    const handleAddItem = useCallback((item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(c => c.id === item.id);
            if (existing) {
                return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
            }
            return [...prev, { id: item.id, name: item.name, price: getBasePrice(item), quantity: 1, category: item.category }];
        });
    }, []);

    const handleRemoveItem = useCallback((id: string) => {
        setCart(prev => {
            const existing = prev.find(c => c.id === id);
            if (!existing) return prev;
            if (existing.quantity === 1) return prev.filter(c => c.id !== id);
            return prev.map(c => c.id === id ? { ...c, quantity: c.quantity - 1 } : c);
        });
    }, []);

    // ── Reset for new order ──
    const handleNewOrder = () => {
        setStep(1);
        setSource(null);
        setBranchId(null);
        setCart([]);
        setOrderType('delivery');
        setCustomer({ name: '', phone: '', email: '', address: '', notes: '' });
        setPayment(null);
        setOrderCode(null);
    };

    // ── Submit ──
    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // TODO: replace with real API call ──────────────────────────────────────
            // const res = await fetch('/api/v1/staff/orders', {
            //   method: 'POST',
            //   credentials: 'include',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify({
            //     source, branchId, orderType,
            //     items: cart.map(i => ({ id: i.id, quantity: i.quantity })),
            //     customer, payment,
            //   }),
            // });
            // const { data } = await res.json();
            // setOrderCode(data.orderCode);
            // ────────────────────────────────────────────────────────────────────────

            await new Promise(r => setTimeout(r, 2000)); // remove when API is live
            setOrderCode(generateOrderCode());
        } catch {
            // Handle error — show toast or inline error
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── If confirmed, show confirmation ──
    if (orderCode && branchId) {
        return (
            <div className="h-full overflow-y-auto">
                <div className="px-4 md:px-8 py-6 max-w-lg mx-auto">
                    <OrderConfirmed
                        orderCode={orderCode}
                        branchId={branchId}
                        onNewOrder={handleNewOrder}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className=" flex h-screen flex-col">

            {/* ── Pinned header ─────────────────────────────────────────────────── */}
            <div className="shrink-0 px-4 bg-red-20 md:px-8 pt-6 pb-0 max-w-lg mx-auto w-full">

                {/* Page header */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        type="button"
                        onClick={() => step > 1 ? setStep(s => (s - 1) as 1 | 2 | 3 | 4) : router.push('/staff/dashboard')}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-brown-light/25 text-neutral-gray hover:text-text-light hover:border-brown-light/50 transition-colors cursor-pointer shrink-0"
                    >
                        <CaretLeftIcon size={16} weight="bold" />
                    </button>
                    <div>
                        <h1 className="text-text-dark dark:text-text-light text-lg font-bold font-body leading-none">New Order</h1>
                        <p className="text-neutral-gray text-xs font-body mt-0.5">
                            Step {step} of 4
                        </p>
                    </div>
                </div>

                {/* Step indicator */}
                <StepIndicator current={step} />

            </div>

            {/* ── Scrollable step content ────────────────────────────────────────── */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="px-4 md:px-8 pb-6 max-w-lg mx-auto">

                    {step === 1 && (
                        <StepSetup
                            source={source}
                            branchId={branchId}
                            onSource={setSource}
                            onBranch={setBranchId}
                            onNext={() => setStep(2)}
                        />
                    )}

                    {step === 2 && (
                        <StepMenu
                            cart={cart}
                            onAdd={handleAddItem}
                            onRemove={handleRemoveItem}
                            onNext={() => setStep(3)}
                            onBack={() => setStep(1)}
                        />
                    )}

                    {step === 3 && (
                        <StepCustomer
                            details={customer}
                            orderType={orderType}
                            onDetails={patch => setCustomer(prev => ({ ...prev, ...patch }))}
                            onOrderType={setOrderType}
                            onNext={() => setStep(4)}
                            onBack={() => setStep(2)}
                        />
                    )}

                    {step === 4 && source && branchId && (
                        <StepReview
                            cart={cart}
                            customer={customer}
                            orderType={orderType}
                            source={source}
                            branchId={branchId}
                            payment={payment}
                            onPayment={setPayment}
                            onSubmit={handleSubmit}
                            onBack={() => setStep(3)}
                            isSubmitting={isSubmitting}
                        />
                    )}

                </div>
            </div>

        </div>
    );
}
