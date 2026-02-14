'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    MapPinIcon, ClockIcon, UserIcon, PhoneIcon,
    NoteIcon, TruckIcon, BagIcon, DeviceMobileIcon,
    MoneyIcon, CheckCircleIcon, ArrowRightIcon,
    ArrowLeftIcon, ShoppingBagIcon, PencilSimpleIcon,
    LockIcon, MagnifyingGlassIcon, XIcon, SpinnerGapIcon,
    NavigationArrowIcon, StorefrontIcon,
} from '@phosphor-icons/react';
import { useCart } from '@/app/components/providers/CartProvider';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { useModal } from '@/app/components/providers/ModalProvider';
import { useLocation } from '@/app/components/providers/LocationProvider';

// ─── Types ────────────────────────────────────────────────────────────────────
type OrderType = 'delivery' | 'pickup';
type PaymentMethod = 'momo' | 'cash_delivery' | 'cash_pickup';
type Step = 1 | 2 | 3;

interface ContactDetails {
    name: string;
    phone: string;
    address: string;
    note: string;
}

const DELIVERY_FEE = 15;
const TAX_RATE = 0.025;
const formatPrice = (p: number) => `GHS ${p.toFixed(2)}`;

// ─── Consistent Input Field ───────────────────────────────────────────────────
// Matches UniversalSearch: same bg, border-2 border-neutral-gray/50, focus:border-primary
function InputField({
    icon, label, required, children,
}: {
    icon: React.ReactNode; label: string; required?: boolean; children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-gray flex items-center gap-1.5">
                {label}{required && <span className="text-error">*</span>}
            </label>
            <div className="relative flex items-center bg-neutral-light dark:bg-brand-dark border-2 border-neutral-gray/50 focus-within:border-primary rounded-xl transition-all overflow-hidden">
                <span className="pl-3.5 text-neutral-gray shrink-0">{icon}</span>
                <div className="flex-1 px-3 py-2.5 text-sm">
                    {children}
                </div>
            </div>
        </div>
    );
}

// ─── Address Search with Google Places ───────────────────────────────────────
declare global {
    interface Window {
        google: any;
        initGooglePlaces: () => void;
    }
}

// Normalised suggestion shape — works for both Google & Nominatim results
interface AddressSuggestion {
    id: string;
    mainText: string;
    secondaryText: string;
    fullAddress: string;
}

