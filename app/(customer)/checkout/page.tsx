'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    MapPinIcon, UserIcon, PhoneIcon,
    NoteIcon, TruckIcon, BagIcon, DeviceMobileIcon,
    MoneyIcon, CheckCircleIcon, ArrowRightIcon,
    ArrowLeftIcon, ShoppingBagIcon, PencilSimpleIcon,
    LockIcon, MagnifyingGlassIcon, XIcon, SpinnerGapIcon,
    NavigationArrowIcon, StorefrontIcon, WarningCircleIcon,
    CaretRightIcon, SparkleIcon, UserCircleIcon,
} from '@phosphor-icons/react';
import { useCart, CartItem } from '@/app/components/providers/CartProvider';
import { useBranch, Branch, BranchWithDistance } from '@/app/components/providers/BranchProvider';
import { useLocation } from '@/app/components/providers/LocationProvider';
import { useAuth } from '@/app/components/providers/AuthProvider';
import { useCreateCheckoutSession, useCheckoutSessionStatus, useAbandonCheckoutSession, useRetryPayment, useChangePaymentMethod } from '@/lib/api/hooks/useCheckoutSession';
import PaymentRecoveryActions from '@/app/components/order/PaymentRecoveryActions';
import type { PaymentMethod as UnifiedPaymentMethod, FulfillmentType } from '@/types/order';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';
import apiClient, { ApiError } from '@/lib/api/client';
import { toast } from '@/lib/utils/toast';
import { isValidGhanaPhone, normalizeGhanaPhone } from '@/app/lib/phone';

type OrderType = 'delivery' | 'pickup';
type PaymentMethod = 'mobile_money' | 'cash';
type Step = 1 | 2 | 3 | 4;
type BranchSheetView = 'list' | 'conflict';

interface ContactDetails { name: string; phone: string; address: string; note: string; }

const DELIVERY_FEE = 0; // Delivery fees temporarily disabled

interface ServiceChargeConfig { enabled: boolean; percent: number; cap: number; }
const DEFAULT_SC_CONFIG: ServiceChargeConfig = { enabled: true, percent: 1, cap: 5 };
function calcServiceCharge(subtotal: number, cfg: ServiceChargeConfig): number {
    if (!cfg.enabled || cfg.percent <= 0) return 0;
    const raw = Math.round(subtotal * (cfg.percent / 100) * 100) / 100;
    return cfg.cap > 0 && raw > cfg.cap ? cfg.cap : raw;
}
const formatPrice = (p: number) => `₵${p.toFixed(2)}`;

// ─── Input Field ──────────────────────────────────────────────────────────────
function InputField({ icon, label, required, children }: { icon: React.ReactNode; label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-gray flex items-center gap-1.5">
                {label}{required && <span className="text-error">*</span>}
            </label>
            <div className="relative flex items-center bg-neutral-light dark:bg-brand-dark border-2 border-neutral-gray/50 focus-within:border-primary rounded-xl transition-all overflow-hidden">
                <span className="pl-3.5 text-neutral-gray shrink-0">{icon}</span>
                <div className="flex-1 px-3 py-2.5 text-sm">{children}</div>
            </div>
        </div>
    );
}

// ─── Address Search ───────────────────────────────────────────────────────────
declare global { interface Window { google: any; initGooglePlaces: () => void; } }
interface AddressSuggestion { id: string; mainText: string; secondaryText: string; fullAddress: string; }

function AddressSearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
    const { coordinates } = useLocation();
    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [locating, setLocating] = useState(false);
    const [searching, setSearching] = useState(false);
    const [googleReady, setGoogleReady] = useState(false);
    const autocompleteRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (window.google?.maps?.places) { setGoogleReady(true); return; }
        const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!key) return;
        window.initGooglePlaces = () => setGoogleReady(true);
        if (!document.querySelector('script[data-google-places]')) {
            const s = document.createElement('script');
            s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=initGooglePlaces`;
            s.async = true; s.defer = true; s.dataset.googlePlaces = 'true';
            document.head.appendChild(s);
        }
    }, []);

    useEffect(() => {
        if (googleReady && !autocompleteRef.current)
            autocompleteRef.current = new window.google.maps.places.AutocompleteService();
    }, [googleReady]);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowSuggestions(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const fetchNominatim = useCallback(async (input: string) => {
        if (input.length < 3) { setSuggestions([]); return; }
        setSearching(true);
        try {
            let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input + ', Ghana')}&format=json&limit=6&addressdetails=1`;
            if (coordinates) url += `&viewbox=${coordinates.longitude - 0.3},${coordinates.latitude + 0.3},${coordinates.longitude + 0.3},${coordinates.latitude - 0.3}&bounded=0`;
            const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
            const data: any[] = await res.json();
            setSuggestions(data.map(r => ({
                id: String(r.place_id),
                mainText: r.address?.road ? [r.address.house_number, r.address.road].filter(Boolean).join(' ') : r.display_name.split(',')[0],
                secondaryText: [r.address?.suburb, r.address?.city ?? r.address?.town ?? r.address?.village, r.address?.state].filter(Boolean).join(', '),
                fullAddress: r.display_name,
            })));
        } catch { setSuggestions([]); } finally { setSearching(false); }
    }, [coordinates]);

    const fetchGoogle = useCallback((input: string) => {
        if (!autocompleteRef.current || input.length < 3) { setSuggestions([]); return; }
        setSearching(true);
        const req: any = { input, componentRestrictions: { country: 'gh' }, types: ['geocode', 'establishment'] };
        if (coordinates) req.locationBias = { center: { lat: coordinates.latitude, lng: coordinates.longitude }, radius: 20000 };
        autocompleteRef.current.getPlacePredictions(req, (preds: any[], status: string) => {
            setSearching(false);
            if (status === 'OK' && preds) setSuggestions(preds.map(p => ({ id: p.place_id, mainText: p.structured_formatting?.main_text ?? p.description, secondaryText: p.structured_formatting?.secondary_text ?? '', fullAddress: p.description })));
            else setSuggestions([]);
        });
    }, [coordinates]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value; setQuery(v); onChange(v); setShowSuggestions(true);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => googleReady && autocompleteRef.current ? fetchGoogle(v) : fetchNominatim(v), 300);
    };

    const handleUseMyLocation = async () => {
        if (!coordinates) return;
        setLocating(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coordinates.latitude}&lon=${coordinates.longitude}&format=json`, { headers: { 'Accept-Language': 'en' } });
            const data = await res.json();
            const a = data.address ?? {};
            const parts = [a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road, a.suburb ?? a.neighbourhood, a.city ?? a.town ?? a.village].filter(Boolean);
            const addr = parts.length > 0 ? parts.join(', ') : data.display_name;
            setQuery(addr); onChange(addr);
        } catch { } finally { setLocating(false); }
    };

    return (
        <div ref={containerRef} className="relative">
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-gray flex items-center gap-1.5">Delivery Address<span className="text-error">*</span></label>
                <div className="relative flex items-center bg-neutral-light dark:bg-brand-dark border-2 border-neutral-gray/50 focus-within:border-primary rounded-xl transition-all overflow-hidden">
                    <span className="pl-3.5 text-neutral-gray shrink-0"><MagnifyingGlassIcon size={15} weight="bold" /></span>
                    <input type="text" value={query} onChange={handleChange} onFocus={() => query.length >= 3 && setShowSuggestions(true)} placeholder={placeholder}
                        className="flex-1 px-3 py-3 text-sm bg-transparent outline-none text-text-dark dark:text-text-light placeholder:text-neutral-gray/60" />
                    {query && <button onClick={() => { setQuery(''); onChange(''); setSuggestions([]); }} className="pr-3 cursor-pointer text-neutral-gray hover:text-text-dark transition-colors"><XIcon size={14} weight="bold" /></button>}
                </div>
                {coordinates && (
                    <button onClick={handleUseMyLocation} disabled={locating} className="flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary-hover transition-colors w-fit mt-0.5 cursor-pointer">
                        {locating ? <SpinnerGapIcon size={13} className="animate-spin" /> : <NavigationArrowIcon size={13} weight="fill" />}
                        Use my current location
                    </button>
                )}
            </div>
            {showSuggestions && (searching || suggestions.length > 0) && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-brand-dark rounded-2xl shadow-xl border border-neutral-gray/15 overflow-hidden">
                    {searching && suggestions.length === 0
                        ? <div className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-gray"><SpinnerGapIcon size={14} className="animate-spin text-primary" /> Searching addresses...</div>
                        : suggestions.map((s, i) => (
                            <button key={s.id} onClick={() => { setQuery(s.fullAddress); onChange(s.fullAddress); setSuggestions([]); setShowSuggestions(false); }}
                                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-primary/5 transition-colors cursor-pointer ${i < suggestions.length - 1 ? 'border-b border-neutral-gray/8' : ''}`}>
                                <MapPinIcon weight="fill" size={14} className="text-primary mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-text-dark dark:text-text-light truncate">{s.mainText}</p>
                                    {s.secondaryText && <p className="text-xs text-neutral-gray truncate">{s.secondaryText}</p>}
                                </div>
                            </button>
                        ))
                    }
                </div>
            )}
        </div>
    );
}

