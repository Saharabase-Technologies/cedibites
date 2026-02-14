'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useLocation } from './LocationProvider';
import { calculateDistance, estimateDeliveryTime } from '@/lib/utils/distance';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Branch {
    id: string;
    name: string;
    address: string;
    area: string;
    phone: string;
    coordinates: { latitude: number; longitude: number };
    deliveryRadius: number;
    operatingHours: string;
    deliveryFee: number;
    isOpen: boolean;
    menuItemIds: string[]; // Option B — branch owns its menu
}

export interface BranchWithDistance extends Branch {
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
    getBranchMenu: (branchId: string) => string[]; // returns menuItemIds for a branch
    isItemAvailableAtBranch: (itemId: string, branchId: string) => boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

// ─── Branch Data ─────────────────────────────────────────────────────────────
// menuItemIds reference the 'id' field in sampleMenuItems (strings '1'–'34')
// Flagship branches: full menu | Smaller branches: limited menu

const ALL_ITEMS = Array.from({ length: 34 }, (_, i) => String(i + 1));

// Items available at all branches (core menu)
const CORE_ITEMS = ['1', '2', '3', '5', '7', '10', '11', '15', '16', '17', '20', '21', '29', '33', '34'];

export const BRANCHES: Branch[] = [
    {
        id: '1',
        name: 'Osu',
        address: '123 Oxford Street, Osu',
        area: 'Osu',
        phone: '+233 24 123 4567',
        coordinates: { latitude: 5.5557, longitude: -0.1769 },
        deliveryRadius: 5,
        deliveryFee: 15,
        operatingHours: '8:00 AM – 10:00 PM',
        isOpen: true,
        menuItemIds: ALL_ITEMS, // flagship — full menu
    },
    {
        id: '2',
        name: 'East Legon',
        address: '45 American House, East Legon',
        area: 'East Legon',
        phone: '+233 50 987 6543',
        coordinates: { latitude: 5.6465, longitude: -0.1549 },
        deliveryRadius: 5,
        deliveryFee: 15,
        operatingHours: '8:00 AM – 11:00 PM',
        isOpen: true,
        // No Tuo Zaafi (8) — northern dish not stocked here
        // No Kontomire (9), no Garden Egg Salad (19), no Bofrot (23), no Ofam (28)
        menuItemIds: ['1', '2', '3', '4', '5', '6', '7', '10', '11', '12', '13', '14',
            '15', '16', '17', '18', '20', '21', '22', '24',
            '25', '26', '27', '29', '30', '31', '32', '33', '34'],
    },
    {
        id: '3',
        name: 'Spintex',
        address: '78 Spintex Road',
        area: 'Spintex',
        phone: '+233 20 555 1234',
        coordinates: { latitude: 5.6372, longitude: -0.0924 },
        deliveryRadius: 4,
        deliveryFee: 12,
        operatingHours: '9:00 AM – 9:00 PM',
        isOpen: false,
        // Smaller branch — core items + popular picks only
        menuItemIds: ['1', '2', '3', '5', '7', '10', '11', '13', '15', '16', '17',
            '20', '21', '22', '25', '29', '32', '33', '34'],
    },
    {
        id: '4',
        name: 'Tema',
        address: 'Community 1, Tema',
        area: 'Tema',
        phone: '+233 24 777 8888',
        coordinates: { latitude: 5.6698, longitude: -0.0166 },
        deliveryRadius: 6,
        deliveryFee: 18,
        operatingHours: '8:00 AM – 10:00 PM',
        isOpen: true,
        menuItemIds: ALL_ITEMS, // flagship
    },
    {
        id: '5',
        name: 'Madina',
        address: 'Remy Junction, Madina',
        area: 'Madina',
        phone: '+233 55 444 3333',
        coordinates: { latitude: 5.6805, longitude: -0.1665 },
        deliveryRadius: 5,
        deliveryFee: 15,
        operatingHours: '8:00 AM – 10:00 PM',
        isOpen: true,
        // Strong on traditional & northern dishes, fewer combos
        menuItemIds: ['1', '2', '3', '4', '5', '6', '8', '9', '10', '11', '14',
            '15', '16', '18', '19', '20', '23', '24', '28',
            '29', '30', '31', '34'],
    },
    {
        id: '6',
        name: 'La Paz',
        address: 'Abeka-Lapaz, Near Lapaz Market',
        area: 'La Paz',
        phone: '+233 24 789 1234',
        coordinates: { latitude: 5.6095, longitude: -0.2508 },
        deliveryRadius: 5,
        deliveryFee: 15,
        operatingHours: '8:00 AM – 10:00 PM',
        isOpen: true,
        // Medium branch — good variety, limited desserts
        menuItemIds: ['1', '2', '3', '4', '5', '6', '7', '10', '11', '12',
            '15', '16', '17', '18', '19', '20', '21', '22', '23', '24',
            '28', '29', '30', '32', '33', '34'],
    },
    {
        id: '7',
        name: 'Dzorwulu',
        address: 'Dzorwulu, Near US Embassy',
        area: 'Dzorwulu',
        phone: '+233 50 123 9876',
        coordinates: { latitude: 5.6141, longitude: -0.1956 },
        deliveryRadius: 5,
        deliveryFee: 15,
        operatingHours: '8:00 AM – 11:00 PM',
        isOpen: true,
        menuItemIds: ALL_ITEMS, // flagship
    },
];

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BranchProvider({ children }: { children: ReactNode }) {
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const { coordinates } = useLocation();
    const previousCoordinatesRef = useRef<{ latitude: number; longitude: number } | null>(null);

    const getBranchesWithDistance = useCallback((lat: number, lon: number): BranchWithDistance[] => {
        return BRANCHES.map((branch) => {
            const distance = calculateDistance(lat, lon, branch.coordinates.latitude, branch.coordinates.longitude);
            return {
                ...branch,
                distance,
                deliveryTime: estimateDeliveryTime(distance),
                isWithinRadius: distance <= branch.deliveryRadius,
            };
        }).sort((a, b) => a.distance - b.distance);
    }, []);

    const findNearestBranch = useCallback((lat: number, lon: number): Branch | null => {
        const sorted = getBranchesWithDistance(lat, lon);
        return sorted.find(b => b.isOpen && b.isWithinRadius)
            ?? sorted.find(b => b.isOpen)
            ?? null;
    }, [getBranchesWithDistance]);

    const selectNearestBranchNow = useCallback(() => {
        if (!coordinates) return;
        const nearest = findNearestBranch(coordinates.latitude, coordinates.longitude);
        if (nearest) {
            setSelectedBranch(nearest);
            previousCoordinatesRef.current = coordinates;
        }
    }, [coordinates, findNearestBranch]);

    // Returns the menuItemIds for a given branch id
    const getBranchMenu = useCallback((branchId: string): string[] => {
        return BRANCHES.find(b => b.id === branchId)?.menuItemIds ?? [];
    }, []);

    // Check if a specific item is available at a branch
    const isItemAvailableAtBranch = useCallback((itemId: string, branchId: string): boolean => {
        return getBranchMenu(branchId).includes(itemId);
    }, [getBranchMenu]);

    // Auto-select nearest branch when location changes significantly
    useEffect(() => {
        if (!coordinates) return;
        const hasChanged = previousCoordinatesRef.current
            ? calculateDistance(
                previousCoordinatesRef.current.latitude,
                previousCoordinatesRef.current.longitude,
                coordinates.latitude, coordinates.longitude
            ) > 0.5
            : true;

        if (hasChanged) {
            const nearest = findNearestBranch(coordinates.latitude, coordinates.longitude);
            if (nearest && (!selectedBranch || selectedBranch.id !== nearest.id)) {
                setSelectedBranch(nearest);
            }
            previousCoordinatesRef.current = coordinates;
        }
    }, [coordinates, findNearestBranch]);

    // Persist selected branch
    useEffect(() => {
        const savedId = localStorage.getItem('selected-branch-id');
        if (savedId && !selectedBranch) {
            const branch = BRANCHES.find(b => b.id === savedId);
            if (branch) setSelectedBranch(branch);
        }
    }, []);

    useEffect(() => {
        if (selectedBranch) localStorage.setItem('selected-branch-id', selectedBranch.id);
    }, [selectedBranch]);

    return (
        <BranchContext.Provider value={{
            selectedBranch, setSelectedBranch,
            branches: BRANCHES,
            getBranchesWithDistance, findNearestBranch, selectNearestBranchNow,
            getBranchMenu, isItemAvailableAtBranch,
        }}>
            {children}
        </BranchContext.Provider>
    );
}

export function useBranch() {
    const context = useContext(BranchContext);
    if (!context) throw new Error('useBranch must be used within BranchProvider');
    return context;
}