'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    PhoneIcon,
    WhatsappLogoIcon,
    ShareNetworkIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    MinusIcon,
    XIcon,
    UserIcon,
    DeviceMobileIcon,
    MapPinIcon,
    MoneyIcon,
    HandCoinsIcon,
    ProhibitIcon,
    SpinnerIcon,
    CheckCircleIcon,
    CaretLeftIcon,
    NoteIcon,
    TruckIcon,
    StorefrontIcon,
} from '@phosphor-icons/react';
import { useNewOrder } from './context';
import { useStaffRoutes } from '@/app/components/providers/StaffAuthProvider';
import { BRANCHES } from '@/app/components/providers/BranchProvider';
import { sampleMenuItems, menuCategories } from '@/lib/data/SampleMenu';
import type { MenuItem, MenuItemSize } from '@/lib/data/SampleMenu';
import type { OrderSource, PaymentMethod } from '@/types/order';
import { formatGHS, ORDER_SOURCES } from './utils';
import OrderConfirmed from './steps/OrderConfirmed';

// ─── Display row — one per orderable option ───────────────────────────────────

interface DisplayRow {
    key: string;
    name: string;          // e.g. "Small Jollof Rice" or "Jollof Rice (Plain)"
    price: number;
    menuItemId: string;
    variantKey: string;
    variantLabel?: string; // e.g. "Small", "Plain"
    originalItem: MenuItem;
    isNew?: boolean;
}

function expandItem(item: MenuItem): DisplayRow[] {
    if (item.sizes && item.sizes.length > 0) {
        return item.sizes.map((size: MenuItemSize) => ({
            key: `${item.id}|${size.key}`,
            name: `${size.label} ${item.name}`,
            price: size.price,
            menuItemId: item.id,
            variantKey: size.key,
            variantLabel: size.label,
            originalItem: item,
            isNew: item.isNew,
        }));
    }
    if (item.hasVariants && item.variants) {
        const rows: DisplayRow[] = [];
        if (item.variants.plain !== undefined)
            rows.push({ key: `${item.id}|plain`, name: `${item.name} (Plain)`, price: item.variants.plain, menuItemId: item.id, variantKey: 'plain', variantLabel: 'Plain', originalItem: item, isNew: item.isNew });
        if (item.variants.assorted !== undefined)
            rows.push({ key: `${item.id}|assorted`, name: `${item.name} (Assorted)`, price: item.variants.assorted, menuItemId: item.id, variantKey: 'assorted', variantLabel: 'Assorted', originalItem: item, isNew: item.isNew });
        return rows;
    }
    if (item.price !== undefined)
        return [{ key: item.id, name: item.name, price: item.price, menuItemId: item.id, variantKey: item.id, originalItem: item, isNew: item.isNew }];
    return [];
}

// ─── Branch abbreviations ─────────────────────────────────────────────────────

const BRANCH_ABBR: Record<string, string> = {
    osu: 'OS', 'east-legon': 'EL', spintex: 'SP',
    tema: 'TM', madina: 'MD', 'la-paz': 'LP', dzorwulu: 'DZ',
};

// ─── Source icon map ──────────────────────────────────────────────────────────

const SOURCE_ICONS: Record<OrderSource, React.ElementType> = {
    phone: PhoneIcon,
    whatsapp: WhatsappLogoIcon,
    social_media: ShareNetworkIcon,
    online: MagnifyingGlassIcon,
    pos: StorefrontIcon,
};

