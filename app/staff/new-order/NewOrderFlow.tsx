'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    MagnifyingGlassIcon,
    PlusIcon,
    MinusIcon,
    XIcon,
    UserIcon,
    DeviceMobileIcon,
    MapPinIcon,
    MoneyIcon,
    ProhibitIcon,
    SpinnerIcon,
    CheckCircleIcon,
    CaretLeftIcon,
    NoteIcon,
    TruckIcon,
    StorefrontIcon,
    WarningCircleIcon,
    ClockIcon,
} from '@phosphor-icons/react';
import { useNewOrder } from './context';
import { useStaffRoutes } from '@/app/components/providers/StaffAuthProvider';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { useMenuItems } from '@/lib/api/hooks/useMenuItems';
import type { DisplayMenuItem } from '@/lib/api/adapters/menu.adapter';
import type { PaymentMethod } from '@/types/order';
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
    sizeId?: number;       // menu_item_size_id for backend
    originalItem: DisplayMenuItem;
    isNew?: boolean;
}

function expandItem(item: DisplayMenuItem): DisplayRow[] {
    // If item has sizes, always use them (even if it also has variants)
    if (item.sizes && item.sizes.length > 0) {
        return item.sizes.map((size) => ({
            key: `${item.id}|${size.key}`,
            name: `${size.label} ${item.name}`,
            price: size.price,
            menuItemId: item.id,
            variantKey: size.key,
            variantLabel: size.label,
            sizeId: size.id, // Include size ID
            originalItem: item,
            isNew: item.isNew,
        }));
    }
    // Only use variants if there are no sizes (legacy support)
    if (item.hasVariants && item.variants) {
        const rows: DisplayRow[] = [];
        if (item.variants.plain !== undefined)
            rows.push({ 
                key: `${item.id}|plain`, 
                name: `${item.name} (Plain)`, 
                price: item.variants.plain, 
                menuItemId: item.id, 
                variantKey: 'plain', 
                variantLabel: 'Plain', 
                originalItem: item, 
                isNew: item.isNew 
            });
        if (item.variants.assorted !== undefined)
            rows.push({ 
                key: `${item.id}|assorted`, 
                name: `${item.name} (Assorted)`, 
                price: item.variants.assorted, 
                menuItemId: item.id, 
                variantKey: 'assorted', 
                variantLabel: 'Assorted', 
                originalItem: item, 
                isNew: item.isNew 
            });
        return rows;
    }
    // Simple item with just a base price
    if (item.price !== undefined)
        return [{ key: item.id, name: item.name, price: item.price, menuItemId: item.id, variantKey: item.id, originalItem: item, isNew: item.isNew }];
    return [];
}


