'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useLocation } from './LocationProvider';
import { calculateDistance, formatDistance, estimateDeliveryTime } from '@/lib/utils/distance';

interface Branch {
    id: string;
    name: string;
    address: string;
    area: string;
    phone: string;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    deliveryRadius: number;
    operatingHours: string;
    isOpen: boolean;
}

interface BranchWithDistance extends Branch {
    distance: number;
    deliveryTime: string;
    isWithinRadius: boolean;
}

interface BranchContextType {
    selectedBranch: Branch | null;
    setSelectedBranch: (branch: Branch | null) => void;
    branches: Branch[];
    getBranchesWithDistance: (lat: number, lon: number) => BranchWithDistance[];
    findNearestBranch: (lat: number, lon: number) => Branch | null;
    selectNearestBranchNow: () => void;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

// Sample branch data
const BRANCHES: Branch[] = [
    {
        id: '1',
        name: 'Osu Branch',
        address: '123 Oxford Street, Osu',
        area: 'Osu',
        phone: '+233 24 123 4567',
        coordinates: { latitude: 5.5557, longitude: -0.1769 },
        deliveryRadius: 5,
        operatingHours: '8:00 AM - 10:00 PM',
        isOpen: true,
    },
    {
        id: '2',
        name: 'East Legon Branch',
        address: '45 American House, East Legon',
        area: 'East Legon',
        phone: '+233 50 987 6543',
        coordinates: { latitude: 5.6465, longitude: -0.1549 },
        deliveryRadius: 5,
        operatingHours: '8:00 AM - 11:00 PM',
        isOpen: true,
    },
    {
        id: '3',
        name: 'Spintex Branch',
        address: '78 Spintex Road',
        area: 'Spintex',
        phone: '+233 20 555 1234',
        coordinates: { latitude: 5.6372, longitude: -0.0924 },
        deliveryRadius: 4,
        operatingHours: '9:00 AM - 9:00 PM',
        isOpen: false,
    },
    {
        id: '4',
        name: 'Tema Branch',
        address: 'Community 1, Tema',
        area: 'Tema',
        phone: '+233 24 777 8888',
        coordinates: { latitude: 5.6698, longitude: -0.0166 },
        deliveryRadius: 6,
        operatingHours: '8:00 AM - 10:00 PM',
        isOpen: true,
    },
    {
        id: '5',
        name: 'Madina Branch',
        address: 'Remy Junction, Madina',
        area: 'Madina',
        phone: '+233 55 444 3333',
        coordinates: { latitude: 5.6805, longitude: -0.1665 },
        deliveryRadius: 5,
        operatingHours: '8:00 AM - 10:00 PM',
        isOpen: true,
    },
    {
        id: '6',
        name: 'La Paz Branch',
        address: 'Abeka-Lapaz, Near Lapaz Market',
        area: 'La Paz',
        phone: '+233 24 789 1234',
        coordinates: { latitude: 5.6095, longitude: -0.2508 },
        deliveryRadius: 5,
        operatingHours: '8:00 AM - 10:00 PM',
        isOpen: true,
    },
    {
        id: '7',
        name: 'Dzorwulu Branch',
        address: 'Dzorwulu, Near US Embassy',
        area: 'Dzorwulu',
        phone: '+233 50 123 9876',
        coordinates: { latitude: 5.6141, longitude: -0.1956 },
        deliveryRadius: 5,
        operatingHours: '8:00 AM - 11:00 PM',
        isOpen: true,
    },
];

export function BranchProvider({ children }: { children: ReactNode }) {
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const { coordinates } = useLocation();
    const previousCoordinatesRef = useRef<{ latitude: number; longitude: number } | null>(null);

    // Calculate branches with distance
    const getBranchesWithDistance = useCallback((lat: number, lon: number): BranchWithDistance[] => {
        return BRANCHES.map((branch) => {
            const distance = calculateDistance(
                lat,
                lon,
                branch.coordinates.latitude,
                branch.coordinates.longitude
            );

            return {
                ...branch,
                distance,
                deliveryTime: estimateDeliveryTime(distance),
                isWithinRadius: distance <= branch.deliveryRadius,
            };
        }).sort((a, b) => a.distance - b.distance);
    }, []);

    // Find nearest open branch within delivery radius
    const findNearestBranch = useCallback((lat: number, lon: number): Branch | null => {
        const branchesWithDistance = getBranchesWithDistance(lat, lon);

        const nearestInRadius = branchesWithDistance.find(
            (branch) => branch.isOpen && branch.isWithinRadius
        );

        if (nearestInRadius) {
            return nearestInRadius;
        }

        const nearestOpen = branchesWithDistance.find((branch) => branch.isOpen);
        return nearestOpen || null;
    }, [getBranchesWithDistance]);

    // Force select nearest branch based on current coordinates
    const selectNearestBranchNow = useCallback(() => {
        if (!coordinates) {
            console.log('Cannot select nearest branch - no coordinates available');
            return;
        }

        console.log('Force selecting nearest branch...');
        const nearest = findNearestBranch(coordinates.latitude, coordinates.longitude);

        if (nearest) {
            console.log('Forcing branch selection:', nearest.name);
            setSelectedBranch(nearest);
            previousCoordinatesRef.current = coordinates;
        } else {
            console.log('No nearest branch found');
        }
    }, [coordinates, findNearestBranch]);

    // Auto-select nearest branch when location changes
    useEffect(() => {
        if (!coordinates) {
            console.log('No coordinates available');
            return;
        }

        console.log('Coordinates obtained:', coordinates);

        const hasLocationChanged = previousCoordinatesRef.current
            ? calculateDistance(
                previousCoordinatesRef.current.latitude,
                previousCoordinatesRef.current.longitude,
                coordinates.latitude,
                coordinates.longitude
            ) > 0.5
            : true;

        console.log('Has location changed significantly?', hasLocationChanged);

        if (hasLocationChanged) {
            const nearest = findNearestBranch(coordinates.latitude, coordinates.longitude);
            console.log('Nearest branch found:', nearest?.name);

            if (nearest) {
                if (!selectedBranch || selectedBranch.id !== nearest.id) {
                    console.log('Auto-selecting branch:', nearest.name);
                    setSelectedBranch(nearest);
                } else {
                    console.log('Already selected the nearest branch');
                }
            }

            previousCoordinatesRef.current = coordinates;
        }
    }, [coordinates, findNearestBranch]);

    // Load saved branch from localStorage on mount
    useEffect(() => {
        const savedBranchId = localStorage.getItem('selected-branch-id');
        if (savedBranchId && !selectedBranch) {
            const branch = BRANCHES.find((b) => b.id === savedBranchId);
            if (branch) {
                console.log('Loaded saved branch from localStorage:', branch.name);
                setSelectedBranch(branch);
            }
        }
    }, [selectedBranch]);

    // Save selected branch to localStorage
    useEffect(() => {
        if (selectedBranch) {
            console.log('Saving branch to localStorage:', selectedBranch.name);
            localStorage.setItem('selected-branch-id', selectedBranch.id);
        }
    }, [selectedBranch]);

    const value: BranchContextType = {
        selectedBranch,
        setSelectedBranch,
        branches: BRANCHES,
        getBranchesWithDistance,
        findNearestBranch,
        selectNearestBranchNow,
    };

    return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch() {
    const context = useContext(BranchContext);
    if (context === undefined) {
        throw new Error('useBranch must be used within a BranchProvider');
    }
    return context;
}