'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    MapPinIcon, NavigationArrowIcon, StorefrontIcon,
    MotorcycleIcon, CaretDownIcon, CheckIcon, SpinnerGapIcon,
} from '@phosphor-icons/react';
import { useLocation } from '../providers/LocationProvider';
import { useBranch, type BranchWithDistance } from '../providers/BranchProvider';
import BlockHeading from './BlockHeading';
import BranchMap from './BranchMap';

/**
 * Reverse geocode, only for a name to put beside the pin.
 *
 * The Maps JS API is already on the page for the checkout address field, so
 * this costs a call rather than a new dependency. It is entirely optional: if
 * the script has not loaded, the call fails, or the answer is unhelpful, the
 * card falls back to "Using your location" and nothing else changes. A
 * coordinate pair on screen would be worse than no name at all.
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

function BranchRow({
    branch, expanded, onToggle, isCurrent, onChoose,
}: {
    branch: BranchWithDistance;
    expanded: boolean;
    onToggle: () => void;
    isCurrent: boolean;
    onChoose: () => void;
}) {
    return (
        <div className="card-lift overflow-hidden rounded-2xl bg-surface">
            <button
                onClick={onToggle}
                aria-expanded={expanded}
                className="flex w-full items-center gap-3 p-4 text-left"
            >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary-soft">
                    <StorefrontIcon size={19} weight="fill" className="text-primary-ink" />
                </span>

                <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                        <span className="font-brand truncate text-xl leading-none tracking-wide text-fg">
                            {branch.name}
                        </span>
                        {isCurrent && (
                            <span className="shrink-0 rounded-md bg-success-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success-ink">
                                Ordering here
                            </span>
                        )}
                    </span>
                    <span className="mt-1 flex items-center gap-2 text-xs">
                        <span aria-hidden className={`h-2 w-2 shrink-0 rounded-xs ${branch.isOpen ? 'bg-success' : 'bg-danger'}`} />
                        <span className={`font-bold ${branch.isOpen ? 'text-success-ink' : 'text-danger-ink'}`}>
                            {branch.isOpen ? 'Open' : 'Closed'}
                        </span>
                        {Number.isFinite(branch.distance) && (
                            <span className="text-fg-muted tabular-nums">{branch.distance.toFixed(1)} km away</span>
                        )}
                    </span>
                </span>

                <CaretDownIcon
                    size={16}
                    weight="bold"
                    className={`shrink-0 text-fg-muted transition-transform duration-150 ease-out ${expanded ? 'rotate-180' : ''}`}
                />
            </button>

            {expanded && (
                <div className="border-t border-hairline px-4 pb-4 pt-3">
                    <div className="flex flex-wrap gap-x-6 gap-y-3">
                        {/* Both of these are computed from the distance, so a
                            branch with no coordinates on file shows neither
                            rather than "NaN-NaN mins". */}
                        {Number.isFinite(branch.distance) && (
                            <>
                                <div>
                                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-fg-muted">
                                        <MotorcycleIcon size={12} weight="fill" /> On a bike
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-fg tabular-nums">{branch.deliveryTime}</p>
                                </div>
                                <div>
                                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-fg-muted">
                                        <NavigationArrowIcon size={12} weight="fill" /> Distance
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-fg tabular-nums">{branch.distance.toFixed(1)} km</p>
                                </div>
                            </>
                        )}
                        <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-fg-muted">
                                <MapPinIcon size={12} weight="fill" /> Address
                            </p>
                            <p className="mt-1 text-sm font-semibold text-fg">{branch.address}</p>
                        </div>
                    </div>

                    {Number.isFinite(branch.distance) && !branch.isWithinRadius && (
                        <p className="mt-3 text-xs font-semibold text-warning-ink">
                            Outside this branch&rsquo;s delivery range. You can still collect.
                        </p>
                    )}

                    <button
                        onClick={onChoose}
                        disabled={isCurrent}
                        className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-primary-fill px-4 text-sm font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95 disabled:pointer-events-none disabled:opacity-45"
                    >
                        {isCurrent ? <><CheckIcon size={15} weight="bold" /> Ordering from here</> : `Order from ${branch.name}`}
                    </button>
                </div>
            )}
        </div>
    );
}