// ─── Payment options ──────────────────────────────────────────────────────────

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; icon: React.ElementType; deliveryOnly?: boolean; pickupOnly?: boolean }[] = [
    { id: 'mobile_money', label: 'MoMo', icon: DeviceMobileIcon },
    { id: 'cash', label: 'Cash', icon: MoneyIcon },
    { id: 'no_charge', label: 'No Charge', icon: ProhibitIcon },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function NewOrderFlow() {
    const router = useRouter();
    const { dashboard } = useStaffRoutes();
    const { branches } = useBranch();
    const { items: menuItems, categories: menuCategories, isLoading: menuLoading } = useMenuItems();
    const {
        source, branchId, cart, orderType, customer, payment,
        isSubmitting, orderCode, staffUser,
        setSource, setBranchId,
        addItem, removeItem, clearItem,
        setOrderType, patchCustomer, setPayment,
        submit, resetOrder,
    } = useNewOrder();

    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [momoNumber, setMomoNumber] = useState('');
    const [momoStep, setMomoStep] = useState<'idle' | 'awaiting' | 'confirmed'>('idle');

    // Address autocomplete
    const [addressSuggestions, setAddressSuggestions] = useState<{ id: string; label: string; full: string }[]>([]);
    const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
    const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const addressContainerRef = useRef<HTMLDivElement>(null);
    const autocompleteServiceRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.google?.maps?.places && !autocompleteServiceRef.current) {
            autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
        }
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (addressContainerRef.current && !addressContainerRef.current.contains(e.target as Node)) {
                setShowAddressSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fetchAddressSuggestions = useCallback((input: string) => {
        if (input.length < 3) { setAddressSuggestions([]); return; }
        if (autocompleteServiceRef.current) {
            autocompleteServiceRef.current.getPlacePredictions(
                { input, componentRestrictions: { country: 'gh' }, types: ['geocode', 'establishment'] },
                (preds: any[], status: string) => {
                    if (status === 'OK' && preds) {
                        setAddressSuggestions(preds.map(p => ({
                            id: p.place_id,
                            label: p.structured_formatting?.main_text ?? p.description,
                            full: p.description,
                        })));
                    } else {
                        setAddressSuggestions([]);
                    }
                }
            );
        } else {
            fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input + ', Ghana')}&format=json&limit=5`, { headers: { 'Accept-Language': 'en' } })
                .then(r => r.json())
                .then((data: any[]) => setAddressSuggestions(data.map(r => ({
                    id: String(r.place_id),
                    label: r.display_name.split(',')[0],
                    full: r.display_name,
                }))))
                .catch(() => setAddressSuggestions([]));
        }
    }, []);

    const handleAddressChange = useCallback((v: string) => {
        patchCustomer({ address: v });
        setShowAddressSuggestions(true);
        if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
        addressDebounceRef.current = setTimeout(() => fetchAddressSuggestions(v), 300);
    }, [patchCustomer, fetchAddressSuggestions]);

    // Pre-fill MoMo number from customer phone when MoMo is selected
    useEffect(() => {
        if (payment === 'mobile_money' && !momoNumber && customer.phone) {
            console.log('Auto-filling MoMo number:', customer.phone);
            setMomoNumber(customer.phone);
        }
    }, [payment, customer.phone, momoNumber]);

    // ── Derived menu rows ───────────────────────────────────────────────────

    const allRows = useMemo(() => menuItems.flatMap(expandItem), [menuItems]);

    const filteredRows = useMemo(() => {
        const q = search.toLowerCase();
        return allRows.filter(row => {
            const matchesSearch = !q || row.name.toLowerCase().includes(q) || row.originalItem.name.toLowerCase().includes(q);
            const matchesCategory = search
                ? true
                : activeCategory === 'all'
                    ? row.originalItem.popular
                    : row.originalItem.category.toLowerCase().replace(/\s+/g, '-') === activeCategory || row.originalItem.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [allRows, search, activeCategory]);

    // ── Cart calculations ───────────────────────────────────────────────────

    const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const branch = branches.find(b => b.id === branchId);
    const deliveryFee = 0; // Delivery fees temporarily disabled
    const total = subtotal + deliveryFee;
    const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

    // ── Handlers ────────────────────────────────────────────────────────────

    const handleRowTap = useCallback((row: DisplayRow) => {
        addItem(row.originalItem, row.variantKey, row.price, row.variantLabel, row.sizeId);
    }, [addItem]);

    const handleRowMinus = useCallback((row: DisplayRow) => {
        const cartKey = `${row.menuItemId}|${row.variantKey}`;
        removeItem(cartKey);
    }, [removeItem]);

    const getCartQty = useCallback((row: DisplayRow): number => {
        const cartKey = `${row.menuItemId}|${row.variantKey}`;
        return cart.find(c => c.cartKey === cartKey)?.quantity ?? 0;
    }, [cart]);

    // ── Place order handler ─────────────────────────────────────────────────

    const handlePlaceOrder = useCallback(async () => {
        console.log('Place Order clicked:', {
            source,
            branchId,
            payment,
            cartLength: cart.length,
            isSubmitting,
            momoNumber: payment === 'mobile_money' ? momoNumber : 'N/A'
        });
        
        if (payment === 'mobile_money') setMomoStep('awaiting');
        await submit();
    }, [payment, submit, source, branchId, cart.length, isSubmitting, momoNumber]);

    // ── MoMo awaiting screen ────────────────────────────────────────────────

    if (orderCode && momoStep === 'awaiting') {
        return (
            <div className="h-screen flex items-center justify-center bg-neutral-light">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full mx-4 flex flex-col items-center text-center gap-5">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <ClockIcon size={36} weight="fill" className="text-primary animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-text-dark text-lg font-bold">Awaiting MoMo Payment</h2>
                        <p className="text-neutral-gray text-sm mt-1">Prompt sent to</p>
                        <p className="text-text-dark font-bold text-xl mt-0.5 tracking-wide">{momoNumber}</p>
                    </div>
                    <div className="bg-neutral-light rounded-xl px-6 py-3 w-full">
                        <p className="text-neutral-gray text-xs mb-0.5">Order</p>
                        <p className="text-primary font-bold text-2xl tracking-wider">{orderCode}</p>
                    </div>
                    <p className="text-neutral-gray text-xs">Ask the customer to approve the prompt on their phone, then confirm below.</p>
                    <div className="flex flex-col gap-2 w-full">
                        <button
                            onClick={() => setMomoStep('confirmed')}
                            className="w-full h-11 rounded-xl bg-secondary text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-secondary-hover transition-colors"
                        >
                            <CheckCircleIcon className="w-4 h-4" weight="fill" />
                            Payment Received
                        </button>
                        <button
                            onClick={() => { setMomoStep('idle'); resetOrder(); }}
                            className="w-full h-11 rounded-xl bg-neutral-light text-neutral-gray font-medium text-sm flex items-center justify-center gap-2 hover:bg-error/10 hover:text-error transition-colors"
                        >
                            <WarningCircleIcon className="w-4 h-4" />
                            Payment Failed
                        </button>
                    </div>
                </div>
            </div>
        );
    }

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

            {/* ── Center: customer info + menu ───────────────────────────── */}
            <div className="flex flex-col flex-1 min-w-0 border-r border-neutral-gray/15">

                {/* Customer info — always at top */}
                <div className="shrink-0 px-4 py-3 bg-white border-b border-neutral-gray/15 flex gap-2">
                    {/* Back button */}
                    <button
                        onClick={() => router.push(dashboard)}
                        className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-neutral-gray hover:text-text-light hover:bg-brown-light/75 transition-colors"
                    >
                        <CaretLeftIcon className="w-4 h-4" weight="bold" />
                    </button>
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
                                {cat.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Item list — flat rows, one per variant */}
                <div className="flex-1 overflow-y-auto custom-scrollbar2">
                    {menuLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-neutral-gray">
                            <SpinnerIcon className="w-10 h-10 mb-3 animate-spin opacity-60" />
                            <p className="text-sm">Loading menu…</p>
                        </div>
                    ) : filteredRows.length === 0 ? (
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

                    {/* Source */}
                    <div className="flex gap-1.5 mb-3">
                        {ORDER_SOURCES.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setSource(s.id)}
                                className={`flex-1 flex flex-col items-center py-2 rounded-xl text-[11px] font-medium transition-all ${source === s.id
                                    ? 'bg-primary text-brown'
                                    : 'bg-neutral-light text-neutral-gray hover:bg-neutral-gray/20'
                                    }`}
                            >
                                <s.icon className="w-4 h-4 mb-0.5" />
                                {s.label}
                            </button>
                        ))}
                    </div>

                    {/* Branch */}
                    {(() => {
                        const assignedIds = staffUser?.branchIds ?? (staffUser?.branchId ? [staffUser.branchId] : []);
                        const selectableBranches = branches.filter(b => assignedIds.includes(b.id));
                        const isLocked = assignedIds.length <= 1;

                        return isLocked ? (
                            <div className="mb-3 px-3 py-2 rounded-xl bg-neutral-light border border-neutral-gray/20 text-xs text-text-dark">
                                <span className="text-neutral-gray">Branch: </span>
                                <span className="font-medium">{branches.find(b => b.id === branchId)?.name || 'Loading...'}</span>
                            </div>
                        ) : (
                            <div className="mb-3">
                                <select
                                    value={branchId ?? ''}
                                    onChange={e => setBranchId(e.target.value)}
                                    className="w-full h-9 px-3 rounded-xl bg-neutral-light text-text-dark border border-neutral-gray/20 focus:border-primary/50 outline-none text-xs transition-colors"
                                >
                                    <option value="" disabled>Select branch…</option>
                                    {selectableBranches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        );
                    })()}

                    {/* Address — delivery only */}
                    {orderType === 'delivery' && (
                        <div ref={addressContainerRef} className="relative mb-3">
                            <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-gray z-10" />
                            <input
                                type="text"
                                placeholder="Delivery address"
                                value={customer.address}
                                onChange={e => handleAddressChange(e.target.value)}
                                onFocus={() => { if (customer.address.length >= 3) setShowAddressSuggestions(true); }}
                                autoComplete="off"
                                className="w-full h-9 pl-9 pr-3 rounded-xl bg-neutral-light text-text-dark placeholder:text-neutral-gray/60 border border-neutral-gray/20 focus:border-primary/50 outline-none text-xs transition-colors"
                            />
                            {showAddressSuggestions && addressSuggestions.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-neutral-gray/15 overflow-hidden">
                                    {addressSuggestions.map((s, i) => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => { patchCustomer({ address: s.full }); setAddressSuggestions([]); setShowAddressSuggestions(false); }}
                                            className={`w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-primary/5 transition-colors ${i < addressSuggestions.length - 1 ? 'border-b border-neutral-gray/10' : ''}`}
                                        >
                                            <MapPinIcon className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                                            <span className="text-xs text-text-dark truncate">{s.full}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
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

                    {/* MoMo number */}
                    {payment === 'mobile_money' && (
                        <div className="relative mb-3">
                            <DeviceMobileIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                            <input
                                type="tel"
                                placeholder="MoMo number"
                                value={momoNumber}
                                onChange={e => setMomoNumber(e.target.value)}
                                className="w-full h-9 pl-9 pr-3 rounded-xl bg-primary/5 text-text-dark placeholder:text-neutral-gray/60 border border-primary/30 focus:border-primary/60 outline-none text-xs transition-colors"
                            />
                        </div>
                    )}

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
                        onClick={handlePlaceOrder}
                        disabled={!source || !branchId || !payment || cart.length === 0 || isSubmitting || (payment === 'mobile_money' && !momoNumber.trim())}
                        className="w-full h-11 rounded-xl bg-primary text-brown font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary-hover active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 transition-all"
                        title={`Debug: source=${source}, branchId=${branchId}, payment=${payment}, cart=${cart.length}, submitting=${isSubmitting}, momoNumber=${payment === 'mobile_money' ? momoNumber : 'N/A'}`}
                    >
                        {isSubmitting ? (
                            <><SpinnerIcon className="w-4 h-4 animate-spin" /> Placing…</>
                        ) : (
                            <><CheckCircleIcon className="w-4 h-4" /> Place Order</>
                        )}
                    </button>

                    {/* Validation hint */}
                    {((!source || !branchId || (payment === 'mobile_money' && !momoNumber.trim())) && cart.length > 0) && (
                        <p className="text-[10px] text-neutral-gray text-center mt-1.5">
                            {!source ? 'Select a source (Phone/WhatsApp/Social Media)' : 
                             !branchId ? 'Select a branch' : 
                             (payment === 'mobile_money' && !momoNumber.trim()) ? 'Enter MoMo number' : 
                             'Complete all required fields'} to continue
                        </p>
                    )}
                </div>
            </div>

        </div>
    );
}
