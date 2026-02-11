'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface Coordinates {
    latitude: number;
    longitude: number;
}

interface LocationContextType {
    coordinates: Coordinates | null;
    permissionStatus: 'granted' | 'denied' | 'prompt' | 'loading';
    error: string | null;
    requestLocation: () => void;
    clearLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
    children: ReactNode;
    autoRequest?: boolean; // Whether to request on mount
}

export function LocationProvider({ children, autoRequest = false }: LocationProviderProps) {
    const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'loading'>('loading');
    const [error, setError] = useState<string | null>(null);

    // Check for stored location on mount
    useEffect(() => {
        const storedLocation = localStorage.getItem('user-location');
        if (storedLocation) {
            try {
                const parsed = JSON.parse(storedLocation);
                setCoordinates(parsed);
                setPermissionStatus('granted');
            } catch (e) {
                localStorage.removeItem('user-location');
            }
        }
    }, []);

    // Check permission status on mount
    useEffect(() => {
        if ('permissions' in navigator) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');

                // Listen for permission changes
                result.addEventListener('change', () => {
                    setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
                });
            });
        }
    }, []);

    // Auto-request location on mount if enabled
    useEffect(() => {
        if (autoRequest && permissionStatus === 'prompt') {
            requestLocation();
        }
    }, [autoRequest, permissionStatus]);

    const requestLocation = () => {
        setPermissionStatus('loading');
        setError(null);

        if (!('geolocation' in navigator)) {
            setError('Geolocation is not supported by your browser');
            setPermissionStatus('denied');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                };

                setCoordinates(coords);
                setPermissionStatus('granted');
                setError(null);

                // Store location for quick access (expires after 1 hour)
                const locationData = {
                    ...coords,
                    timestamp: Date.now(),
                };
                localStorage.setItem('user-location', JSON.stringify(locationData));
            },
            (error) => {
                setPermissionStatus('denied');

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setError('Location permission denied. Please enable it in your browser settings.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setError('Location information is unavailable.');
                        break;
                    case error.TIMEOUT:
                        setError('Location request timed out.');
                        break;
                    default:
                        setError('An unknown error occurred.');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000, // Use cached location if less than 5 minutes old
            }
        );
    };

    const clearLocation = () => {
        setCoordinates(null);
        localStorage.removeItem('user-location');
    };

    return (
        <LocationContext.Provider
            value={{
                coordinates,
                permissionStatus,
                error,
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