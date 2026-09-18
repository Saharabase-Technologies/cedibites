'use client';

import { useEffect, useRef, useState } from 'react';
import type { Branch } from '../providers/BranchProvider';

/** XML-safe: a branch called "Fish & Chips" would otherwise break the SVG. */
function esc(text: string) {
    return text.replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c] as string
    ));
}

/**
 * Phosphor's Storefront, fill weight, lifted out of the package at its native
 * 256 viewBox. The same glyph the branch chip in the header uses, so a shop on
 * the map and the shop named in the header are visibly the same thing.
 */
const STOREFRONT = 'M231.69,93.81,217.35,43.6A16.07,16.07,0,0,0,202,32H54A16.07,16.07,0,0,0,38.65,43.6L24.31,93.81A7.94,7.94,0,0,0,24,96v16a40,40,0,0,0,16,32v72a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V144a40,40,0,0,0,16-32V96A7.94,7.94,0,0,0,231.69,93.81ZM88,112a24,24,0,0,1-35.12,21.26,7.88,7.88,0,0,0-1.82-1.06A24,24,0,0,1,40,112v-8H88Zm64,0a24,24,0,0,1-48,0v-8h48Zm64,0a24,24,0,0,1-11.07,20.2,8.08,8.08,0,0,0-1.8,1.05A24,24,0,0,1,168,112v-8h48Z';

/**
 * The marker is the branch chip from the header, standing on the map, with the
 * shop's name on a plate above it.
 *
 * Drawn here rather than fetched, so it costs no request and matches the chip
 * exactly. Google's own marker library would need `libraries=marker` and a
 * mapId; the script on this page loads `places` only, so these ride on the
 * classic Marker with a data-URI icon.
 *
 * The name is baked into the SVG rather than passed as a MarkerLabel, because a
 * MarkerLabel is bare text with no plate behind it, unreadable the moment it
 * crosses a road or a coastline.
 *
 * An SVG in a data URI cannot load a webfont, so the plate uses a system sans
 * rather than American Captain. Its width is estimated from the character count
 * for the same reason: nothing here can measure text.
 */
function shopMarker(
    name: string,
    { plate, plateText, scale }: { plate: string; plateText: string; scale: number },
) {
    const label = name.length > 18 ? `${name.slice(0, 17)}\u2026` : name;
    const plateW = Math.max(46, Math.round(label.length * 6.6) + 18);
    const plateH = 21;
    const gap = 6;
    const tile = 38;
    const glyph = 23;

    const W = Math.max(plateW, tile);
    const H = plateH + gap + tile;
    const cx = W / 2;
    const tx = cx - tile / 2;
    const ty = plateH + gap;
    const g = glyph / 256;
    const gi = (tile - glyph) / 2;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
        <rect x="${cx - plateW / 2}" y="0" width="${plateW}" height="${plateH}" rx="4" fill="${plate}"/>
        <text x="${cx}" y="${plateH / 2 + 4.2}" text-anchor="middle" fill="${plateText}"
              font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="12" font-weight="700">${esc(label)}</text>
        <rect x="${tx}" y="${ty}" width="${tile}" height="${tile}" rx="9" fill="#d90002" stroke="#ffffff" stroke-width="2.5"/>
        <g transform="translate(${tx + gi} ${ty + gi}) scale(${g})" fill="#ffffff"><path d="${STOREFRONT}"/></g>
    </svg>`;

    return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: { width: W * scale, height: H * scale },
        // The tile stands on its coordinates rather than floating with its
        // middle over them, so the anchor is the foot of the tile.
        anchor: { x: cx * scale, y: (ty + tile) * scale },
    };
}

/** The customer is a person, not a blue dot. */
function personPin() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
        <circle cx="17" cy="17" r="16" fill="#ffffff"/>
        <circle cx="17" cy="17" r="14" fill="#1a1a1a"/>
        <circle cx="17" cy="13.6" r="4.3" fill="#ffdd0b"/>
        <path d="M8.6 25.8c0-4.5 3.8-7 8.4-7s8.4 2.5 8.4 7z" fill="#ffdd0b"/>
    </svg>`;
    return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: { width: 32, height: 32 },
        anchor: { x: 16, y: 16 },
    };
}

