'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { MapPinIcon, XIcon, SpinnerIcon } from '@phosphor-icons/react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddressSuggestion {
    id: string;
    mainText: string;
    secondaryText: string;
    fullAddress: string;
}

interface AddressSearchFieldProps {
    label?: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    required?: boolean;
    errorText?: string;
}

declare global {
    interface Window { google: any; }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddressSearchField({
    label,
    value,
    onChange,
    placeholder = 'Search delivery address...',
    required,
    errorText,
}: AddressSearchFieldProps) {
    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searching, setSearching] = useState(false);
    const [googleReady, setGoogleReady] = useState(false);
    const autocompleteRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync if parent resets the value (e.g. form reset)
    useEffect(() => { setQuery(value); }, [value]);

    // Check if Google Maps Places is already loaded by the root layout
    useEffect(() => {
        if (typeof window !== 'undefined' && window.google?.maps?.places) {
            setGoogleReady(true);
        }
    }, []);

    // Initialise the AutocompleteService once Google is ready
    useEffect(() => {
        if (googleReady && !autocompleteRef.current) {
            autocompleteRef.current = new window.google.maps.places.AutocompleteService();
        }
    }, [googleReady]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Nominatim fallback ────────────────────────────────────────────────────

    const fetchNominatim = useCallback(async (input: string) => {
        if (input.length < 3) { setSuggestions([]); return; }
        setSearching(true);
        try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input + ', Ghana')}&format=json&limit=6&addressdetails=1`;
            const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
            const data: any[] = await res.json();
            setSuggestions(data.map(r => ({
                id: String(r.place_id),
                mainText: r.address?.road
                    ? [r.address.house_number, r.address.road].filter(Boolean).join(' ')
                    : r.display_name.split(',')[0],
                secondaryText: [
                    r.address?.suburb,
                    r.address?.city ?? r.address?.town ?? r.address?.village,
                    r.address?.state,
                ].filter(Boolean).join(', '),
                fullAddress: r.display_name,
            })));
        } catch {
            setSuggestions([]);
        } finally {
            setSearching(false);
        }
    }, []);

    // ── Google Maps Places ────────────────────────────────────────────────────

    const fetchGoogle = useCallback((input: string) => {
        if (!autocompleteRef.current || input.length < 3) { setSuggestions([]); return; }
        setSearching(true);
        autocompleteRef.current.getPlacePredictions(
            { input, componentRestrictions: { country: 'gh' }, types: ['geocode', 'establishment'] },
            (preds: any[], status: string) => {
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
            }
        );
    }, []);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setQuery(v);
        onChange(v);
        setShowSuggestions(true);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            if (googleReady && autocompleteRef.current) fetchGoogle(v);
            else fetchNominatim(v);
        }, 300);
    };

    const handleSelect = (s: AddressSuggestion) => {
        setQuery(s.fullAddress);
        onChange(s.fullAddress);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleClear = () => {
        setQuery('');
        onChange('');
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const hasError = !!errorText;
    const borderClass = hasError
        ? 'border-error'
        : 'border-neutral-gray/50 focus-within:border-primary';

    return (
        <div ref={containerRef} className="relative flex flex-col gap-1.5 w-full">

            {label && (
                <label className="text-sm font-medium text-text-dark dark:text-text-light font-body">
                    {label}
                    {required && <span className="text-error ml-1" aria-hidden="true">*</span>}
                </label>
            )}

            {/* Input row */}
            <div className={`relative flex items-center bg-neutral-light dark:bg-brand-dark border-2 ${borderClass} rounded-full transition-all duration-150 overflow-hidden`}>
                <span className="pl-4 text-neutral-gray shrink-0 pointer-events-none">
                    <MapPinIcon size={20} weight={query ? 'fill' : 'regular'} className={query ? 'text-primary' : ''} />
                </span>

                <input
                    type="text"
                    value={query}
                    onChange={handleChange}
                    onFocus={() => { if (query.length >= 3) setShowSuggestions(true); }}
                    placeholder={placeholder}
                    autoComplete="off"
                    className="flex-1 pl-3 pr-3 py-3 md:py-4 text-base bg-transparent outline-none text-text-dark dark:text-text-light placeholder:text-neutral-gray font-body"
                />

                {/* Spinner while fetching */}
                {searching && (
                    <span className="pr-4 text-neutral-gray shrink-0">
                        <SpinnerIcon size={16} weight="bold" className="animate-spin" />
                    </span>
                )}

                {/* Clear */}
                {!searching && query && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="pr-4 text-neutral-gray hover:text-text-dark dark:hover:text-text-light transition-colors cursor-pointer shrink-0"
                        aria-label="Clear address"
                    >
                        <XIcon size={18} weight="bold" />
                    </button>
                )}
            </div>

            {/* Error */}
            {errorText && (
                <p className="text-sm text-error px-1 font-body">{errorText}</p>
            )}

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-brand-dark rounded-2xl shadow-xl border border-neutral-gray/15 overflow-hidden">
                    {suggestions.map((s, i) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => handleSelect(s)}
                            className={`
                                w-full flex items-start gap-3 px-4 py-3 text-left
                                hover:bg-primary/5 transition-colors cursor-pointer
                                ${i < suggestions.length - 1 ? 'border-b border-neutral-gray/10' : ''}
                            `}
                        >
                            <MapPinIcon weight="fill" size={14} className="text-primary mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-text-dark dark:text-text-light truncate font-body">
                                    {s.mainText}
                                </p>
                                {s.secondaryText && (
                                    <p className="text-xs text-neutral-gray truncate font-body">{s.secondaryText}</p>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
