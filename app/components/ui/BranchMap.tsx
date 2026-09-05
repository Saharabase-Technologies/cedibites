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
    coords, branches, activeId, nearestId, onSelectBranch,
}: {
    coords: { latitude: number; longitude: number } | null;
    branches: Branch[];
    activeId: string | null;
    /** Gets the ring. Null when we do not know where the customer is. */
    nearestId: string | null;
    onSelectBranch: (id: string) => void;
}) {
    const holder = useRef<HTMLDivElement>(null);
    const map = useRef<google.maps.Map | null>(null);
    const markers = useRef<Record<string, google.maps.Marker>>({});
    const meMarker = useRef<google.maps.Marker | null>(null);
    const range = useRef<google.maps.Circle | null>(null);

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

    // Selection, and the ring on the nearest one.
    useEffect(() => {
        if (!ready || !map.current) return;

        // Somebody who has asked their phone to stop animating things means it.
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

            // The nearest kitchen rings until you pick something. Once you have
            // chosen, the map stops waving at you.
            const ringing = !still && id === nearestId && (activeId === null || activeId === nearestId);
            marker.setAnimation(ringing ? google.maps.Animation.BOUNCE : null);
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
    }, [activeId, nearestId, ready, branches]);

    if (failed) return null;

    return (
        <div className="card-lift relative overflow-hidden rounded-2xl bg-surface-sunken">
            <div ref={holder} className="h-72 w-full sm:h-96" />
            {!ready && <div className="absolute inset-0 animate-pulse bg-surface-sunken" aria-hidden />}
        </div>
    );
}