/**
 * Which kitchen is nearest, and what that means in minutes.
 *
 * The branch chip in the header says which branch you are ordering from. It
 * does not say how far away it is, whether a nearer one exists, or whether the
 * one you are on will even deliver to where you are standing. This does.
 *
 * The distance is a straight line from `calculateDistance`, and the bike time
 * comes from `estimateDeliveryTime`, which is the same pair the branch switcher
 * and the nearest-branch logic already run on. Deliberately not a second
 * estimate: two numbers for one journey, disagreeing, is worse than one.
 */
export default function NearbyBranches() {
    const { coordinates, permissionStatus, requestLocation, error } = useLocation();
    const { branches, selectedBranch, setSelectedBranch, getBranchesWithDistance } = useBranch();
    const [expanded, setExpanded] = useState<string | null>(null);

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

    // The nearest one opens by default. It is the answer most people came for,
    // and an accordion where everything starts shut asks for a tap to say
    // anything at all.
    useEffect(() => {
        if (ranked.length > 0 && expanded === null) setExpanded(ranked[0].id);
    }, [ranked, expanded]);

    // Stable, so the map's marker effect does not tear down and rebuild every
    // pin on each render of this section.
    const selectFromMap = useCallback((id: string) => setExpanded(id), []);

    // Stop spinning whichever way the browser answered.
    useEffect(() => {
        if (coordinates || permissionStatus === 'denied' || error) setAsking(false);
    }, [coordinates, permissionStatus, error]);

    if (branches.length === 0) return null;

    const denied = permissionStatus === 'denied';

    return (
        <section className="page-x">
            <div className="mb-5">
                <BlockHeading tone="red" size="lg">Where are you?</BlockHeading>
            </div>

            {/* ── The map ───────────────────────────────────────────────── */}
            {/* Renders nothing at all if the Maps script never arrives, rather
                than leaving a grey rectangle where a map should be. */}
            <BranchMap
                coords={coordinates}
                branches={branches}
                activeId={expanded}
                onSelectBranch={selectFromMap}
            />

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
                            <p className="text-xs text-fg-muted">
                                {ranked.length === 1
                                    ? 'One kitchen, sorted by how far it is'
                                    : `${ranked.length} kitchens, nearest first`}
                            </p>
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

            {/* ── The branches ──────────────────────────────────────────── */}
            <div className="flex flex-col gap-3">
                {coordinates
                    ? ranked.map(branch => (
                        <BranchRow
                            key={branch.id}
                            branch={branch}
                            expanded={expanded === branch.id}
                            onToggle={() => setExpanded(expanded === branch.id ? null : branch.id)}
                            isCurrent={selectedBranch?.id === branch.id}
                            onChoose={() => setSelectedBranch(branch)}
                        />
                    ))
                    : branches.map(branch => (
                        // Without a location there is no distance and no bike
                        // time, so the row shows what is true: the name, whether
                        // it is cooking, and where it is.
                        <div key={branch.id} className="card-lift flex items-center gap-3 rounded-2xl bg-surface p-4">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary-soft">
                                <StorefrontIcon size={19} weight="fill" className="text-primary-ink" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="font-brand truncate text-xl leading-none tracking-wide text-fg">{branch.name}</p>
                                <p className="mt-1 flex items-center gap-2 text-xs">
                                    <span aria-hidden className={`h-2 w-2 shrink-0 rounded-xs ${branch.isOpen ? 'bg-success' : 'bg-danger'}`} />
                                    <span className={`font-bold ${branch.isOpen ? 'text-success-ink' : 'text-danger-ink'}`}>
                                        {branch.isOpen ? 'Open' : 'Closed'}
                                    </span>
                                    <span className="truncate text-fg-muted">{branch.address}</span>
                                </p>
                            </div>
                            {selectedBranch?.id === branch.id && (
                                <span className="shrink-0 rounded-md bg-success-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success-ink">
                                    Ordering here
                                </span>
                            )}
                        </div>
                    ))}
            </div>
        </section>
    );
}
