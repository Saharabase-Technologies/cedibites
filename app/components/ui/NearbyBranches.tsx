'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavigationArrowIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { useLocation } from '../providers/LocationProvider';
import { useBranch } from '../providers/BranchProvider';
import { useBranchRoute } from '@/lib/api/hooks/useBranches';
import { deliveryWindowFromMinutes, estimateTravelMinutes, formatRideMinutes } from '@/lib/utils/distance';
import { decodePolyline } from '@/lib/utils/polyline';
import BlockHeading from './BlockHeading';
import BranchMap from './BranchMap';

/**
 * Reverse geocode, only for a name to put beside the pin.
 *
 * The Maps JS API is already on the page for the checkout address field, so
 * this costs a call rather than a new dependency. It is entirely optional: if
 * the script has not loaded, the call fails, or the answer is unhelpful, the
 * card falls back to a plain line and nothing else changes. A coordinate pair
 * on screen would be worse than no name at all.
 */
function useAreaName(coords: { latitude: number; longitude: number } | null) {
    const [area, setArea] = useState<string | null>(null);

    useEffect(() => {
        if (!coords) { setArea(null); return; }

        const maps = (window as unknown as { google?: { maps?: { Geocoder?: new () => google.maps.Geocoder } } }).google?.maps;
        if (!maps?.Geocoder) return;

        let cancelled = false;
        const geocoder = new maps.Geocoder();

        geocoder.geocode(
            { location: { lat: coords.latitude, lng: coords.longitude } },
            (results, status) => {
                if (cancelled || status !== 'OK' || !results?.length) return;
                // Prefer the smallest meaningful place: a neighbourhood reads
                // better than "Greater Accra Region".
                const wanted = ['neighborhood', 'sublocality', 'locality', 'administrative_area_level_2'];
                for (const type of wanted) {
                    const hit = results
                        .flatMap(r => r.address_components ?? [])
                        .find(c => c.types.includes(type));
                    if (hit?.long_name) { setArea(hit.long_name); return; }
                }
            },
        );

        return () => { cancelled = true; };
    }, [coords]);

    return area;
}

/**
 * Where our kitchens are, and where you are, on one map.
 *
 * Under this map there was a list of every branch, then a card for whichever
 * shop you tapped. Both wrote out in words what the pins already show, and on a
 * phone they pushed the map itself off the screen. Tapping a shop now turns its
 * pin red, draws its delivery radius, and runs a dotted line to you with the
 * minutes on it. You can see whether your own pin falls inside the ring.
 *
 * That line follows real roads and carries a real drive time when the server can
 * reach Google's Routes API, and falls back to a straight line and a 30 km/h
 * estimate when it cannot. Both are worded identically on purpose. A customer
 * has no use for knowing which one they got, and the map must not look broken on
 * the day the routing key expires.
 *
 * Choosing which kitchen to order from stays with the chip in the header, which
 * checks the cart before it switches. This section only shows you where they
 * are.
 */