// ─── Payment options ──────────────────────────────────────────────────────────

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; icon: React.ElementType; deliveryOnly?: boolean; pickupOnly?: boolean }[] = [
    { id: 'momo', label: 'MoMo', icon: DeviceMobileIcon },
    { id: 'cash', label: 'Cash', icon: MoneyIcon },
    { id: 'no_charge', label: 'No Charge', icon: ProhibitIcon },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function NewOrderFlow() {
    const router = useRouter();
    const { dashboard } = useStaffRoutes();
    const {
        source, branchId, cart, orderType, customer, payment,
        isSubmitting, orderCode,
        setSource, setBranchId,
        addItem, removeItem, clearItem,
        setOrderType, patchCustomer, setPayment,
        submit, resetOrder,
    } = useNewOrder();

    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');

    // ── Derived menu rows ───────────────────────────────────────────────────

    const allRows = useMemo(() => sampleMenuItems.flatMap(expandItem), []);

    const filteredRows = useMemo(() => {
        const q = search.toLowerCase();
        return allRows.filter(row => {
            const matchesSearch = !q || row.name.toLowerCase().includes(q) || row.originalItem.name.toLowerCase().includes(q);
            const matchesCategory = search
                ? true
                : activeCategory === 'all'
                    ? row.originalItem.popular
                    : row.originalItem.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [allRows, search, activeCategory]);

    // ── Cart calculations ───────────────────────────────────────────────────

    const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const branch = BRANCHES.find(b => b.id === branchId);
    const deliveryFee = orderType === 'delivery' ? (branch?.deliveryFee ?? 15) : 0;
    const total = subtotal + deliveryFee;
    const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

    // ── Handlers ────────────────────────────────────────────────────────────

    const handleRowTap = useCallback((row: DisplayRow) => {
        addItem(row.originalItem, row.variantKey, row.price, row.variantLabel);
    }, [addItem]);

    const handleRowMinus = useCallback((row: DisplayRow) => {
        const cartKey = `${row.menuItemId}|${row.variantKey}`;
        removeItem(cartKey);
    }, [removeItem]);

    const getCartQty = useCallback((row: DisplayRow): number => {
        const cartKey = `${row.menuItemId}|${row.variantKey}`;
        return cart.find(c => c.cartKey === cartKey)?.quantity ?? 0;
    }, [cart]);

    // ── Order confirmed screen ──────────────────────────────────────────────

    if (orderCode) {
        return (
            <div className="h-screen overflow-y-auto">
                <div className="px-4 md:px-8 py-6 max-w-lg mx-auto">
                    <OrderConfirmed />
                </div>
            </div>
        );
    }

    // ── Main layout ─────────────────────────────────────────────────────────

    return (
        <div className="flex h-screen bg-neutral-light overflow-hidden">

            {/* ── Left sidebar: source + branch ──────────────────────────── */}
            <div className="shrink-0 w-16 flex flex-col items-center gap-1 py-4 bg-card border-r border-brown-light/15 overflow-y-auto">

                {/* Back */}
                <button
                    onClick={() => router.push(dashboard)}
                    className="w-10 h-10 mb-2 flex items-center justify-center rounded-xl text-neutral-gray hover:text-text-light hover:bg-brown-light/75 transition-colors"
                >
                    <CaretLeftIcon className="w-4 h-4" weight="bold" />
                </button>

                {/* Source */}
                <p className="text-[9px] text-neutral-gray font-bold uppercase tracking-widest mb-1">Source</p>
                {ORDER_SOURCES.map(s => {
                    const Icon = SOURCE_ICONS[s.id] ?? ShareNetworkIcon;
                    return (
                        <button
                            key={s.id}
                            onClick={() => setSource(s.id)}
                            title={s.label}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${source === s.id
                                ? 'bg-primary text-brown'
                                : 'text-neutral-gray hover:text-text-light hover:bg-brown-light/75'
                                }`}
                        >
                            <Icon className="w-5 h-5" />
                        </button>
                    );
                })}

                <div className="w-8 border-t border-brown-light/15 my-2" />

                {/* Branch */}
                <p className="text-[9px] text-neutral-gray font-bold uppercase tracking-widest mb-1">Branch</p>
                {BRANCHES.filter(b => b.isOpen).map(b => {
                    const abbr = BRANCH_ABBR[b.id] ?? b.name.slice(0, 2).toUpperCase();
                    return (
                        <button
                            key={b.id}
                            onClick={() => setBranchId(b.id)}
                            title={b.name}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl text-xs font-bold transition-all ${branchId === b.id
                                ? 'bg-secondary text-white'
                                : 'text-neutral-gray hover:text-text-light hover:bg-brown-light/75'
                                }`}
                        >
                            {abbr}
                        </button>
                    );
                })}
            </div>

            {/* ── Center: customer info + menu ───────────────────────────── */}
            <div className="flex flex-col flex-1 min-w-0 border-r border-neutral-gray/15">

                {/* Customer info — always at top */}
                <div className="shrink-0 px-4 py-3 bg-white border-b border-neutral-gray/15 flex gap-2">
                    <div className="relative flex-1">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-gray" />
                        <input
                            type="text"
                            placeholder="Customer name"
                            value={customer.name}
                            onChange={e => patchCustomer({ name: e.target.value })}
                            className="w-full h-10 pl-9 pr-3 rounded-xl bg-neutral-light text-text-dark placeholder:text-neutral-gray/60 border border-neutral-gray/20 focus:border-primary/50 outline-none text-sm transition-colors"
                        />
                    </div>
                    <div className="relative flex-1">
                        <DeviceMobileIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-gray" />
                        <input
                            type="tel"
                            placeholder="Phone number"
                            value={customer.phone}
                            onChange={e => patchCustomer({ phone: e.target.value })}
                            className="w-full h-10 pl-9 pr-3 rounded-xl bg-neutral-light text-text-dark placeholder:text-neutral-gray/60 border border-neutral-gray/20 focus:border-primary/50 outline-none text-sm transition-colors"
                        />
                    </div>
                </div>

                {/* Search */}
                <div className="shrink-0 px-4 py-2 bg-white border-b border-neutral-gray/15">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-gray" />
                        <input
                            type="search"
                            placeholder="Search items..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full h-9 pl-9 pr-3 rounded-xl bg-neutral-light text-text-dark placeholder:text-neutral-gray/60 border border-neutral-gray/20 focus:border-primary/50 outline-none text-sm transition-colors"
                        />
                    </div>
                </div>

                {/* Category tabs */}
                {!search && (
                    <div className="shrink-0 flex gap-1.5 px-4 py-2 overflow-x-auto bg-white border-b border-neutral-gray/15 custom-scrollbar2">
                        {menuCategories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeCategory === cat.id
                                    ? 'bg-primary text-brown'
                                    : 'bg-neutral-light text-neutral-gray hover:bg-neutral-gray/20'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Item list — flat rows, one per variant */}
                <div className="flex-1 overflow-y-auto custom-scrollbar2">
                    {filteredRows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-neutral-gray">
                            <MagnifyingGlassIcon className="w-10 h-10 mb-3 opacity-40" />
                            <p className="text-sm">No items found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-neutral-gray/10">
                            {filteredRows.map(row => {
                                const qty = getCartQty(row);
                                return (
                                    <div key={row.key} className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${qty > 0 ? 'bg-primary/5' : 'hover:bg-neutral-gray/5'}`}>
                                        <div onClick={() => handleRowTap(row)} className="flex-1 min-w-0">
                                            <p className={`text-sm font-semibold truncate ${qty > 0 ? 'text-primary' : 'text-text-dark'}`}>
                                                {row.name}
                                                {row.isNew && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-primary text-brown font-bold align-middle">NEW</span>}
                                            </p>
                                            <p className="text-xs text-neutral-gray">{formatGHS(row.price)}</p>
                                        </div>
                                        {qty > 0 ? (
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    onClick={() => handleRowMinus(row)}
                                                    className="w-7 h-7 rounded-lg bg-neutral-gray/15 flex items-center justify-center text-text-dark hover:bg-neutral-gray/25 active:scale-95 transition-all"
                                                >
                                                    <MinusIcon className="w-3.5 h-3.5" />
                                                </button>
                                                <span className="w-5 text-center text-sm font-bold text-text-dark">{qty}</span>
                                                <button
                                                    onClick={() => handleRowTap(row)}
                                                    className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-brown hover:bg-primary-hover active:scale-95 transition-all"
                                                >
                                                    <PlusIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleRowTap(row)}
                                                className="shrink-0 w-8 h-8 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center active:scale-95 transition-all"
                                            >
                                                <PlusIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Right panel: cart + fulfillment + payment + submit ──────── */}
            <div className="shrink-0 w-72 flex flex-col bg-white border-l border-neutral-gray/15">

                {/* Cart header */}
                <div className="shrink-0 px-4 py-3 border-b border-neutral-gray/15 flex items-center justify-between">
                    <span className="font-semibold text-text-dark text-sm">Order</span>
                    {cartCount > 0 && (
                        <span className="text-xs text-primary font-medium">{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
                    )}
                </div>

                {/* Cart items */}
                <div className="flex-1 overflow-y-auto custom-scrollbar2 px-3 py-2 space-y-1">
                    {cart.length === 0 ? (
                        <p className="text-neutral-gray text-sm text-center pt-8">No items yet</p>
                    ) : (
                        cart.map(item => (
                            <div key={item.cartKey} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-light group">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-text-dark leading-snug truncate">
                                        {item.variantLabel ? `${item.variantLabel} ${item.name}` : item.name}
                                    </p>
                                    <p className="text-[11px] text-neutral-gray">{item.quantity} × {formatGHS(item.price)}</p>
                                </div>
                                <p className="text-xs font-bold text-text-dark shrink-0">{formatGHS(item.price * item.quantity)}</p>
                                <button
                                    onClick={() => clearItem(item.cartKey)}
                                    className="shrink-0 opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-neutral-gray hover:text-error transition-all"
                                >
                                    <XIcon className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Fulfillment type */}
                <div className="shrink-0 px-4 py-3 border-t border-neutral-gray/15">
                    <div className="flex gap-2 mb-3">
                        {(['delivery', 'pickup'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setOrderType(type)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${orderType === type ? 'bg-primary text-brown' : 'bg-neutral-light text-neutral-gray hover:bg-neutral-gray/20'
                                    }`}
                            >
                                {type === 'delivery' ? <TruckIcon className="w-3.5 h-3.5" /> : <StorefrontIcon className="w-3.5 h-3.5" />}
                                {type === 'delivery' ? 'Delivery' : 'Pickup'}
                            </button>
                        ))}
                    </div>

                    {/* Address — delivery only */}
                    {orderType === 'delivery' && (
                        <div className="relative mb-3">
                            <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-gray" />
                            <input
                                type="text"
                                placeholder="Delivery address"
                                value={customer.address}
                                onChange={e => patchCustomer({ address: e.target.value })}
                                className="w-full h-9 pl-9 pr-3 rounded-xl bg-neutral-light text-text-dark placeholder:text-neutral-gray/60 border border-neutral-gray/20 focus:border-primary/50 outline-none text-xs transition-colors"
                            />
                        </div>
                    )}

                    {/* Notes */}
                    <div className="relative mb-3">
                        <NoteIcon className="absolute left-3 top-2.5 w-4 h-4 text-neutral-gray" />
                        <textarea
                            placeholder="Notes (optional)"
                            value={customer.notes}
                            onChange={e => patchCustomer({ notes: e.target.value })}
                            rows={2}
                            className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-light text-text-dark placeholder:text-neutral-gray/60 border border-neutral-gray/20 focus:border-primary/50 outline-none text-xs resize-none transition-colors"
                        />
                    </div>

                    {/* Payment */}
                    <div className="flex gap-1.5 mb-3">
                        {PAYMENT_OPTIONS.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setPayment(opt.id)}
                                className={`flex-1 flex flex-col items-center py-2 rounded-xl text-[11px] font-medium transition-all ${payment === opt.id
                                    ? 'bg-primary text-brown'
                                    : 'bg-neutral-light text-neutral-gray hover:bg-neutral-gray/20'
                                    }`}
                            >
                                <opt.icon className="w-4 h-4 mb-0.5" />
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Totals */}
                    {cart.length > 0 && (
                        <div className="space-y-1 mb-3 text-xs">
                            <div className="flex justify-between text-neutral-gray">
                                <span>Subtotal</span>
                                <span>{formatGHS(subtotal)}</span>
                            </div>
                            {orderType === 'delivery' && (
                                <div className="flex justify-between text-neutral-gray">
                                    <span>Delivery</span>
                                    <span>{formatGHS(deliveryFee)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-sm text-text-dark pt-1 border-t border-neutral-gray/15">
                                <span>Total</span>
                                <span className="text-primary">{formatGHS(total)}</span>
                            </div>
                        </div>
                    )}

                    {/* Place Order */}
                    <button
                        onClick={submit}
                        disabled={!source || !branchId || !payment || cart.length === 0 || isSubmitting}
                        className="w-full h-11 rounded-xl bg-primary text-brown font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary-hover active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 transition-all"
                    >
                        {isSubmitting ? (
                            <><SpinnerIcon className="w-4 h-4 animate-spin" /> Placing…</>
                        ) : (
                            <><CheckCircleIcon className="w-4 h-4" /> Place Order</>
                        )}
                    </button>

                    {/* Validation hint */}
                    {(!source || !branchId) && cart.length > 0 && (
                        <p className="text-[10px] text-neutral-gray text-center mt-1.5">
                            {!source ? 'Select a source' : 'Select a branch'} to continue
                        </p>
                    )}
                </div>
            </div>

        </div>
    );
}
