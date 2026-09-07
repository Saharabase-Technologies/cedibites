'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';

interface Coordinates {
    latitude: number;
    longitude: number;
}

/**
 * `unknown` is not `prompt`.
 *
 * WebKit does not implement `navigator.permissions.query({ name: 'geolocation' })`,
 * so on every iPhone the query rejects and we simply do not know the answer.
 * The old code opened at `loading`, had no `.catch()`, and therefore sat at
 * `loading` forever on iOS. Every control gated on it stayed disabled, which is
 * why the "Use where I am now" button on checkout looked dead until a reload
 * put a stored position back into state.
 */
type PermissionState = 'granted' | 'denied' | 'prompt' | 'unknown' | 'loading';

interface LocationContextType {
    coordinates: Coordinates | null;
    permissionStatus: PermissionState;
    error: string | null;
    /** Whether this browser has geolocation at all. */
    isSupported: boolean;
    /**
     * The refusal came back with no dialog on screen.
     *
     * On iOS a browser whose Location switch is set to Never fails instantly:
     * the page never gets a prompt, so the customer sees nothing happen and
     * concludes the button is broken. The site's own permission cannot be the
     * cause when the site was never asked. Used only to decide which recovery
     * steps to show.
     */
    deniedWithoutPrompt: boolean;
    requestLocation: () => void;
    clearLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
    children: ReactNode;
    autoRequest?: boolean;
}

const STORAGE_KEY = 'user-location';

/**
 * This device has said yes at least once.
 *
 * WebKit never answers the permission query, so on an iPhone the "already
 * granted, just fetch the position" path can never fire — `permissionStatus`
 * sits at `unknown` forever and no amount of returning to the site brings the
 * nearest branch back once the stored fix has aged out. Recording our own
 * successes is the only evidence available there.
 *
 * It is only ever used to decide whether calling `getCurrentPosition` is
 * silent. A browser that has granted the permission answers without a dialog;
 * one that has since had it revoked refuses without one either, and that
 * refusal is handled like any other.
 */
const GRANTED_BEFORE_KEY = 'user-location-granted';

/**
 * How long a stored fix is worth reusing.
 *
 * The old code wrote a timestamp, said in a comment that it expired after an
 * hour, and then never read it back. A position from three days ago was handed
 * to the nearest-branch rule as though the phone had just reported it.
 */
const STORED_FIX_MAX_AGE_MS = 60 * 60 * 1000;

/** Under this, no human saw a permission dialog. See `deniedWithoutPrompt`. */
const NO_PROMPT_MS = 400;

