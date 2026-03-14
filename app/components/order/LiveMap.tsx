// app/components/order/LiveMap.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { WarningIcon } from '@phosphor-icons/react';

interface LiveMapProps {
    branchLocation: { latitude: number; longitude: number };
    customerLocation: { latitude: number; longitude: number } | null;
    riderLocation: { latitude: number; longitude: number } | null;
    branchName: string;
}

type LatLon = { latitude: number; longitude: number };
const toLatLng = (c: LatLon) => ({ lat: c.latitude, lng: c.longitude });

export default function LiveMap({
    branchLocation,
    customerLocation,
    riderLocation,
    branchName,
}: LiveMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [mapError, setMapError] = useState(false);
    const googleMapRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<{
        branch?: google.maps.Marker;
        customer?: google.maps.Marker;
        rider?: google.maps.Marker;
    }>({});

    useEffect(() => {
        if (typeof window === 'undefined' || (window as any).__MAPS_AUTH_FAILED || !(window as any).google?.maps) {
            setMapError(true);
            return;
        }

        if (!mapRef.current) return;

        try {
            const map = new google.maps.Map(mapRef.current, {
                zoom: 13,
                center: toLatLng(branchLocation),
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                styles: [
                    {
                        featureType: 'poi',
                        elementType: 'labels',
                        stylers: [{ visibility: 'off' }],
                    },
                ],
            });

            googleMapRef.current = map;

            // Branch marker (orange)
            markersRef.current.branch = new google.maps.Marker({
                position: toLatLng(branchLocation),
                map,
                title: branchName,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#e49925',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                },
            });

            // Customer marker (green)
            if (customerLocation) {
                markersRef.current.customer = new google.maps.Marker({
                    position: toLatLng(customerLocation),
                    map,
                    title: 'Delivery Location',
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: '#6c833f',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                    },
                });
            }

            // Rider marker
            if (riderLocation) {
                const riderMarker = new google.maps.Marker({
                    position: toLatLng(riderLocation),
                    map,
                    title: 'Rider',
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 12,
                        fillColor: '#3b82f6',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 3,
                    },
                    animation: google.maps.Animation.BOUNCE,
                });
                markersRef.current.rider = riderMarker;

                setTimeout(() => {
                    riderMarker.setAnimation(null);
                }, 2000);
            }

            // Fit bounds to show all markers
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(toLatLng(branchLocation));
            if (customerLocation) bounds.extend(toLatLng(customerLocation));
            if (riderLocation) bounds.extend(toLatLng(riderLocation));
            map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
        } catch (error) {
            if (typeof window !== 'undefined') (window as any).__MAPS_AUTH_FAILED = true;
            setMapError(true);
        }

        return () => {
            if (markersRef.current.branch) markersRef.current.branch.setMap(null);
            if (markersRef.current.customer) markersRef.current.customer.setMap(null);
            if (markersRef.current.rider) markersRef.current.rider.setMap(null);
        };
    }, [branchLocation, customerLocation, riderLocation, branchName]);

    // Update rider position for live tracking
    useEffect(() => {
        if (!googleMapRef.current || !riderLocation || !markersRef.current.rider) return;
        markersRef.current.rider.setPosition(toLatLng(riderLocation));
        googleMapRef.current.panTo(toLatLng(riderLocation));
    }, [riderLocation]);

    if (mapError) {
        return (
            <div className="w-full h-[400px] bg-neutral-gray/10 rounded-2xl flex items-center justify-center">
                <div className="text-center p-6">
                    <WarningIcon size={48} className="text-neutral-gray/40 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-text-dark dark:text-text-light mb-1">
                        Map Not Available
                    </p>
                    <p className="text-xs text-neutral-gray">
                        Unable to load map. Please refresh the page.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            <div ref={mapRef} className="w-full h-[400px] rounded-2xl" />

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white dark:bg-brand-dark rounded-xl shadow-lg p-3 border border-neutral-gray/10">
                <div className="flex flex-col gap-2 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        <span className="text-text-dark dark:text-text-light">Restaurant</span>
                    </div>
                    {customerLocation && (
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-secondary" />
                            <span className="text-text-dark dark:text-text-light">You</span>
                        </div>
                    )}
                    {riderLocation && (
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-500/30" />
                            <span className="text-text-dark dark:text-text-light">Rider</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