export default function NearbyBranches() {
    const { coordinates, permissionStatus, requestLocation, error } = useLocation();
    const { branches, selectedBranch, getBranchesWithDistance } = useBranch();
    const [activeId, setActiveId] = useState<string | null>(null);

    /**
     * Spin only while a request this button started is in flight.
     *
     * The provider's `permissionStatus` opens at 'loading' and is only moved off
     * it by `navigator.permissions.query`. On any browser without the
     * Permissions API that never runs, so the status stays 'loading' for the
     * life of the page. Gating the button on it would leave it disabled forever
     * on exactly the devices most likely to be affected.
     */
    const [asking, setAsking] = useState(false);
    const ask = () => { setAsking(true); requestLocation(); };

    const area = useAreaName(coordinates);

    const ranked = useMemo(
        () => (coordinates ? getBranchesWithDistance(coordinates.latitude, coordinates.longitude) : []),
        [coordinates, getBranchesWithDistance],
    );

    const nearest = ranked.find(b => Number.isFinite(b.distance)) ?? null;

    // The drive down real roads, when the server can get one. Null otherwise,
    // and everything below simply falls back.
    const road = useBranchRoute(activeId, coordinates);

    /**
     * The journey to the shop you tapped, for the line on the map.
     *
     * Memoised because it drives the effect that draws that line. A fresh
     * object on every render would tear down the polyline and its plate and
     * build them again, several times a second, for a journey that has not
     * changed.
     *
     * One number feeds the whole plate. Whether the minutes came off a real
     * route or off the flat estimate, the delivery window above the fold is
     * built from the same figure, so the two lines cannot contradict each other.
     *
     * `withinRadius` deliberately stays on the straight-line distance. That is
     * the rule the delivery gate runs on everywhere else, and a road that winds
     * is not a reason to refuse a customer the shop would happily ride to.
     */
    const journey = useMemo(() => {
        const measured = ranked.find(b => b.id === activeId);
        if (!measured || !Number.isFinite(measured.distance)) return null;

        const minutes = road?.duration_minutes ?? estimateTravelMinutes(measured.distance);

        return {
            distanceLabel: road?.distance_km !== undefined
                ? `${road.distance_km.toFixed(1)} km by road`
                : `${measured.distance.toFixed(1)} km away`,
            rideTime: formatRideMinutes(minutes),
            deliveryTime: deliveryWindowFromMinutes(minutes),
            withinRadius: measured.isWithinRadius,
            path: road?.polyline ? decodePolyline(road.polyline) : null,
        };
    }, [ranked, activeId, road]);

    // Stable, so the map's marker effect does not tear down and rebuild every
    // pin on each render of this section.
    const selectFromMap = useCallback((id: string) => setActiveId(id), []);

    // Open on the kitchen you are already ordering from, or on the nearest one.
    useEffect(() => {
        if (activeId !== null) return;
        if (selectedBranch) setActiveId(selectedBranch.id);
        else if (nearest) setActiveId(nearest.id);
    }, [activeId, selectedBranch, nearest]);

    // Stop spinning whichever way the browser answered.
    useEffect(() => {
        if (coordinates || permissionStatus === 'denied' || error) setAsking(false);
    }, [coordinates, permissionStatus, error]);

    if (branches.length === 0) return null;

    const denied = permissionStatus === 'denied';

    return (
        <section className="page-x">
            <div className="mb-5">
                <BlockHeading tone="red" size="lg">Where we are</BlockHeading>
            </div>

            {/* ── Where the customer is ─────────────────────────────────── */}
            <div className="card-lift mb-3 flex items-center gap-3 rounded-2xl bg-surface p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent-soft">
                    <NavigationArrowIcon size={19} weight="fill" className="text-accent-ink" />
                </span>

                <div className="min-w-0 flex-1">
                    {coordinates ? (
                        <>
                            <p className="truncate text-sm font-bold text-fg">
                                {area ? `You're near ${area}` : "We've got your location"}
                            </p>
                            <p className="text-xs text-fg-muted">Tap a shop to see how long it takes to reach you.</p>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-bold text-fg">
                                {denied ? 'Location is switched off' : 'Where should we cook for you?'}
                            </p>
                            <p className="text-xs text-fg-muted">
                                {denied
                                    ? 'Turn it back on in your browser settings to see which kitchen is closest.'
                                    : error ?? 'Share your location and we will show you which kitchen is closest.'}
                            </p>
                        </>
                    )}
                </div>

                {!coordinates && !denied && (
                    <button
                        onClick={ask}
                        disabled={asking}
                        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-primary-fill px-4 text-sm font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95 disabled:opacity-60"
                    >
                        {asking ? <><SpinnerGapIcon size={15} className="animate-spin" /> Finding</> : 'Use my location'}
                    </button>
                )}
            </div>

            {/* Renders nothing at all if the Maps script never arrives, rather
                than leaving a grey rectangle where a map should be. */}
            <BranchMap
                coords={coordinates}
                branches={branches}
                activeId={activeId}
                nearestId={nearest?.id ?? null}
                journey={journey}
                onSelectBranch={selectFromMap}
            />
        </section>
    );
}
