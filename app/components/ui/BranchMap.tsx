'use client';

import { useEffect, useRef, useState } from 'react';
import type { Branch } from '../providers/BranchProvider';

/**
 * A pin drawn rather than fetched, so it matches the brand instead of Google's
 * default red teardrop, and so it costs no request.
 */
function pin(fill: string, ring: string, size: number) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
        <path d="M18 46S0 28.6 0 18a18 18 0 1 1 36 0c0 10.6-18 28-18 28z" fill="${fill}"/>
        <circle cx="18" cy="18" r="7.5" fill="${ring}"/>
    </svg>`;
    return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: { width: size, height: size * (46 / 36) },
        anchor: { x: size / 2, y: size * (46 / 36) },
    };
}

function dot() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="13" fill="#ffffff"/>
        <circle cx="14" cy="14" r="9" fill="#1a1a1a"/>
        <circle cx="14" cy="14" r="3.5" fill="#ffdd0b"/>
    </svg>`;
    return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: { width: 26, height: 26 },
        anchor: { x: 13, y: 13 },
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
    coords, branches, activeId, onSelectBranch,
}: {
    coords: { latitude: number; longitude: number } | null;
    branches: Branch[];
    activeId: string | null;
    onSelectBranch: (id: string) => void;
}) {
    const holder = useRef<HTMLDivElement>(null);
    const map = useRef<google.maps.Map | null>(null);
    const markers = useRef<Record<string, google.maps.Marker>>({});
    const meMarker = useRef<google.maps.Marker | null>(null);

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
            gestureHandling: 'cooperative',
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
                icon: pin('#d90002', '#ffffff', 34) as unknown as google.maps.Icon,
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
                icon: dot() as unknown as google.maps.Icon,
                zIndex: 2,
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

    // The open row and the raised pin are the same choice, so they move together.
    useEffect(() => {
        if (!ready || !map.current) return;
        for (const [id, marker] of Object.entries(markers.current)) {
            const on = id === activeId;
            marker.setIcon(pin(on ? '#f40002' : '#d90002', on ? '#ffdd0b' : '#ffffff', on ? 44 : 32) as unknown as google.maps.Icon);
            marker.setZIndex(on ? 3 : 1);
        }
        const chosen = activeId ? markers.current[activeId] : null;
        const position = chosen?.getPosition();
        if (position) map.current.panTo(position);
    }, [activeId, ready]);

    if (failed) return null;

    return (
        <div className="card-lift relative mb-3 overflow-hidden rounded-2xl bg-surface-sunken">
            <div ref={holder} className="h-64 w-full sm:h-80" />
            {!ready && (
                <div className="absolute inset-0 animate-pulse bg-surface-sunken" aria-hidden />
            )}
        </div>
    );
}
