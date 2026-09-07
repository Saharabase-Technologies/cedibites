'use client';

import React from 'react';
import { useLocation } from '@/app/components/providers/LocationProvider';
import { MagnifyingGlassIcon, MapPinIcon, NavigationArrowIcon, SpinnerGapIcon, XIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Address Search ───────────────────────────────────────────────────────────
declare global { interface Window { google: any; initGooglePlaces: () => void; } }
interface AddressSuggestion { id: string; mainText: string; secondaryText: string; fullAddress: string; }

export default function AddressSearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
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
