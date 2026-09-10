'use client';

import { useLocation } from '@/app/components/providers/LocationProvider';
import { locationRecovery, type PermissionRecovery } from '@/lib/utils/locationPermission';
import { CaretDownIcon, MagnifyingGlassIcon, MapPinIcon, NavigationArrowIcon, SpinnerGapIcon, XIcon } from '@phosphor-icons/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Address Search ───────────────────────────────────────────────────────────
declare global { interface Window { google: any; initGooglePlaces: () => void; } }
interface AddressSuggestion { id: string; mainText: string; secondaryText: string; fullAddress: string; }

/**
 * Where the food is going.
 *
 * Google Places when there is a key, Nominatim when there is not. Neither is
 * asked anything until three characters are in, and both are biased towards
 * wherever the phone says it is.
 *
 * The field carries no label of its own any more. "Where it goes" is the
 * heading directly above it, and a second copy of that inside the box was one
 * of the four places this screen used to explain itself twice.
 */
export default function AddressSearchField({ value, onChange, placeholder, onDeviceFix }: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    /**
     * Fires with a position only when the box was filled from the phone's own
     * fix, and with null the moment somebody edits or picks something else.
     *
     * Deliberately not fired for a typed address or a chosen suggestion: we do
     * not look those up, so we would be storing a coordinate we cannot stand
     * behind. A rider following a wrong pin is worse off than one following
     * only the text.
     */
    onDeviceFix?: (position: { latitude: number; longitude: number } | null) => void;
}) {
    const { coordinates, permissionStatus, error, isSupported, deniedWithoutPrompt, requestLocation } = useLocation();
    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [locating, setLocating] = useState(false);
    /**
     * They pressed the button and the browser has not answered yet.
     *
     * Pressing it used to call `requestLocation()` and stop there, on the
     * assumption they would press again once permission was granted. Nothing
     * on screen said so, so the first press looked like a dead button and the
     * address never filled. This remembers the press and finishes the job the
     * moment a position arrives.
     */
    const [awaitingFix, setAwaitingFix] = useState(false);
    const [locationError, setLocationError] = useState('');
    /** Read after mount: the user agent is a client fact. */
    const [recovery, setRecovery] = useState<PermissionRecovery | null>(null);
    const [showSteps, setShowSteps] = useState(false);
    const [searching, setSearching] = useState(false);
    const [googleReady, setGoogleReady] = useState(false);
    const autocompleteRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // A value filled in from somewhere else, such as the "last time" button,
    // has to reach the box the reader is looking at.
    useEffect(() => { setQuery(value); }, [value]);

    useEffect(() => { setRecovery(locationRecovery()); }, []);

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
        const h = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowSuggestions(false);
        };
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
            if (status === 'OK' && preds) setSuggestions(preds.map(p => ({
                id: p.place_id,
                mainText: p.structured_formatting?.main_text ?? p.description,
                secondaryText: p.structured_formatting?.secondary_text ?? '',
                fullAddress: p.description,
            })));
            else setSuggestions([]);
        });
    }, [coordinates]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setQuery(v); onChange(v); setShowSuggestions(true);
        onDeviceFix?.(null);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(
            () => (googleReady && autocompleteRef.current ? fetchGoogle(v) : fetchNominatim(v)),
            300,
        );
    };

    /** Turn a position into something a rider can read, and put it in the box. */
    const fillFromCoordinates = useCallback(async (lat: number, lon: number) => {
        setLocating(true);
        setLocationError('');
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
                { headers: { 'Accept-Language': 'en' } },
            );
            const data = await res.json();
            const a = data.address ?? {};
            const parts = [
                a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road,
                a.suburb ?? a.neighbourhood,
                a.city ?? a.town ?? a.village,
            ].filter(Boolean);
            const addr = parts.length > 0 ? parts.join(', ') : data.display_name;
            if (addr) {
                setQuery(addr);
                onChange(addr);
                onDeviceFix?.({ latitude: lat, longitude: lon });
            }
            else setLocationError('Could not name that spot. Type the address instead.');
        } catch {
            setLocationError('Could not reach the map. Type the address instead.');
        } finally {
            setLocating(false);
        }
    }, [onChange, onDeviceFix]);

    const handleUseMyLocation = () => {
        setLocationError('');

        if (coordinates) {
            void fillFromCoordinates(coordinates.latitude, coordinates.longitude);
            return;
        }

        // No position yet. Ask, hold the spinner, and let the effect below
        // finish it when the browser answers.
        setAwaitingFix(true);
        setLocating(true);
        requestLocation();
    };

    /**
     * The second half of a press made before the browser had answered.
     *
     * Granting permission is not the same as having a position, and the gap
     * between them is a network round trip on a cold GPS. Whoever pressed the
     * button is still waiting, so the address fills itself when the fix lands.
     *
     * It used to stop waiting only on an outright refusal, so a fix that timed
     * out or came back unavailable left the spinner turning until the page was
     * reloaded. Anything that is no longer `loading` and has produced no
     * position has finished, one way or the other.
     */
    useEffect(() => {
        if (!awaitingFix) return;

        if (coordinates) {
            setAwaitingFix(false);
            void fillFromCoordinates(coordinates.latitude, coordinates.longitude);
            return;
        }

        if (permissionStatus === 'loading') return;

        setAwaitingFix(false);
        setLocating(false);
        // A refusal gets the recovery steps below instead. Saying it twice, once
        // as a red line and once as a panel, helps nobody.
        setLocationError(permissionStatus === 'denied' ? '' : error ?? 'Could not find you. Type the address instead.');
    }, [awaitingFix, coordinates, permissionStatus, error, fillFromCoordinates]);

    return (
        <div ref={containerRef} className="relative">
            <div className="flex min-h-12 items-center rounded-xl border border-hairline bg-surface transition-colors duration-150 ease-out focus-within:border-fg">
                <MagnifyingGlassIcon size={16} weight="bold" className="ml-3.5 shrink-0 text-fg-subtle" />
                <input
                    type="text"
                    autoComplete="street-address"
                    value={query}
                    onChange={handleChange}
                    onFocus={() => query.length >= 3 && setShowSuggestions(true)}
                    placeholder={placeholder}
                    className="min-w-0 flex-1 bg-transparent px-3 text-fg outline-none placeholder:text-fg-subtle"
                />
                {query && (
                    <button
                        onClick={() => { setQuery(''); onChange(''); setSuggestions([]); }}
                        aria-label="Clear the address"
                        className="grid h-11 w-11 shrink-0 place-items-center text-fg-subtle transition-colors duration-150 ease-out hover:text-fg"
                    >
                        <XIcon size={15} weight="bold" />
                    </button>
                )}
            </div>

            {/*
              * Shown to anybody the browser has not refused.
              *
              * This used to be gated on `coordinates`, so it appeared only for
              * somebody who had already granted location on another screen.
              * Everybody else, which is most people arriving at checkout, never
              * saw the one control that would have saved them typing an address
              * on a phone. Pressing it is what asks for permission now.
              */}
            {permissionStatus !== 'denied' && isSupported && (
                <button
                    onClick={handleUseMyLocation}
                    disabled={locating || permissionStatus === 'loading'}
                    className="mt-2 flex items-center gap-1.5 text-[13px] font-bold text-fg underline underline-offset-4 transition-opacity duration-150 ease-out hover:opacity-70 disabled:opacity-50"
                >
                    {locating
                        ? <SpinnerGapIcon size={13} className="animate-spin" />
                        : <NavigationArrowIcon size={13} weight="fill" />}
                    {locating ? 'Finding you' : 'Use where I am now'}
                </button>
            )}

            {locationError && (
                <p className="mt-2 text-[13px] font-semibold text-danger-ink">{locationError}</p>
            )}

            {/*
              * The refusal, and what to do about it.
              *
              * "Location is blocked for this site" was true and useless. On an
              * iPhone with Chrome's Location switch set to Never the site is
              * never asked at all, so nothing a customer changes in Chrome will
              * help them; the switch is three screens into iOS Settings. This
              * names the screens for the device in hand and offers the retry,
              * so nobody has to reload to find out whether it worked.
              */}
            {permissionStatus === 'denied' && recovery && (
                <div className="mt-2.5 rounded-xl bg-surface-sunken px-3.5 py-3">
                    <button
                        onClick={() => setShowSteps(v => !v)}
                        aria-expanded={showSteps}
                        className="flex w-full items-center gap-2 text-left"
                    >
                        <span className="min-w-0 flex-1 text-[13px] font-bold text-fg">
                            {deniedWithoutPrompt
                                ? 'Your phone is blocking this, not the site'
                                : 'Location is off for this site'}
                        </span>
                        <CaretDownIcon
                            size={13}
                            weight="bold"
                            className={`shrink-0 text-fg-muted transition-transform duration-150 ease-out ${showSteps ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {showSteps ? (
                        <div className="mt-3">
                            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-fg-muted">
                                {recovery.device}
                            </p>
                            <ol className="mt-2 flex flex-col gap-2">
                                {recovery.steps.map((step, i) => (
                                    <li key={step} className="flex gap-2.5">
                                        <span className="grid h-4.5 w-4.5 shrink-0 place-items-center rounded-lg bg-fg text-[10px] font-bold tabular-nums text-surface">
                                            {i + 1}
                                        </span>
                                        <span className="text-[13px] leading-relaxed text-fg">{step}</span>
                                    </li>
                                ))}
                            </ol>
                            <button
                                onClick={handleUseMyLocation}
                                className="mt-3 text-[13px] font-bold text-fg underline underline-offset-4 transition-opacity duration-150 ease-out hover:opacity-70"
                            >
                                I have changed it, try again
                            </button>
                        </div>
                    ) : (
                        <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
                            Type the address instead, or tap to see how to turn it back on.
                        </p>
                    )}
                </div>
            )}

            {showSuggestions && (searching || suggestions.length > 0) && (
                <div className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-hairline bg-surface shadow-float">
                    {searching && suggestions.length === 0 ? (
                        <p className="flex items-center gap-2 px-4 py-3.5 text-sm text-fg-muted">
                            <SpinnerGapIcon size={14} className="animate-spin" /> Looking
                        </p>
                    ) : (
                        <ul className="divide-y divide-hairline">
                            {suggestions.map(s => (
                                <li key={s.id}>
                                    <button
                                        onClick={() => {
                                            setQuery(s.fullAddress); onChange(s.fullAddress);
                                            onDeviceFix?.(null);
                                            setSuggestions([]); setShowSuggestions(false);
                                        }}
                                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 ease-out hover:bg-surface-sunken"
                                    >
                                        <MapPinIcon size={14} weight="fill" className="mt-0.5 shrink-0 text-fg-subtle" />
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-semibold text-fg">{s.mainText}</span>
                                            {s.secondaryText && (
                                                <span className="mt-0.5 block truncate text-[13px] text-fg-muted">{s.secondaryText}</span>
                                            )}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