export function LocationProvider({ children, autoRequest = false }: LocationProviderProps) {
    const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<PermissionState>('loading');
    const [error, setError] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(true);
    const [deniedWithoutPrompt, setDeniedWithoutPrompt] = useState(false);

    /** Guards the one automatic call for somebody who already said yes. */
    const restoredRef = useRef(false);

    // ── A position this device recorded recently ────────────────────────────
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;

            const parsed = JSON.parse(raw) as Partial<Coordinates & { timestamp: number }>;
            const fresh = typeof parsed.timestamp === 'number'
                && Date.now() - parsed.timestamp < STORED_FIX_MAX_AGE_MS;

            if (fresh && Number.isFinite(parsed.latitude) && Number.isFinite(parsed.longitude)) {
                setCoordinates({ latitude: parsed.latitude!, longitude: parsed.longitude! });
                return;
            }

            localStorage.removeItem(STORAGE_KEY);
        } catch {
            try { localStorage.removeItem(STORAGE_KEY); } catch { /* private window */ }
        }
    }, []);

    // ── What the browser is willing to tell us about the permission ─────────
    useEffect(() => {
        if (typeof navigator === 'undefined') return;

        if (!('geolocation' in navigator)) {
            setIsSupported(false);
            setPermissionStatus('unknown');
            return;
        }

        if (!('permissions' in navigator) || !navigator.permissions?.query) {
            setPermissionStatus('unknown');
            return;
        }

        let live: PermissionStatus | null = null;
        const onChange = () => {
            if (live) setPermissionStatus(live.state as PermissionState);
        };

        navigator.permissions
            .query({ name: 'geolocation' as PermissionName })
            .then(result => {
                live = result;
                setPermissionStatus(result.state as PermissionState);
                result.addEventListener('change', onChange);
            })
            // Safari and every browser on iOS land here. Not knowing is a state
            // of its own, and it must never leave a control disabled.
            .catch(() => setPermissionStatus('unknown'));

        return () => live?.removeEventListener('change', onChange);
    }, []);

    const requestLocation = useCallback(() => {
        setError(null);
        setDeniedWithoutPrompt(false);

        if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
            setIsSupported(false);
            setError('This browser cannot share a location.');
            setPermissionStatus('denied');
            return;
        }

        setPermissionStatus('loading');
        const askedAt = Date.now();

        navigator.geolocation.getCurrentPosition(
            position => {
                const coords = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                };

                setCoordinates(coords);
                setPermissionStatus('granted');
                setError(null);

                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...coords, timestamp: Date.now() }));
                    localStorage.setItem(GRANTED_BEFORE_KEY, '1');
                } catch { /* private window */ }
            },
            failure => {
                if (failure.code === failure.PERMISSION_DENIED) {
                    // Whatever this device agreed to before, it has stopped.
                    try { localStorage.removeItem(GRANTED_BEFORE_KEY); } catch { /* private window */ }
                    setPermissionStatus('denied');
                    setDeniedWithoutPrompt(Date.now() - askedAt < NO_PROMPT_MS);
                    setError('We cannot see your location.');
                    return;
                }

                // Position unavailable or timed out. The permission is intact
                // and asking again in a minute may well work, so this must not
                // be recorded as a refusal.
                setPermissionStatus('unknown');
                setError(
                    failure.code === failure.TIMEOUT
                        ? 'That took too long. Try again, or pick your branch below.'
                        : 'Your phone could not fix a position just now.',
                );
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000,
            },
        );
    }, []);

    /**
     * Ask the browser where we are once it has already agreed to tell us.
     *
     * Permission granted and position known are two different things, and only
     * the first survives a reload. Nothing called `requestLocation` for a
     * customer who had said yes on a previous visit, so `coordinates` stayed
     * null and the nearest-branch rule that the whole permission exists for
     * never ran.
     *
     * No dialog comes of this. The browser has the answer and hands it over.
     * Guarded by a ref so a position that later goes stale does not start a
     * loop.
     */
    useEffect(() => {
        if (coordinates || restoredRef.current) return;

        if (permissionStatus === 'granted') {
            restoredRef.current = true;
            requestLocation();
            return;
        }

        // iPhone. The browser will not say whether it has the permission, so
        // the record of a previous success stands in for the answer.
        if (permissionStatus === 'unknown') {
            let grantedBefore = false;
            try { grantedBefore = localStorage.getItem(GRANTED_BEFORE_KEY) === '1'; } catch { return; }
            if (!grantedBefore) return;

            restoredRef.current = true;
            requestLocation();
        }
    }, [permissionStatus, coordinates, requestLocation]);

    useEffect(() => {
        if (autoRequest && permissionStatus === 'prompt') requestLocation();
    }, [autoRequest, permissionStatus, requestLocation]);

    const clearLocation = useCallback(() => {
        setCoordinates(null);
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* private window */ }
    }, []);

    return (
        <LocationContext.Provider
            value={{
                coordinates,
                permissionStatus,
                error,
                isSupported,
                deniedWithoutPrompt,
                requestLocation,
                clearLocation,
            }}
        >
            {children}
        </LocationContext.Provider>
    );
}

export function useLocation() {
    const context = useContext(LocationContext);
    if (!context) {
        throw new Error('useLocation must be used within LocationProvider');
    }
    return context;
}