/**
 * The journey, on a plate at the middle of the dotted line.
 *
 * Three rows, because a customer asks three different questions of a shop on a
 * map. How long to get there, how far it is, and what happens when I order. The
 * ride comes off `estimateTravelMinutes` and the delivery estimate off
 * `estimateDeliveryTime`, and both are built on one riding speed, so the two
 * times on this plate can never contradict each other or the checkout.
 */
function journeyPlate(ride: string, distance: string, outcome: string) {
    // Estimated from the character count, like the name plate above: nothing
    // inside a data-URI SVG can measure its own text.
    const W = Math.round(Math.max(ride.length * 7.2, distance.length * 5.9, outcome.length * 5.9)) + 20;
    const H = 48;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
        <rect x="1.4" y="1.4" width="${W - 2.8}" height="${H - 2.8}" rx="7" fill="#ffdd0b" stroke="#ffffff" stroke-width="2.8"/>
        <text x="${W / 2}" y="15.5" text-anchor="middle" fill="#1a1a1a"
              font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="12" font-weight="700">${esc(ride)}</text>
        <text x="${W / 2}" y="28" text-anchor="middle" fill="#5b5326"
              font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="10" font-weight="600">${esc(distance)}</text>
        <text x="${W / 2}" y="40" text-anchor="middle" fill="#1a1a1a"
              font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="10" font-weight="700">${esc(outcome)}</text>
    </svg>`;

    return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: { width: W, height: H },
        anchor: { x: W / 2, y: H / 2 },
    };
}

/**
 * Mercator, and back.
 *
 * The screen is Mercator, so measuring along a line drawn on it has to be. The
 * result is scaled back into degrees so that it can be compared with a
 * longitude: the bare projection is in radians, and mixing the two makes every
 * north-south leg of a route read as a fifty-seventh of its real length.
 */
const mercatorY = (lat: number) =>
    (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (Math.max(-85, Math.min(85, lat)) * Math.PI / 180) / 2));
const latFromY = (y: number) =>
    (2 * Math.atan(Math.exp((y * Math.PI) / 180)) - Math.PI / 2) * (180 / Math.PI);

/**
 * The halfway point along the line as it is drawn on screen.
 *
 * Not the average of the two ends. A road route bends, so its middle is nowhere
 * near the middle of the pair, and even a straight line between two points has
 * a middle that plain averaging misses: a degree of latitude is not a fixed
 * height in Mercator. Over four kilometres nobody would notice that. Over four
 * hundred the plate sits visibly off the line.
 */
function drawnMidpoint(points: { lat: number; lng: number }[]) {
    if (points.length === 0) return null;
    if (points.length === 1) return points[0];

    const flat = points.map(p => ({ x: p.lng, y: mercatorY(p.lat) }));

    const spans: number[] = [];
    let total = 0;
    for (let i = 1; i < flat.length; i++) {
        const span = Math.hypot(flat[i].x - flat[i - 1].x, flat[i].y - flat[i - 1].y);
        spans.push(span);
        total += span;
    }

    // Both ends in the same place: a customer standing in the shop.
    if (total === 0) return points[0];

    let walked = 0;
    for (let i = 0; i < spans.length; i++) {
        if (walked + spans[i] >= total / 2) {
            const along = spans[i] === 0 ? 0 : (total / 2 - walked) / spans[i];
            return {
                lat: latFromY(flat[i].y + (flat[i + 1].y - flat[i].y) * along),
                lng: flat[i].x + (flat[i + 1].x - flat[i].x) * along,
            };
        }
        walked += spans[i];
    }

    return points[points.length - 1];
}

/**
 * A quiet base map. Points of interest, transit and road shields are all off:
 * the only things that should read on this map are our kitchens and the person
 * looking at it. The land and water tones come off the mono ramp so the map
 * belongs to the page rather than sitting on it as a foreign rectangle.
 */
const MAP_STYLE: google.maps.MapTypeStyle[] = [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f4f4f4' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#fafafa' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dbe6ec' }] },
    { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#6e6e6e' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e8f0d4' }] },
];

export default function BranchMap({
    coords, branches, activeId, nearestId, journey, onSelectBranch,
}: {
    coords: { latitude: number; longitude: number } | null;
    branches: Branch[];
    activeId: string | null;
    /** Hops every five seconds. Null when we do not know where the customer is. */
    nearestId: string | null;
    /**
     * The measured journey to whichever shop is active, or null when we do not
     * know where the customer is. Must be referentially stable: it drives the
     * effect that redraws the line.
     *
     * `path` is the road route when the server could get one. Without it the
     * line is drawn straight between the two pins, which is what this did before
     * routing existed and what it still does when routing is off or refused.
     */
    journey: {
        distanceLabel: string;
        rideTime: string;
        deliveryTime: string;
        withinRadius: boolean;
        path: { lat: number; lng: number }[] | null;
    } | null;
    onSelectBranch: (id: string) => void;
}) {
    const holder = useRef<HTMLDivElement>(null);
    const map = useRef<google.maps.Map | null>(null);
    const markers = useRef<Record<string, google.maps.Marker>>({});
    const meMarker = useRef<google.maps.Marker | null>(null);
    const range = useRef<google.maps.Circle | null>(null);
    const route = useRef<google.maps.Polyline | null>(null);
    const plate = useRef<google.maps.Marker | null>(null);

    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);

    // The Maps script is loaded once in the root layout with strategy
    // afterInteractive, so it is usually but not always there by the time this
    // mounts. Poll briefly, then give up: a map that never arrives should
    // vanish rather than leave a grey rectangle on the page.
    useEffect(() => {
        if (window.google?.maps?.Map) { setReady(true); return; }
        let tries = 0;
        const t = setInterval(() => {
            if (window.google?.maps?.Map) { setReady(true); clearInterval(t); }
            else if (++tries > 40) { setFailed(true); clearInterval(t); }
        }, 200);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (!ready || !holder.current || map.current) return;
        map.current = new google.maps.Map(holder.current, {
            center: { lat: 5.6, lng: -0.1 },
            zoom: 12,
            styles: MAP_STYLE,
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: 'greedy',
            clickableIcons: false,
        });
    }, [ready]);

    // Markers, and a viewport that holds everything worth seeing.
    useEffect(() => {
        if (!ready || !map.current) return;

        Object.values(markers.current).forEach(m => m.setMap(null));
        markers.current = {};

        const bounds = new google.maps.LatLngBounds();

        for (const branch of branches) {
            const lat = branch.coordinates.latitude;
            const lng = branch.coordinates.longitude;
            // A branch nobody has placed on the map cannot be pinned to it.
            // Google throws on a non-finite lat rather than ignoring the marker.
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
            const position = { lat, lng };
            const marker = new google.maps.Marker({
                map: map.current,
                position,
                title: branch.name,
                icon: shopMarker(branch.name, { plate: '#1a1a1a', plateText: '#ffffff', scale: 1 }) as unknown as google.maps.Icon,
                zIndex: 1,
            });
            marker.addListener('click', () => onSelectBranch(branch.id));
            markers.current[branch.id] = marker;
            bounds.extend(position);
        }

        if (meMarker.current) { meMarker.current.setMap(null); meMarker.current = null; }
        if (coords && Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude)) {
            const position = { lat: coords.latitude, lng: coords.longitude };
            meMarker.current = new google.maps.Marker({
                map: map.current,
                position,
                title: 'You',
                icon: personPin() as unknown as google.maps.Icon,
                zIndex: 4,
            });
            bounds.extend(position);
        }

        if (!bounds.isEmpty()) {
            map.current.fitBounds(bounds, 56);
            // One branch and no location leaves a zero-area bounds, and
            // fitBounds answers that by zooming to street level.
            const once = google.maps.event.addListenerOnce(map.current, 'idle', () => {
                const z = map.current?.getZoom();
                if (z !== undefined && z > 15) map.current?.setZoom(15);
            });
            return () => google.maps.event.removeListener(once);
        }
    }, [ready, branches, coords, onSelectBranch]);

    // Selection, the delivery ring, and the line from you to the chosen shop.
    useEffect(() => {
        if (!ready || !map.current) return;

        for (const [id, marker] of Object.entries(markers.current)) {
            const on = id === activeId;
            // Selected keeps the brand red and its name plate turns red too,
            // so the shop and its label read as one chosen thing.
            marker.setIcon(shopMarker(marker.getTitle() ?? '', {
                plate: on ? '#d90002' : '#1a1a1a',
                plateText: '#ffffff',
                scale: on ? 1.18 : 1,
            }) as unknown as google.maps.Icon);
            marker.setZIndex(on ? 3 : 1);
        }

        const chosen = activeId ? markers.current[activeId] : null;
        const position = chosen?.getPosition();
        if (position) map.current.panTo(position);

        /**
         * The chosen shop's delivery radius, drawn.
         *
         * This is the one thing a list of distances could never do: you can see
         * whether your own pin falls inside the ring. "2.4 km away" leaves you
         * to work out whether that is close enough; a circle around the shop
         * with you inside or outside it does not.
         */
        range.current?.setMap(null);
        range.current = null;
        const branch = branches.find(b => b.id === activeId);
        if (chosen && position && branch && branch.deliveryRadius > 0) {
            range.current = new google.maps.Circle({
                map: map.current,
                center: position,
                radius: branch.deliveryRadius * 1000,
                strokeColor: '#d90002',
                strokeOpacity: 0.55,
                strokeWeight: 2,
                fillColor: '#f40002',
                fillOpacity: 0.07,
                clickable: false,
            });
        }

        /**
         * You, the shop, and the journey between the two.
         *
         * Dotted rather than solid, because this is the straight line between
         * two points and not a route down real roads. A solid line would claim
         * to be one. The plate sits on the middle of it, so the minutes belong
         * to the journey rather than floating beside a pin.
         *
         * Tap a different shop and all three move together: the red pin, the
         * ring, and this line with its minutes.
         */
        route.current?.setMap(null);
        route.current = null;
        plate.current?.setMap(null);
        plate.current = null;

        const me = coords && Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude)
            ? { lat: coords.latitude, lng: coords.longitude }
            : null;

        if (me && position && journey) {
            const there = { lat: position.lat(), lng: position.lng() };

            // Real roads when the server found some, the straight line when it
            // did not. Dotted either way: the styling says "this is the journey"
            // and does not pretend to know more than it does.
            const line = journey.path && journey.path.length > 1 ? journey.path : [me, there];

            route.current = new google.maps.Polyline({
                map: map.current,
                path: line,
                // The stroke itself is invisible and the dots ride along it.
                // This is how the Maps API draws a dotted line.
                strokeOpacity: 0,
                icons: [{
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 2.4,
                        fillColor: '#d90002',
                        fillOpacity: 1,
                        strokeOpacity: 0,
                    },
                    offset: '0',
                    repeat: '11px',
                }],
                clickable: false,
                zIndex: 1,
            });

            // The ride takes as long as it takes whoever makes it, so it shows
            // on every shop. What changes is the bottom line: this kitchen
            // brings the food to you, or you go and collect it.
            const label = drawnMidpoint(line);

            if (label) {
                plate.current = new google.maps.Marker({
                    map: map.current,
                    position: label,
                    icon: journeyPlate(
                        journey.rideTime,
                        journey.distanceLabel,
                        journey.withinRadius ? `Food in ${journey.deliveryTime}` : 'Collection only',
                    ) as unknown as google.maps.Icon,
                    clickable: false,
                    zIndex: 2,
                });
            }
        }
    }, [activeId, ready, branches, coords, journey]);

    /**
     * The nearest kitchen hops once every five seconds.
     *
     * It used to bounce without stopping, which is a lot of movement for a shop
     * that is only sitting there. One hop is enough to say the pin is something
     * you can tap. Choose a different shop and the map stops waving altogether.
     */
    useEffect(() => {
        if (!ready) return;
        // Somebody who has asked their phone to stop animating things means it.
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const id = nearestId && (activeId === null || activeId === nearestId) ? nearestId : null;
        if (!id) return;

        let settle: ReturnType<typeof setTimeout> | undefined;

        // Read the marker fresh on every hop. The marker effect rebuilds each
        // pin whenever the branches or the customer's location change, so the
        // object captured when this effect ran may already be off the map.
        const hop = () => {
            const marker = markers.current[id];
            if (!marker) return;
            marker.setAnimation(google.maps.Animation.BOUNCE);
            // A bounce cycle is about 700ms. Clearing it lands the pin.
            settle = setTimeout(() => marker.setAnimation(null), 700);
        };

        const first = setTimeout(hop, 1200);
        const every = setInterval(hop, 5000);

        return () => {
            clearTimeout(first);
            clearTimeout(settle);
            clearInterval(every);
            markers.current[id]?.setAnimation(null);
        };
    }, [ready, activeId, nearestId, branches]);

    if (failed) return null;

    return (
        <div className="card-lift relative overflow-hidden rounded-2xl bg-surface-sunken">
            <div ref={holder} className="h-72 w-full sm:h-96" />
            {!ready && <div className="absolute inset-0 animate-pulse bg-surface-sunken" aria-hidden />}
        </div>
    );
}
