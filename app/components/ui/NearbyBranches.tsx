'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    MapPinIcon, NavigationArrowIcon, MotorcycleIcon,
    CheckIcon, SpinnerGapIcon,
} from '@phosphor-icons/react';
import { useLocation } from '../providers/LocationProvider';
import { useBranch, type Branch, type BranchWithDistance } from '../providers/BranchProvider';
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

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-fg-muted">
                {icon} {label}
            </p>
            <p className="mt-1 text-sm font-bold text-fg tabular-nums">{value}</p>
        </div>
    );
}

/**
 * Where our kitchens are, and where you are, on one map.
 *
 * There was a list of every branch under this map. It said in words what the
 * pins already say, and on a phone it pushed the map off the screen. One card
 * for the shop you tapped does the job the list was doing without repeating the
 * map back to you.
 *
 * The distance is a straight line from `calculateDistance` and the bike time
 * comes from `estimateDeliveryTime`, which is the pair the branch switcher and
 * the nearest-branch logic already run on. Deliberately not a second estimate:
 * two numbers for one journey, disagreeing, is worse than one.
 */
export default function NearbyBranches() {
    const { coordinates, permissionStatus, requestLocation, error } = useLocation();
    const { branches, selectedBranch, setSelectedBranch, getBranchesWithDistance } = useBranch();
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

    // Two lookups rather than one union. `ranked` only exists once we know where
    // the customer is; `branches` always does. Keeping them apart means the
    // distance fields are typed where they exist and simply absent where they
    // do not, instead of a union that needs narrowing at every read.
    const measured: BranchWithDistance | null = ranked.find(b => b.id === activeId) ?? null;
    const active: Branch | null = measured ?? branches.find(b => b.id === activeId) ?? null;

    const distance = measured && Number.isFinite(measured.distance) ? measured.distance : null;
    const withinRange = measured ? measured.isWithinRadius : null;
    const isCurrent = active !== null && selectedBranch?.id === active.id;

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
                            <p className="text-xs text-fg-muted">Tap a shop on the map to see how far it is.</p>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-bold text-fg">
                                {denied ? 'Location is switched off' : 'Where should we cook for you?'}
                            </p>
                            <p className="text-xs text-fg-muted">
                                {denied
                                    ? 'Turn it back on in your browser settings to see which kitchen is closest.'
                                    : error ?? 'Share your location and we will show the nearest kitchen and how long the bike takes.'}
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
                onSelectBranch={selectFromMap}
            />

            {/* ── The one you tapped ────────────────────────────────────── */}
            {active && (
                <div className="card-lift mt-3 rounded-2xl bg-surface p-4">
                    <div className="flex items-center gap-2">
                        <h3 className="font-brand truncate text-2xl leading-none tracking-wide text-fg">
                            {active.name}
                        </h3>
                        {isCurrent && (
                            <span className="shrink-0 rounded-md bg-success-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success-ink">
                                Ordering here
                            </span>
                        )}
                    </div>

                    <p className="mt-1.5 flex items-center gap-2 text-xs">
                        <span aria-hidden className={`h-2 w-2 shrink-0 rounded-xs ${active.isOpen ? 'bg-success' : 'bg-danger'}`} />
                        <span className={`font-bold ${active.isOpen ? 'text-success-ink' : 'text-danger-ink'}`}>
                            {active.isOpen ? 'Open now' : 'Closed'}
                        </span>
                        <span className="truncate text-fg-muted">{active.operatingHours}</span>
                    </p>

                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                        {distance !== null && (
                            <Fact
                                icon={<NavigationArrowIcon size={12} weight="fill" />}
                                label="Distance"
                                value={`${distance.toFixed(1)} km`}
                            />
                        )}

                        {/* A bike time only means something if this shop would
                            actually ride to you. Outside its delivery radius the
                            honest answer is that it will not, rather than a
                            number in the hundreds of minutes. */}
                        {distance !== null && withinRange && measured && (
                            <Fact
                                icon={<MotorcycleIcon size={12} weight="fill" />}
                                label="On a bike"
                                value={measured.deliveryTime}
                            />
                        )}

                        <Fact
                            icon={<MapPinIcon size={12} weight="fill" />}
                            label="Address"
                            value={active.address}
                        />
                    </div>

                    {distance !== null && withinRange === false && (
                        <p className="mt-3 text-xs font-semibold text-warning-ink">
                            Too far for delivery from here. You can still collect.
                        </p>
                    )}

                    <button
                        onClick={() => setSelectedBranch(active)}
                        disabled={isCurrent}
                        className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-primary-fill px-4 text-sm font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95 disabled:pointer-events-none disabled:opacity-45"
                    >
                        {isCurrent
                            ? <><CheckIcon size={15} weight="bold" /> Ordering from here</>
                            : `Order from ${active.name}`}
                    </button>
                </div>
            )}
        </section>
    );
}