// ─── Branch Selector Sheet (inline, not CartDrawer) ───────────────────────────
function BranchSelectorSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { selectedBranch, setSelectedBranch, getBranchesWithDistance, branches } = useBranch();
    const { coordinates } = useLocation();
    const { validateCartForBranch, removeUnavailableItems, displayItems: items } = useCart();

    const [sheetView, setSheetView] = useState<BranchSheetView>('list');
    const [pendingBranch, setPendingBranch] = useState<Branch | null>(null);
    const [conflict, setConflict] = useState<{ available: CartItem[]; unavailable: CartItem[] } | null>(null);

    useEffect(() => { if (!isOpen) setTimeout(() => { setSheetView('list'); setPendingBranch(null); setConflict(null); }, 300); }, [isOpen]);

    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const sortedBranches: BranchWithDistance[] = coordinates
        ? getBranchesWithDistance(coordinates.latitude, coordinates.longitude)
        : branches.map(b => ({ ...b, distance: 0, deliveryTime: '–', isWithinRadius: true }));

    const handleSelect = (branch: Branch) => {
        if (branch.id === selectedBranch?.id) { onClose(); return; }
        if (items.length === 0) { setSelectedBranch(branch); onClose(); return; }
        const result = validateCartForBranch(branch.menuItemIds);
        if (result.unavailable.length === 0) { setSelectedBranch(branch); onClose(); }
        else { setPendingBranch(branch); setConflict(result); setSheetView('conflict'); }
    };

    const handleRemoveAndSwitch = () => {
        if (!pendingBranch || !conflict) return;
        removeUnavailableItems(conflict.unavailable.map(i => i.cartItemId));
        setSelectedBranch(pendingBranch);
        onClose();
    };

    return (
        <>
            <div className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
            <div className={`fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-brand-darker rounded-t-3xl shadow-2xl flex flex-col transition-transform duration-300 ease-out max-h-[88dvh]
                md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-125 md:rounded-2xl md:max-h-[82vh]
                ${isOpen ? 'translate-y-0' : 'translate-y-full md:opacity-0 md:scale-95 md:pointer-events-none'}`}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-neutral-gray/10 shrink-0">
                    <div className="flex items-center gap-3">
                        {sheetView === 'conflict' && (
                            <button onClick={() => setSheetView('list')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-gray/10 transition-colors cursor-pointer">
                                <ArrowLeftIcon weight="bold" size={16} className="text-text-dark dark:text-text-light" />
                            </button>
                        )}
                        <h3 className="font-bold text-text-dark dark:text-text-light">{sheetView === 'list' ? 'Change Branch' : 'Items Not Available'}</h3>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-gray/10 transition-colors cursor-pointer">
                        <XIcon size={20} weight="bold" className="text-text-dark dark:text-text-light" />
                    </button>
                </div>

                {/* Branch list */}
                {sheetView === 'list' && (
                    <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 flex flex-col gap-3">
                        <p className="text-xs text-neutral-gray">Sorted by distance. Switching validates your cart automatically.</p>
                        {sortedBranches.map(branch => {
                            const isCurrent = branch.id === selectedBranch?.id;
                            return (
                                <button key={branch.id} onClick={() => handleSelect(branch)} disabled={!branch.isOpen}
                                    className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all
                                        ${isCurrent ? 'border-primary bg-primary/8' : 'border-neutral-gray/15 hover:border-primary/30'}
                                        ${!branch.isOpen ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isCurrent ? 'bg-primary text-white' : 'bg-neutral-gray/10 text-neutral-gray'}`}>
                                        <StorefrontIcon weight="fill" size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className={`text-sm font-bold ${isCurrent ? 'text-primary' : 'text-text-dark dark:text-text-light'}`}>{branch.name} Branch</p>
                                            {isCurrent && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-white">Current</span>}
                                            {!branch.isOpen && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-gray/20 text-neutral-gray">Closed</span>}
                                        </div>
                                        <p className="text-xs text-neutral-gray mt-0.5 truncate">{branch.address}</p>
                                        <div className="flex items-center gap-2 mt-1.5 text-xs text-neutral-gray flex-wrap">
                                            {coordinates && <span>{branch.distance.toFixed(1)} km away</span>}
                                            <span>·</span><span>{branch.deliveryTime}</span><span>·</span><span>₵{branch.deliveryFee} delivery</span>
                                        </div>
                                    </div>
                                    {!isCurrent && branch.isOpen && <CaretRightIcon size={16} className="text-neutral-gray shrink-0 mt-1" />}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Conflict view */}
                {sheetView === 'conflict' && conflict && pendingBranch && (
                    <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 flex flex-col gap-5">
                        <div className="flex items-start gap-3 bg-warning/10 border border-warning/25 rounded-2xl p-4">
                            <WarningCircleIcon weight="fill" size={20} className="text-warning shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-text-dark dark:text-text-light">
                                    {conflict.unavailable.length} item{conflict.unavailable.length !== 1 ? 's' : ''} not available at {pendingBranch.name} Branch
                                </p>
                                <p className="text-xs text-neutral-gray mt-1">Remove them to switch, or stay at your current branch.</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-semibold text-neutral-gray uppercase tracking-wide">Won't be available</p>
                            {conflict.unavailable.map(ci => (
                                <div key={ci.cartItemId} className="flex items-center gap-3 bg-error/5 border border-error/15 rounded-xl p-3">
                                    <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-error/10 shrink-0">
                                        {ci.item.image ? <Image src={ci.item.image} alt={ci.item.name} fill sizes="40px" className="object-cover" /> : <div className="w-full h-full" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-text-dark dark:text-text-light truncate">{getOrderItemLineLabel({ name: ci.item.name, sizeLabel: ci.sizeLabel })}</p>
                                        <p className="text-xs text-neutral-gray">Qty {ci.quantity}</p>
                                    </div>
                                    <XIcon size={14} weight="bold" className="text-error shrink-0" />
                                </div>
                            ))}
                        </div>

                        {conflict.available.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <p className="text-xs font-semibold text-neutral-gray uppercase tracking-wide">Still available</p>
                                {conflict.available.map(ci => (
                                    <div key={ci.cartItemId} className="flex items-center gap-3 bg-secondary/5 border border-secondary/15 rounded-xl p-3">
                                        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-secondary/10 shrink-0">
                                            {ci.item.image ? <Image src={ci.item.image} alt={ci.item.name} fill sizes="40px" className="object-cover" /> : <div className="w-full h-full" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-text-dark dark:text-text-light truncate">{getOrderItemLineLabel({ name: ci.item.name, sizeLabel: ci.sizeLabel })}</p>
                                            <p className="text-xs text-neutral-gray">Qty {ci.quantity}</p>
                                        </div>
                                        <CheckCircleIcon size={14} weight="fill" className="text-secondary shrink-0" />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-col gap-3 pt-1 pb-2">
                            <button onClick={handleRemoveAndSwitch} className="w-full flex items-center justify-between bg-primary hover:bg-primary-hover text-white font-bold px-5 py-4 rounded-2xl transition-all active:scale-[0.98] cursor-pointer">
                                <span>Remove {conflict.unavailable.length} item{conflict.unavailable.length !== 1 ? 's' : ''} & switch</span>
                                <ArrowRightIcon weight="bold" size={16} />
                            </button>
                            <button onClick={onClose} className="w-full border-2 border-neutral-gray/20 text-text-dark dark:text-text-light font-bold px-5 py-3.5 rounded-2xl hover:border-primary/40 hover:text-primary transition-all cursor-pointer">
                                Keep {selectedBranch?.name} Branch
                            </button>
                            <button onClick={() => setSheetView('list')} className="w-full text-sm font-semibold text-neutral-gray hover:text-primary transition-colors py-2 cursor-pointer">
                                Pick a different branch
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: Step }) {
    const steps = [{ n: 1, label: 'Details' }, { n: 2, label: 'Payment' }, { n: 3, label: 'Processing' }, { n: 4, label: 'Done' }];
    return (
        <div className="flex items-center">
            {steps.map((s, i) => {
                const done = current > s.n; const active = current === s.n;
                return (
                    <React.Fragment key={s.n}>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${done ? 'bg-secondary text-white' : active ? 'bg-primary text-white' : 'bg-neutral-gray/20 text-neutral-gray'}`}>
                                {done ? <CheckCircleIcon weight="fill" size={16} /> : s.n}
                            </div>
                            <span className={`text-sm font-semibold hidden sm:inline transition-colors ${active ? 'text-text-dark dark:text-text-light' : done ? 'text-secondary' : 'text-neutral-gray'}`}>{s.label}</span>
                        </div>
                        {i < steps.length - 1 && <div className={`h-px w-8 sm:w-12 mx-2 transition-colors ${current > s.n ? 'bg-secondary' : 'bg-neutral-gray/20'}`} />}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

// ─── Order Summary ────────────────────────────────────────────────────────────
function OrderSummary({ orderType, scConfig }: { orderType: OrderType; scConfig: ServiceChargeConfig }) {
    const { displayItems: items, subtotal } = useCart();
    const { selectedBranch } = useBranch();
    const delivery = orderType === 'delivery' ? (selectedBranch?.deliveryFee ?? DELIVERY_FEE) : 0;
    const serviceCharge = calcServiceCharge(subtotal, scConfig);
    const total = subtotal + delivery + serviceCharge;
    return (
        <div className="bg-white dark:bg-brand-dark rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-text-dark dark:text-text-light">Order Summary</h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/15 text-primary">{items.length} item{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex flex-col gap-3">
                {items.map(ci => (
                    <div key={ci.cartItemId} className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-primary/10 shrink-0">
                            {ci.item.image ? <Image src={ci.item.image} alt={ci.item.name} fill sizes="48px" className="object-cover" /> : <div className="w-full h-full" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-dark dark:text-text-light truncate">{ci.item.name}</p>
                            <p className="text-xs text-neutral-gray">{ci.sizeLabel} · Qty: {ci.quantity}</p>
                        </div>
                        <span className="text-sm font-bold text-primary shrink-0">{formatPrice(ci.price * ci.quantity)}</span>
                    </div>
                ))}
            </div>
            <div className="h-px bg-neutral-gray/10" />
            <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><span className="text-neutral-gray">Subtotal</span><span className="font-semibold text-text-dark dark:text-text-light">{formatPrice(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-gray">Delivery Fee</span><span className="font-semibold text-text-dark dark:text-text-light">{orderType === 'delivery' ? formatPrice(delivery) : <span className="text-secondary">Free</span>}</span></div>
                <div className="flex justify-between"><span className="text-neutral-gray">Service Charge{scConfig.enabled ? ` (${scConfig.percent}%)` : ''}</span><span className="font-semibold text-text-dark dark:text-text-light">{formatPrice(serviceCharge)}</span></div>
            </div>
            <div className="h-px bg-neutral-gray/10" />
            <div className="flex justify-between items-center">
                <span className="font-bold text-text-dark dark:text-text-light">Total</span>
                <span className="text-2xl font-bold text-primary">{formatPrice(total)}</span>
            </div>
        </div>
    );
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────
function StepDetails({ orderType, setOrderType, contact, setContact, onNext }: {
    orderType: OrderType; setOrderType: (t: OrderType) => void;
    contact: ContactDetails; setContact: (c: ContactDetails) => void; onNext: () => void;
}) {
    const { selectedBranch } = useBranch();
    const [branchSheetOpen, setBranchSheetOpen] = useState(false);
    const [phoneTouched, setPhoneTouched] = useState(false);
    const update = (f: keyof ContactDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setContact({ ...contact, [f]: e.target.value });
    const phoneError = phoneTouched && contact.phone.trim() && !isValidGhanaPhone(contact.phone) ? 'Enter a valid Ghana number (e.g. 0241234567 or +233241234567)' : '';
    const canProceed = contact.name.trim() && contact.phone.trim() && isValidGhanaPhone(contact.phone) && (orderType === 'pickup' || contact.address.trim());

    return (
        <>
            <div className="flex flex-col gap-5">
                <div className="bg-white dark:bg-brand-dark rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
                    <h2 className="font-bold text-text-dark dark:text-text-light">How do you want your order?</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {([
                            { type: 'delivery' as const, icon: <TruckIcon weight="fill" size={22} />, label: 'Delivery', sub: 'Delivered to you' },
                            { type: 'pickup' as const, icon: <BagIcon weight="fill" size={22} />, label: 'Pickup', sub: 'Pick up at branch' },
                        ]).map(({ type, icon, label, sub }) => (
                            <button key={type} onClick={() => setOrderType(type)}
                                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-150 cursor-pointer
                                    ${orderType === type ? 'border-primary bg-primary/8 text-primary' : 'border-neutral-gray/15 text-neutral-gray hover:border-primary/30'}`}>
                                <span className={orderType === type ? 'text-primary' : 'text-neutral-gray'}>{icon}</span>
                                <span className="text-sm font-bold">{label}</span>
                                <span className="text-xs opacity-70">{sub}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {selectedBranch && (
                    <div className="bg-white dark:bg-brand-dark rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                        <div className="flex items-center justify-between cursor-pointer">
                            <h2 className="font-bold text-text-dark dark:text-text-light">{orderType === 'delivery' ? 'Delivering From' : 'Pickup Location'}</h2>
                            <button onClick={() => setBranchSheetOpen(true)} className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline cursor-pointer">
                                <PencilSimpleIcon size={12} /> Change Branch
                            </button>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-light dark:bg-brown/30">
                            <StorefrontIcon weight="fill" size={18} className="text-primary mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-text-dark dark:text-text-light">{selectedBranch.name} Branch</p>
                                <p className="text-xs text-neutral-gray mt-0.5">{selectedBranch.address}</p>
                                <p className="text-xs text-neutral-gray mt-0.5">{selectedBranch.phone}</p>
                            </div>
                        </div>
                        {orderType === 'delivery' && (
                            <div className="flex items-center gap-2 text-sm text-neutral-gray">
                                <span>Estimated: <strong className="text-text-dark dark:text-text-light">25 – 40 mins</strong></span>
                                <span className="ml-auto text-xs font-semibold text-text-dark dark:text-text-light">₵{selectedBranch.deliveryFee} delivery fee</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="bg-white dark:bg-brand-dark rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                    <h2 className="font-bold text-text-dark dark:text-text-light">Your Details</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField icon={<UserIcon weight="fill" size={15} />} label="Full Name" required>
                            <input type="text" placeholder="e.g. Kwame Mensah" value={contact.name} onChange={update('name')} className="w-full bg-transparent outline-none text-text-dark dark:text-text-light placeholder:text-neutral-gray/60" />
                        </InputField>
                        <div className="flex flex-col gap-1">
                            <InputField icon={<PhoneIcon weight="fill" size={15} />} label="Phone Number" required>
                                <input type="tel" placeholder="0241234567" value={contact.phone} onChange={update('phone')} onBlur={() => setPhoneTouched(true)} className="w-full bg-transparent outline-none text-text-dark dark:text-text-light placeholder:text-neutral-gray/60" />
                            </InputField>
                            {phoneError && <p className="text-xs text-red-500 px-1">{phoneError}</p>}
                        </div>
                    </div>
                    {orderType === 'delivery' && (
                        <AddressSearchField value={contact.address} onChange={addr => setContact({ ...contact, address: addr })} placeholder="Search your delivery address..." />
                    )}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-neutral-gray flex items-center gap-1.5"><NoteIcon weight="fill" size={13} /> Note to Rider (Optional)</label>
                        <div className="bg-neutral-light dark:bg-brand-dark border-2 border-neutral-gray/50 focus-within:border-primary rounded-xl transition-all overflow-hidden">
                            <textarea rows={2} placeholder="e.g. Call me when you reach the gate..." value={contact.note} onChange={update('note')}
                                className="w-full px-3.5 py-3 text-sm bg-transparent outline-none resize-none text-text-dark dark:text-text-light placeholder:text-neutral-gray/60" />
                        </div>
                    </div>
                </div>

                <button onClick={onNext} disabled={!canProceed}
                    className={`flex cursor-pointer items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98]
                        ${canProceed ? 'bg-primary hover:bg-primary-hover text-white' : 'bg-neutral-gray/20 text-neutral-gray cursor-not-allowed'}`}>
                    Continue to Payment <ArrowRightIcon weight="bold" size={18} />
                </button>
            </div>
            <BranchSelectorSheet isOpen={branchSheetOpen} onClose={() => setBranchSheetOpen(false)} />
        </>
    );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────
function StepPayment({ paymentMethod, setPaymentMethod, orderType, contact, onBack, onPlace, placing, scConfig }: {
    paymentMethod: PaymentMethod; setPaymentMethod: (m: PaymentMethod) => void;
    orderType: OrderType; contact: ContactDetails; onBack: () => void; onPlace: () => void; placing: boolean; scConfig: ServiceChargeConfig;
}) {
    const { subtotal } = useCart();
    const { selectedBranch } = useBranch();
    const [branchSheetOpen, setBranchSheetOpen] = useState(false);
    const delivery = orderType === 'delivery' ? (selectedBranch?.deliveryFee ?? DELIVERY_FEE) : 0;
    const serviceCharge = calcServiceCharge(subtotal, scConfig);
    const total = subtotal + delivery + serviceCharge;

    const methods = [
        { id: 'mobile_money' as const, icon: <DeviceMobileIcon weight="fill" size={20} />, label: 'Mobile Money', sub: 'MTN MoMo · Telecel · AirtelTigo', color: 'text-warning' },
        { id: 'cash' as const, icon: <MoneyIcon weight="fill" size={20} />, label: orderType === 'delivery' ? 'Cash on Delivery' : 'Cash at Pickup', sub: orderType === 'delivery' ? 'Pay when your order arrives' : 'Pay when you collect', color: 'text-secondary' },
    ];

    return (
        <>
            <div className="flex flex-col gap-5">
                <div className="bg-white dark:bg-brand-dark rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            {orderType === 'delivery' ? <TruckIcon weight="fill" size={18} className="text-primary" /> : <BagIcon weight="fill" size={18} className="text-primary" />}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-text-dark dark:text-text-light">{orderType === 'delivery' ? 'Delivering to' : 'Pickup at'}</p>
                            <p className="text-xs text-neutral-gray truncate max-w-50">{orderType === 'delivery' ? contact.address : selectedBranch?.name + ' Branch'}</p>
                        </div>
                    </div>
                    <button onClick={onBack} className="text-xs cursor-pointer font-semibold text-primary hover:underline flex items-center gap-1 shrink-0"><PencilSimpleIcon size={12} /> Edit</button>
                </div>

                {selectedBranch && (
                    <div className="bg-white dark:bg-brand-dark rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <StorefrontIcon weight="fill" size={18} className="text-primary shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-text-dark dark:text-text-light">{selectedBranch.name} Branch</p>
                                <p className="text-xs text-neutral-gray">{selectedBranch.address}</p>
                            </div>
                        </div>
                        <button onClick={() => setBranchSheetOpen(true)} className="text-xs cursor-pointer font-semibold text-primary hover:underline shrink-0">Change</button>
                    </div>
                )}

                <div className="bg-white dark:bg-brand-dark rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                    <h2 className="font-bold text-text-dark dark:text-text-light">Payment Method</h2>
                    {methods.map(m => (
                        <div key={m.id}>
                            <button onClick={() => setPaymentMethod(m.id)}
                                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left cursor-pointer ${paymentMethod === m.id ? 'border-primary bg-primary/5' : 'border-neutral-gray/15 hover:border-primary/30'}`}>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentMethod === m.id ? 'border-primary' : 'border-neutral-gray/40'}`}>
                                    {paymentMethod === m.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                </div>
                                <span className={`${m.color} shrink-0`}>{m.icon}</span>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-text-dark dark:text-text-light">{m.label}</p>
                                    <p className="text-xs text-neutral-gray">{m.sub}</p>
                                </div>
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button onClick={onBack} className="flex cursor-pointer items-center gap-2 px-5 py-4 rounded-2xl border-2 border-neutral-gray/20 font-bold text-neutral-gray hover:border-primary/40 hover:text-primary transition-all">
                        <ArrowLeftIcon weight="bold" size={16} /> Back
                    </button>
                    <button onClick={() => onPlace()} disabled={placing}
                        className="flex-1 flex cursor-pointer items-center justify-between bg-brown dark:bg-brand-dark hover:bg-brown-light disabled:opacity-70 text-white font-bold px-6 py-4 rounded-2xl transition-all active:scale-[0.98] group">
                        <span>{placing ? 'Placing Order...' : paymentMethod === 'mobile_money' ? 'Pay & Place Order' : 'Place Order'}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-primary font-bold">{formatPrice(total)}</span>
                            <ArrowRightIcon weight="bold" size={18} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>
                </div>
                <p className="text-xs text-center text-neutral-gray flex items-center justify-center gap-1"><LockIcon size={11} /> Secured · Encrypted · Powered by Hubtel</p>
            </div>
            <BranchSelectorSheet isOpen={branchSheetOpen} onClose={() => setBranchSheetOpen(false)} />
        </>
    );
}

// ─── Step 3: Payment Processing (polls checkout session) ──────────────────────
function StepProcessing({ sessionToken, onSuccess, onFail, onAbandon }: {
    sessionToken: string;
    onSuccess: (orderNumber: string) => void;
    onFail: (message: string) => void;
    onAbandon: () => void;
}) {
    const { session } = useCheckoutSessionStatus(sessionToken);
    const abandon = useAbandonCheckoutSession();
    const [showRecovery, setShowRecovery] = useState(false);

    useEffect(() => {
        if (!session) return;
        if (session.status === 'confirmed' && session.order?.order_number) {
            onSuccess(session.order.order_number);
        } else if (session.status === 'failed' || session.status === 'expired') {
            setShowRecovery(true);
        }
    }, [session, onSuccess, onFail]);

    const handleAbandon = async () => {
        try {
            await abandon.mutateAsync(sessionToken);
        } catch { /* ignore */ }
        onAbandon();
    };

    // Show recovery UI when payment fails or expires
    if (showRecovery && session) {
        const isFailed = session.status === 'failed';
        return (
            <div className="flex flex-col items-center gap-5 py-10 text-center max-w-sm mx-auto">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isFailed ? 'bg-red-100 dark:bg-red-900/20' : 'bg-amber-100 dark:bg-amber-900/20'}`}>
                    <WarningCircleIcon weight="fill" size={40} className={isFailed ? 'text-red-500' : 'text-amber-500'} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-text-dark dark:text-text-light">
                        {isFailed ? 'Payment Failed' : 'Session Expired'}
                    </h2>
                    <p className="text-sm text-neutral-gray mt-2">
                        {isFailed
                            ? 'Your payment could not be completed. Choose an option below to try again.'
                            : 'Your payment session has expired. You can retry or switch to cash.'}
                    </p>
                </div>

                <PaymentRecoveryActions
                    session={session}
                    onOrderCreated={onSuccess}
                    onAbandoned={onAbandon}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-6 py-12 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center">
                <SpinnerGapIcon size={40} className="text-primary animate-spin" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-text-dark dark:text-text-light">Awaiting Payment</h2>
                <p className="text-sm text-neutral-gray mt-2">
                    Complete the payment on the Hubtel page.<br />
                    This page will update automatically once confirmed.
                </p>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 w-full max-w-sm text-sm text-text-dark dark:text-text-light text-left flex items-start gap-3">
                <DeviceMobileIcon weight="fill" size={18} className="text-primary shrink-0 mt-0.5" />
                <span>If prompted on your phone, approve the Mobile Money payment to continue.</span>
            </div>
            <button onClick={handleAbandon} disabled={abandon.isPending}
                className="text-sm font-semibold text-neutral-gray hover:text-error transition-colors cursor-pointer mt-2">
                {abandon.isPending ? 'Cancelling...' : 'Cancel & go back'}
            </button>
        </div>
    );
}

// ─── Step 4 ───────────────────────────────────────────────────────────────────
function StepDone({ orderNumber, orderType, contact }: {
    orderNumber: string; orderType: OrderType; contact: ContactDetails;
}) {
    const { isLoggedIn, saveFromCheckout } = useAuth();
    const { selectedBranch } = useBranch();
    const [promptState, setPromptState] = useState<'idle' | 'saving' | 'saved' | 'dismissed'>(
        isLoggedIn ? 'saved' : 'idle'
    );

    const handleSave = async () => {
        setPromptState('saving');
        await new Promise(r => setTimeout(r, 600));
        saveFromCheckout(contact.name, contact.phone);
        setPromptState('saved');
    };

    return (
        <div className="flex flex-col items-center gap-6 py-8 text-center">
            {/* Success icon */}
            <div className="relative">
                <div className="w-24 h-24 rounded-full bg-secondary/15 flex items-center justify-center">
                    <CheckCircleIcon weight="fill" size={52} className="text-secondary" />
                </div>
                <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <ShoppingBagIcon weight="fill" size={16} className="text-white" />
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-text-dark dark:text-text-light">Order Placed!</h2>
                <p className="text-neutral-gray mt-1">Your delicious food is being prepared</p>
            </div>

            {/* Order details card */}
            <div className="bg-white dark:bg-brand-dark rounded-2xl p-5 w-full shadow-sm flex flex-col gap-3 text-left">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-gray">Order Number</span>
                    <span className="text-base font-bold text-primary font-mono">#{orderNumber}</span>
                </div>
                <div className="h-px bg-neutral-gray/10" />
                <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-neutral-gray shrink-0">{orderType === 'delivery' ? 'Delivering to' : 'Pickup at'}</span>
                    <span className="text-sm font-semibold text-text-dark dark:text-text-light text-right truncate">
                        {orderType === 'delivery' ? contact.address || 'Delivery address' : selectedBranch ? `${selectedBranch.name} Branch` : 'Branch'}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-gray">Estimated Time</span>
                    <span className="text-sm font-semibold text-text-dark dark:text-text-light">
                        {orderType === 'delivery' ? '25 – 40 mins' : '15 – 20 mins'}
                    </span>
                </div>
            </div>

            {/* SMS confirmation */}
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 w-full text-sm text-text-dark dark:text-text-light text-left">
                Confirmation SMS sent to <strong>{contact.phone}</strong> with your tracking link.
            </div>

            {/* ── Post-order save prompt ── */}
            {promptState === 'idle' && (
                <div className="w-full bg-white dark:bg-brand-dark rounded-2xl p-4 shadow-sm border border-primary/15 relative">
                    <button onClick={() => setPromptState('dismissed')}
                        className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full hover:bg-neutral-gray/10 transition-colors cursor-pointer">
                        <XIcon size={13} weight="bold" className="text-neutral-gray" />
                    </button>
                    <div className="flex items-start gap-3 mb-4 text-left">
                        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                            <SparkleIcon weight="fill" size={18} className="text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-text-dark dark:text-text-light">Save your info for next time?</p>
                            <p className="text-xs text-neutral-gray mt-0.5">Faster checkout — your name and number are pre-filled automatically.</p>
                        </div>
                    </div>
                    {/* Pre-filled preview */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-light dark:bg-brown/30 mb-4">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <UserCircleIcon weight="fill" size={22} className="text-primary" />
                        </div>
                        <div className="text-left min-w-0">
                            <p className="text-sm font-semibold text-text-dark dark:text-text-light truncate">{contact.name}</p>
                            <p className="text-xs text-neutral-gray">{contact.phone}</p>
                        </div>
                    </div>
                    <button onClick={handleSave}
                        className="w-full py-3 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-bold text-sm transition-all active:scale-[0.98] cursor-pointer">
                        Yes, save my info
                    </button>
                </div>
            )}

            {promptState === 'saving' && (
                <div className="w-full bg-white dark:bg-brand-dark rounded-2xl p-4 shadow-sm flex items-center justify-center gap-2 text-sm text-neutral-gray">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Saving your details...
                </div>
            )}

            {(promptState === 'saved' || promptState === 'dismissed') && promptState === 'saved' && (
                <div className="w-full bg-secondary/10 border border-secondary/20 rounded-2xl p-4 flex items-center gap-3 text-left">
                    <CheckCircleIcon weight="fill" size={20} className="text-secondary shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-text-dark dark:text-text-light">
                            {isLoggedIn ? "You're already signed in" : 'Details saved!'}
                        </p>
                        <p className="text-xs text-neutral-gray">
                            {isLoggedIn ? 'Your info is pre-filled on every order.' : 'Your next checkout will be instant.'}
                        </p>
                    </div>
                </div>
            )}

            {/* CTA buttons */}
            <div className="flex flex-col gap-3 w-full">
                <Link href={`/orders/${orderNumber}`}
                    className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98]">
                    Track My Order <ArrowRightIcon weight="bold" size={16} />
                </Link>
                <Link href="/"
                    className="flex items-center justify-center text-sm font-semibold text-neutral-gray hover:text-primary transition-colors py-2">
                    Back to Menu
                </Link>
            </div>
        </div>
    );
}

// ─── Empty Cart Guard ─────────────────────────────────────────────────────────
function EmptyCartGuard() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingBagIcon weight="fill" size={36} className="text-primary/40" />
            </div>
            <div className="text-center">
                <h2 className="text-xl font-bold text-text-dark dark:text-text-light">Your cart is empty</h2>
                <p className="text-neutral-gray mt-1">Add some items before checking out</p>
            </div>
            <Link href="/" className="bg-primary text-white font-bold px-8 py-3 rounded-2xl hover:bg-primary-hover transition-all">Browse Menu</Link>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
    const { displayItems: items, clearCart, subtotal } = useCart();
    const { selectedBranch, branches } = useBranch();
    const { coordinates } = useLocation();
    const createSession = useCreateCheckoutSession();
    const [step, setStep] = useState<Step>(1);
    const [orderType, setOrderType] = useState<OrderType>('delivery');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mobile_money');
    const [placing, setPlacing] = useState(false);
    const [orderNumber, setOrderNumber] = useState('');
    const [sessionToken, setSessionToken] = useState<string | null>(null);
    const [contact, setContact] = useState<ContactDetails>({ name: '', phone: '', address: '', note: '' });
    const [scConfig, setScConfig] = useState<ServiceChargeConfig>(DEFAULT_SC_CONFIG);

    useEffect(() => {
        apiClient.get('/checkout-config').then((res: unknown) => {
            const d = (res as { data?: { service_charge_enabled?: boolean; service_charge_percent?: number; service_charge_cap?: number } })?.data;
            if (d) setScConfig({ enabled: d.service_charge_enabled ?? true, percent: d.service_charge_percent ?? 1, cap: d.service_charge_cap ?? 5 });
        }).catch(() => { /* fall back to defaults */ });
    }, []);

    const effectiveBranch = selectedBranch ?? branches.find(b => b.isOpen) ?? branches[0] ?? null;

    const handlePlaceOrder = useCallback(async () => {
        if (!effectiveBranch) return;
        setPlacing(true);
        try {
            const session = await createSession.mutateAsync({
                branch_id: Number(effectiveBranch.id),
                order_type: orderType,
                customer_name: contact.name,
                customer_phone: normalizeGhanaPhone(contact.phone),
                delivery_address: orderType === 'delivery' ? contact.address : undefined,
                delivery_latitude: orderType === 'delivery' && coordinates ? coordinates.latitude : undefined,
                delivery_longitude: orderType === 'delivery' && coordinates ? coordinates.longitude : undefined,
                special_instructions: contact.note || undefined,
                payment_method: paymentMethod,
            });

            if (paymentMethod === 'mobile_money') {
                // Redirect to Hubtel checkout if we have a URL
                if (session.checkout_url) {
                    // Don't clear cart here — backend clears it when order is created.
                    // If payment fails, the customer can retry with their cart intact.
                    window.location.href = session.checkout_url;
                    return;
                }
                // Otherwise poll for status (e.g. if redirect didn't happen)
                setSessionToken(session.session_token);
                setStep(3);
            } else {
                // Cash: backend creates order immediately
                if (session.status === 'confirmed' && session.order?.order_number) {
                    clearCart();
                    setOrderNumber(session.order.order_number);
                    setStep(4);
                } else {
                    // Session still pending — poll for status
                    setSessionToken(session.session_token);
                    setStep(3);
                }
            }
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.message : 'Failed to place order. Please try again.';
            toast.error(msg);
        } finally {
            setPlacing(false);
        }
    }, [effectiveBranch, paymentMethod, orderType, contact, coordinates, createSession, clearCart]);

    const handleProcessingSuccess = useCallback((num: string) => {
        clearCart();
        setOrderNumber(num);
        setStep(4);
    }, [clearCart]);

    const handleProcessingFail = useCallback((message: string) => {
        toast.error(message);
        setStep(2);
        setSessionToken(null);
    }, []);

    const handleProcessingAbandon = useCallback(() => {
        setStep(2);
        setSessionToken(null);
    }, []);

    if (items.length === 0 && step !== 3 && step !== 4) return <EmptyCartGuard />;

    return (
        <div className="min-h-screen bg-neutral-light dark:bg-brand-darker pt-20 pb-12">
            <div className="w-[95%] md:w-[85%] xl:w-[75%] max-w-5xl mx-auto">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-text-dark dark:text-text-light">{step === 4 ? 'Order Confirmed' : step === 3 ? 'Processing Payment' : 'Checkout'}</h1>
                        {step <= 2 && <p className="text-sm text-neutral-gray mt-1">Complete your order details below</p>}
                    </div>
                    {step <= 3 && <StepIndicator current={step} />}
                </div>

                {step === 4 ? (
                    <div className="max-w-md mx-auto">
                        <StepDone orderNumber={orderNumber} orderType={orderType} contact={contact} />
                    </div>
                ) : step === 3 && sessionToken ? (
                    <div className="max-w-md mx-auto">
                        <StepProcessing sessionToken={sessionToken} onSuccess={handleProcessingSuccess} onFail={handleProcessingFail} onAbandon={handleProcessingAbandon} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
                        <div>
                            {step === 1 && <StepDetails orderType={orderType} setOrderType={setOrderType} contact={contact} setContact={setContact} onNext={() => { setContact(c => ({ ...c, phone: normalizeGhanaPhone(c.phone) })); setStep(2); }} />}
                            {step === 2 && <StepPayment paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} orderType={orderType} contact={contact} onBack={() => setStep(1)} onPlace={handlePlaceOrder} placing={placing} scConfig={scConfig} />}
                        </div>
                        <div className="lg:sticky lg:top-24 h-fit"><OrderSummary orderType={orderType} scConfig={scConfig} /></div>
                    </div>
                )}
            </div>
        </div>
    );
}