function AddressSearchField({
    value, onChange, placeholder,
}: {
    value: string; onChange: (v: string) => void; placeholder: string;
}) {
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

    // Try to load Google Places — but don't block if no key
    useEffect(() => {
        if (window.google?.maps?.places) { setGoogleReady(true); return; }
        const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!key) return; // No key → Nominatim takes over

        window.initGooglePlaces = () => setGoogleReady(true);
        if (!document.querySelector('script[data-google-places]')) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=initGooglePlaces`;
            script.async = true;
            script.defer = true;
            script.dataset.googlePlaces = 'true';
            document.head.appendChild(script);
        }
    }, []);

    useEffect(() => {
        if (googleReady && !autocompleteRef.current) {
            autocompleteRef.current = new window.google.maps.places.AutocompleteService();
        }
    }, [googleReady]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Nominatim forward search (no API key needed) ──────────────────────────
    const fetchNominatim = useCallback(async (input: string) => {
        if (input.length < 3) { setSuggestions([]); return; }
        setSearching(true);
        try {
            // Bias toward Ghana + user location if available
            let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input + ', Ghana')}&format=json&limit=6&addressdetails=1`;
            if (coordinates) {
                url += `&viewbox=${coordinates.longitude - 0.3},${coordinates.latitude + 0.3},${coordinates.longitude + 0.3},${coordinates.latitude - 0.3}&bounded=0`;
            }
            const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
            const data: any[] = await res.json();
            const mapped: AddressSuggestion[] = data.map(r => ({
                id: r.place_id,
                mainText: r.address?.road
                    ? [r.address.house_number, r.address.road].filter(Boolean).join(' ')
                    : r.display_name.split(',')[0],
                secondaryText: [
                    r.address?.suburb,
                    r.address?.city ?? r.address?.town ?? r.address?.village,
                    r.address?.state,
                ].filter(Boolean).join(', '),
                fullAddress: r.display_name,
            }));
            setSuggestions(mapped);
        } catch {
            setSuggestions([]);
        } finally {
            setSearching(false);
        }
    }, [coordinates]);

    // ── Google Places forward search ──────────────────────────────────────────
    const fetchGoogle = useCallback((input: string) => {
        if (!autocompleteRef.current || input.length < 3) { setSuggestions([]); return; }
        setSearching(true);
        const request: any = {
            input,
            componentRestrictions: { country: 'gh' },
            types: ['geocode', 'establishment'],
        };
        if (coordinates) {
            request.locationBias = {
                center: { lat: coordinates.latitude, lng: coordinates.longitude },
                radius: 20000,
            };
        }
        autocompleteRef.current.getPlacePredictions(request, (preds: any[], status: string) => {
            setSearching(false);
            if (status === 'OK' && preds) {
                setSuggestions(preds.map(p => ({
                    id: p.place_id,
                    mainText: p.structured_formatting?.main_text ?? p.description,
                    secondaryText: p.structured_formatting?.secondary_text ?? '',
                    fullAddress: p.description,
                })));
            } else {
                setSuggestions([]);
            }
        });
    }, [coordinates]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setQuery(v);
        onChange(v);
        setShowSuggestions(true);
        // Debounce search calls
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            if (googleReady && autocompleteRef.current) {
                fetchGoogle(v);
            } else {
                fetchNominatim(v);
            }
        }, 300);
    };

    const handleSelect = (s: AddressSuggestion) => {
        setQuery(s.fullAddress);
        onChange(s.fullAddress);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleUseMyLocation = async () => {
        if (!coordinates) return;
        setLocating(true);
        try {
            if (window.google?.maps) {
                const geocoder = new window.google.maps.Geocoder();
                geocoder.geocode(
                    { location: { lat: coordinates.latitude, lng: coordinates.longitude } },
                    (results: any[], status: string) => {
                        if (status === 'OK' && results[0]) {
                            const addr = results[0].formatted_address;
                            setQuery(addr);
                            onChange(addr);
                        }
                        setLocating(false);
                    }
                );
            } else {
                // Fallback: OpenStreetMap Nominatim (no key needed)
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${coordinates.latitude}&lon=${coordinates.longitude}&format=json`
                );
                const data = await res.json();
                const addr = data.display_name ?? '';
                setQuery(addr);
                onChange(addr);
                setLocating(false);
            }
        } catch {
            setLocating(false);
        }
    };

    return (
        <div ref={containerRef} className="relative">
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-gray flex items-center gap-1.5">
                    Delivery Address<span className="text-error">*</span>
                </label>
                <div className="relative flex items-center bg-neutral-light dark:bg-brand-dark border-2 border-neutral-gray/50 focus-within:border-primary rounded-xl transition-all overflow-hidden">
                    <span className="pl-3.5 text-neutral-gray shrink-0">
                        <MagnifyingGlassIcon size={15} weight="bold" />
                    </span>
                    <input
                        type="text"
                        value={query}
                        onChange={handleInputChange}
                        onFocus={() => query.length >= 3 && setShowSuggestions(true)}
                        placeholder={placeholder}
                        className="flex-1 px-3 py-3 text-sm bg-transparent outline-none text-text-dark dark:text-text-light placeholder:text-neutral-gray/60"
                    />
                    {query && (
                        <button
                            onClick={() => { setQuery(''); onChange(''); setSuggestions([]); }}
                            className="pr-3 text-neutral-gray hover:text-text-dark transition-colors"
                        >
                            <XIcon size={14} weight="bold" />
                        </button>
                    )}
                </div>

                {/* Use my location */}
                {coordinates && (
                    <button
                        onClick={handleUseMyLocation}
                        disabled={locating}
                        className="flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary-hover transition-colors w-fit mt-0.5"
                    >
                        {locating
                            ? <SpinnerGapIcon size={13} className="animate-spin" />
                            : <NavigationArrowIcon size={13} weight="fill" />
                        }
                        Use my current location
                    </button>
                )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && (searching || suggestions.length > 0) && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-brand-dark rounded-2xl shadow-xl border border-neutral-gray/15 overflow-hidden">
                    {searching && suggestions.length === 0 ? (
                        <div className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-gray">
                            <SpinnerGapIcon size={14} className="animate-spin text-primary" /> Searching addresses...
                        </div>
                    ) : suggestions.map((s, i) => (
                        <button
                            key={s.id}
                            onClick={() => handleSelect(s)}
                            className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-primary/5 transition-colors
                                ${i < suggestions.length - 1 ? 'border-b border-neutral-gray/8' : ''}`}
                        >
                            <MapPinIcon weight="fill" size={14} className="text-primary mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-text-dark dark:text-text-light truncate">{s.mainText}</p>
                                {s.secondaryText && <p className="text-xs text-neutral-gray truncate">{s.secondaryText}</p>}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: Step }) {
    const steps = [{ n: 1, label: 'Details' }, { n: 2, label: 'Payment' }, { n: 3, label: 'Done' }];
    return (
        <div className="flex items-center">
            {steps.map((s, i) => {
                const done = current > s.n;
                const active = current === s.n;
                return (
                    <React.Fragment key={s.n}>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                                ${done ? 'bg-secondary text-white' : active ? 'bg-primary text-white' : 'bg-neutral-gray/20 text-neutral-gray'}`}>
                                {done ? <CheckCircleIcon weight="fill" size={16} /> : s.n}
                            </div>
                            <span className={`text-sm font-semibold hidden sm:inline transition-colors
                                ${active ? 'text-text-dark dark:text-text-light' : done ? 'text-secondary' : 'text-neutral-gray'}`}>
                                {s.label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`h-px w-8 sm:w-12 mx-2 transition-colors ${current > s.n ? 'bg-secondary' : 'bg-neutral-gray/20'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

// ─── Order Summary ────────────────────────────────────────────────────────────
function OrderSummary({ orderType }: { orderType: OrderType }) {
    const { items, subtotal } = useCart();
    const { selectedBranch } = useBranch();
    const tax = subtotal * TAX_RATE;
    const delivery = orderType === 'delivery' ? (selectedBranch?.deliveryFee ?? DELIVERY_FEE) : 0;
    const total = subtotal + delivery + tax;

    return (
        <div className="bg-white dark:bg-brand-dark rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-text-dark dark:text-text-light">Order Summary</h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                    {items.length} item{items.length !== 1 ? 's' : ''}
                </span>
            </div>
            <div className="flex flex-col gap-3">
                {items.map(ci => (
                    <div key={ci.cartItemId} className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-primary/10 shrink-0">
                            {ci.item.image
                                ? <Image src={ci.item.image} alt={ci.item.name} fill sizes="48px" className="object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-lg">{ci.item.icon ?? '🍽️'}</div>
                            }
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
                <div className="flex justify-between">
                    <span className="text-neutral-gray">Subtotal</span>
                    <span className="font-semibold text-text-dark dark:text-text-light">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-neutral-gray">Delivery Fee</span>
                    <span className="font-semibold text-text-dark dark:text-text-light">
                        {orderType === 'delivery' ? formatPrice(delivery) : <span className="text-secondary">Free</span>}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-neutral-gray">Tax (2.5%)</span>
                    <span className="font-semibold text-text-dark dark:text-text-light">{formatPrice(tax)}</span>
                </div>
            </div>
            <div className="h-px bg-neutral-gray/10" />
            <div className="flex justify-between items-center">
                <span className="font-bold text-text-dark dark:text-text-light">Total</span>
                <span className="text-2xl font-bold text-primary">{formatPrice(total)}</span>
            </div>
        </div>
    );
}

// ─── Step 1 — Details ─────────────────────────────────────────────────────────
function StepDetails({
    orderType, setOrderType, contact, setContact, onNext,
}: {
    orderType: OrderType; setOrderType: (t: OrderType) => void;
    contact: ContactDetails; setContact: (c: ContactDetails) => void;
    onNext: () => void;
}) {
    const { selectedBranch } = useBranch();
    const { openBranchSelector } = useModal();

    const update = (field: keyof ContactDetails) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setContact({ ...contact, [field]: e.target.value });

    const canProceed = contact.name.trim() && contact.phone.trim() &&
        (orderType === 'pickup' || contact.address.trim());

    return (
        <div className="flex flex-col gap-5">

            {/* Delivery / Pickup toggle */}
            <div className="bg-white dark:bg-brand-dark rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
                <h2 className="font-bold text-text-dark dark:text-text-light">How do you want your order?</h2>
                <div className="grid grid-cols-2 gap-3">
                    {([
                        { type: 'delivery' as const, icon: <TruckIcon weight="fill" size={22} />, label: 'Delivery', sub: 'Delivered to you' },
                        { type: 'pickup' as const, icon: <BagIcon weight="fill" size={22} />, label: 'Pickup', sub: 'Pick up at branch' },
                    ]).map(({ type, icon, label, sub }) => (
                        <button
                            key={type} onClick={() => setOrderType(type)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-150
                                ${orderType === type ? 'border-primary bg-primary/8 text-primary' : 'border-neutral-gray/15 text-neutral-gray hover:border-primary/30'}`}
                        >
                            <span className={orderType === type ? 'text-primary' : 'text-neutral-gray'}>{icon}</span>
                            <span className="text-sm font-bold">{label}</span>
                            <span className="text-xs opacity-70">{sub}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Branch info — clicking Change Branch opens the modal */}
            {selectedBranch && (
                <div className="bg-white dark:bg-brand-dark rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-text-dark dark:text-text-light">
                            {orderType === 'delivery' ? 'Delivering From' : 'Pickup Location'}
                        </h2>
                        <button
                            onClick={openBranchSelector}
                            className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline"
                        >
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
                            <ClockIcon weight="fill" size={15} className="text-primary" />
                            <span>Estimated: <strong className="text-text-dark dark:text-text-light">25 – 40 mins</strong></span>
                            <span className="ml-auto text-xs font-semibold text-primary">
                                GHS {selectedBranch.deliveryFee} delivery fee
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Contact form */}
            <div className="bg-white dark:bg-brand-dark rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                <h2 className="font-bold text-text-dark dark:text-text-light">Your Details</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField icon={<UserIcon weight="fill" size={15} />} label="Full Name" required>
                        <input
                            type="text" placeholder="e.g. Kwame Mensah"
                            value={contact.name} onChange={update('name')}
                            className="w-full bg-transparent outline-none text-text-dark dark:text-text-light placeholder:text-neutral-gray/60"
                        />
                    </InputField>
                    <InputField icon={<PhoneIcon weight="fill" size={15} />} label="Phone Number" required>
                        <input
                            type="tel" placeholder="+233 24 000 0000"
                            value={contact.phone} onChange={update('phone')}
                            className="w-full bg-transparent outline-none text-text-dark dark:text-text-light placeholder:text-neutral-gray/60"
                        />
                    </InputField>
                </div>

                {/* Address search — only for delivery */}
                {orderType === 'delivery' && (
                    <AddressSearchField
                        value={contact.address}
                        onChange={addr => setContact({ ...contact, address: addr })}
                        placeholder="Search your delivery address..."
                    />
                )}

                {/* Note */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-gray flex items-center gap-1.5">
                        <NoteIcon weight="fill" size={13} /> Note to Rider (Optional)
                    </label>
                    <div className="bg-neutral-light dark:bg-brand-dark border-2 border-neutral-gray/50 focus-within:border-primary rounded-xl transition-all overflow-hidden">
                        <textarea
                            rows={2} placeholder="e.g. Call me when you reach the gate..."
                            value={contact.note} onChange={update('note')}
                            className="w-full px-3.5 py-3 text-sm bg-transparent outline-none resize-none text-text-dark dark:text-text-light placeholder:text-neutral-gray/60"
                        />
                    </div>
                </div>
            </div>

            <button
                onClick={onNext} disabled={!canProceed}
                className={`flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98]
                    ${canProceed ? 'bg-primary hover:bg-primary-hover text-white' : 'bg-neutral-gray/20 text-neutral-gray cursor-not-allowed'}`}
            >
                Continue to Payment <ArrowRightIcon weight="bold" size={18} />
            </button>
        </div>
    );
}

// ─── Step 2 — Payment ─────────────────────────────────────────────────────────
function StepPayment({
    paymentMethod, setPaymentMethod, orderType, contact, onBack, onPlace, placing,
}: {
    paymentMethod: PaymentMethod; setPaymentMethod: (m: PaymentMethod) => void;
    orderType: OrderType; contact: ContactDetails;
    onBack: () => void; onPlace: () => void; placing: boolean;
}) {
    const { subtotal } = useCart();
    const { selectedBranch } = useBranch();
    const { openBranchSelector } = useModal();

    const tax = subtotal * TAX_RATE;
    const delivery = orderType === 'delivery' ? (selectedBranch?.deliveryFee ?? DELIVERY_FEE) : 0;
    const total = subtotal + delivery + tax;

    const [momoPhone, setMomoPhone] = useState(contact.phone);
    const [momoNetwork, setMomoNetwork] = useState<'mtn' | 'telecel' | 'airteltigo'>('mtn');

    const methods = [
        { id: 'momo' as const, icon: <DeviceMobileIcon weight="fill" size={20} />, label: 'Mobile Money', sub: 'MTN MoMo · Telecel · AirtelTigo', color: 'text-warning' },
        { id: 'cash_delivery' as const, icon: <MoneyIcon weight="fill" size={20} />, label: 'Cash on Delivery', sub: 'Pay when your order arrives', color: 'text-secondary', hide: orderType === 'pickup' },
        { id: 'cash_pickup' as const, icon: <MoneyIcon weight="fill" size={20} />, label: 'Cash at Pickup', sub: 'Pay when you collect', color: 'text-secondary', hide: orderType === 'delivery' },
    ].filter(m => !m.hide);

    return (
        <div className="flex flex-col gap-5">

            {/* Recap */}
            <div className="bg-white dark:bg-brand-dark rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        {orderType === 'delivery' ? <TruckIcon weight="fill" size={18} className="text-primary" /> : <BagIcon weight="fill" size={18} className="text-primary" />}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-text-dark dark:text-text-light">{orderType === 'delivery' ? 'Delivering to' : 'Pickup at'}</p>
                        <p className="text-xs text-neutral-gray truncate max-w-[200px]">{orderType === 'delivery' ? contact.address : selectedBranch?.name + ' Branch'}</p>
                    </div>
                </div>
                <button onClick={onBack} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 shrink-0">
                    <PencilSimpleIcon size={12} /> Edit
                </button>
            </div>

            {/* Branch recap with change option */}
            {selectedBranch && (
                <div className="bg-white dark:bg-brand-dark rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <StorefrontIcon weight="fill" size={18} className="text-primary" />
                        <div>
                            <p className="text-sm font-bold text-text-dark dark:text-text-light">{selectedBranch.name} Branch</p>
                            <p className="text-xs text-neutral-gray">{selectedBranch.address}</p>
                        </div>
                    </div>
                    <button onClick={openBranchSelector} className="text-xs font-semibold text-primary hover:underline shrink-0">
                        Change
                    </button>
                </div>
            )}

            {/* Payment methods */}
            <div className="bg-white dark:bg-brand-dark rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                <h2 className="font-bold text-text-dark dark:text-text-light">Payment Method</h2>
                {methods.map(m => (
                    <div key={m.id}>
                        <button
                            onClick={() => setPaymentMethod(m.id)}
                            className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left
                                ${paymentMethod === m.id ? 'border-primary bg-primary/5' : 'border-neutral-gray/15 hover:border-primary/30'}`}
                        >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                                ${paymentMethod === m.id ? 'border-primary' : 'border-neutral-gray/40'}`}>
                                {paymentMethod === m.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                            </div>
                            <span className={`${m.color} shrink-0`}>{m.icon}</span>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-text-dark dark:text-text-light">{m.label}</p>
                                <p className="text-xs text-neutral-gray">{m.sub}</p>
                            </div>
                        </button>

                        {m.id === 'momo' && paymentMethod === 'momo' && (
                            <div className="mt-2 ml-4 flex flex-col gap-3 p-4 rounded-xl bg-neutral-light dark:bg-brown/30">
                                <div>
                                    <label className="text-xs font-semibold text-neutral-gray mb-1.5 block">Mobile Network</label>
                                    <div className="flex gap-2">
                                        {(['mtn', 'telecel', 'airteltigo'] as const).map(net => (
                                            <button key={net} onClick={() => setMomoNetwork(net)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all
                                                    ${momoNetwork === net ? 'border-primary bg-primary text-white' : 'border-neutral-gray/20 text-neutral-gray hover:border-primary/40'}`}
                                            >
                                                {net === 'airteltigo' ? 'AirtelTigo' : net.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <InputField icon={<PhoneIcon weight="fill" size={13} />} label="MoMo Number" required>
                                    <input
                                        type="tel" placeholder="+233 24 000 0000"
                                        value={momoPhone} onChange={e => setMomoPhone(e.target.value)}
                                        className="w-full bg-transparent outline-none placeholder:text-neutral-gray/60 text-text-dark dark:text-text-light"
                                    />
                                </InputField>
                                <p className="text-xs text-neutral-gray flex items-center gap-1">
                                    <LockIcon size={11} /> You'll receive a prompt on your phone to confirm payment
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex gap-3">
                <button onClick={onBack} className="flex items-center gap-2 px-5 py-4 rounded-2xl border-2 border-neutral-gray/20 font-bold text-neutral-gray hover:border-primary/40 hover:text-primary transition-all">
                    <ArrowLeftIcon weight="bold" size={16} /> Back
                </button>
                <button
                    onClick={onPlace} disabled={placing}
                    className="flex-1 flex items-center justify-between bg-brown dark:bg-brand-dark hover:bg-brown-light disabled:opacity-70 text-white font-bold px-6 py-4 rounded-2xl transition-all active:scale-[0.98] group"
                >
                    <span>{placing ? 'Placing Order...' : paymentMethod === 'momo' ? 'Pay & Place Order' : 'Place Order'}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-primary font-bold">{formatPrice(total)}</span>
                        <ArrowRightIcon weight="bold" size={18} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                </button>
            </div>
            <p className="text-xs text-center text-neutral-gray flex items-center justify-center gap-1">
                <LockIcon size={11} /> Secured · Encrypted · Powered by Hubtel
            </p>
        </div>
    );
}

// ─── Step 3 — Done ────────────────────────────────────────────────────────────
function StepDone({ orderNumber, orderType, contact }: {
    orderNumber: string; orderType: OrderType; contact: ContactDetails;
}) {
    return (
        <div className="flex flex-col items-center gap-6 py-8 text-center">
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
            <div className="bg-white dark:bg-brand-dark rounded-2xl p-5 w-full shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-gray">Order Number</span>
                    <span className="text-base font-bold text-primary font-mono">#{orderNumber}</span>
                </div>
                <div className="h-px bg-neutral-gray/10" />
                <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-gray">{orderType === 'delivery' ? 'Delivering to' : 'Pickup at'}</span>
                    <span className="text-sm font-semibold text-text-dark dark:text-text-light text-right max-w-[60%]">
                        {orderType === 'delivery' ? contact.address : 'Branch location'}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-gray">Estimated Time</span>
                    <span className="text-sm font-semibold text-text-dark dark:text-text-light">
                        {orderType === 'delivery' ? '25 – 40 mins' : '15 – 20 mins'}
                    </span>
                </div>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 w-full text-sm text-text-dark dark:text-text-light">
                A confirmation SMS has been sent to <strong>{contact.phone}</strong> with your tracking link.
            </div>
            <div className="flex flex-col gap-3 w-full">
                <Link href="/orders" className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98]">
                    Track My Order <ArrowRightIcon weight="bold" size={16} />
                </Link>
                <Link href="/" className="flex items-center justify-center text-sm font-semibold text-neutral-gray hover:text-primary transition-colors py-2">
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
            <Link href="/" className="bg-primary text-white font-bold px-8 py-3 rounded-2xl hover:bg-primary-hover transition-all">
                Browse Menu
            </Link>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
    const { items, clearCart } = useCart();

    const [step, setStep] = useState<Step>(1);
    const [orderType, setOrderType] = useState<OrderType>('delivery');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('momo');
    const [placing, setPlacing] = useState(false);
    const [orderNumber, setOrderNumber] = useState('');
    const [contact, setContact] = useState<ContactDetails>({ name: '', phone: '', address: '', note: '' });

    const handlePlaceOrder = useCallback(async () => {
        setPlacing(true);
        await new Promise(r => setTimeout(r, 1800));
        setOrderNumber(`CB${Date.now().toString().slice(-6)}`);
        clearCart();
        setPlacing(false);
        setStep(3);
    }, [clearCart]);

    if (items.length === 0 && step !== 3) return <EmptyCartGuard />;

    return (
        <div className="min-h-screen bg-neutral-light dark:bg-brand-darker pt-20 pb-12">
            <div className="w-[95%] md:w-[85%] xl:w-[75%] max-w-5xl mx-auto">

                <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-text-dark dark:text-text-light">
                            {step === 3 ? 'Order Confirmed' : 'Checkout'}
                        </h1>
                        {step !== 3 && <p className="text-sm text-neutral-gray mt-1">Complete your order details below</p>}
                    </div>
                    {step !== 3 && <StepIndicator current={step} />}
                </div>

                {step === 3 ? (
                    <div className="max-w-md mx-auto">
                        <StepDone orderNumber={orderNumber} orderType={orderType} contact={contact} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
                        <div>
                            {step === 1 && (
                                <StepDetails
                                    orderType={orderType} setOrderType={setOrderType}
                                    contact={contact} setContact={setContact}
                                    onNext={() => setStep(2)}
                                />
                            )}
                            {step === 2 && (
                                <StepPayment
                                    paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
                                    orderType={orderType} contact={contact}
                                    onBack={() => setStep(1)}
                                    onPlace={handlePlaceOrder}
                                    placing={placing}
                                />
                            )}
                        </div>
                        <div className="lg:sticky lg:top-24 h-fit">
                            <OrderSummary orderType={orderType} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}