'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, ReactNode } from 'react';
import { useLocation } from './LocationProvider';
import { calculateDistance, estimateDeliveryTime } from '@/lib/utils/distance';
import { useBranches } from '@/lib/api/hooks/useBranches';
import type { Branch as ApiBranch } from '@/types/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Branch {
    id: string;
    name: string;
    address: string;
    area?: string;
    phone: string;
    coordinates: { latitude: number; longitude: number };
    deliveryRadius: number;
    operatingHours: string;
    deliveryFee: number;
    isOpen: boolean;
    menuItemIds: string[]; // Legacy - will be deprecated
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
    isLoading: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

// Helper to convert API Branch to local Branch format
function mapApiBranchToLocal(apiBranch: ApiBranch): Branch {
    return {
        id: String(apiBranch.id),
        name: apiBranch.name,
        address: apiBranch.address,
        area: apiBranch.area,
        phone: apiBranch.phone,
        coordinates: {
            latitude: apiBranch.latitude,
            longitude: apiBranch.longitude,
        },
        deliveryRadius: apiBranch.delivery_radius_km,
        deliveryFee: apiBranch.delivery_fee,
        operatingHours: apiBranch.operating_hours,
        isOpen: apiBranch.is_active,
        menuItemIds: [], // Will be populated from menu items
    };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BranchProvider({ children }: { children: ReactNode }) {
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const { coordinates } = useLocation();
    const previousCoordinatesRef = useRef<{ latitude: number; longitude: number } | null>(null);
    
    // Fetch branches from API
    const { branches: apiBranches, isLoading } = useBranches();
    
    // Convert API branches to local format
    const branches = useMemo(() => {
        return apiBranches.map(mapApiBranchToLocal);
    }, [apiBranches]);

    const getBranchesWithDistance = useCallback((lat: number, lon: number): BranchWithDistance[] => {
        return branches.map((branch) => {
            const distance = calculateDistance(lat, lon, branch.coordinates.latitude, branch.coordinates.longitude);
            return {
                ...branch,
                distance,
                deliveryTime: estimateDeliveryTime(distance),
                isWithinRadius: distance <= branch.deliveryRadius,
            };
        }).sort((a, b) => a.distance - b.distance);
    }, [branches]);

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
        return branches.find(b => b.id === branchId)?.menuItemIds ?? [];
    }, [branches]);

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
        if (branches.length === 0) return; // Wait for branches to load
        
        const savedId = localStorage.getItem('selected-branch-id');
        if (savedId && !selectedBranch) {
            const branch = branches.find(b => b.id === savedId);
            if (branch) setSelectedBranch(branch);
        }
    }, [branches, selectedBranch]);

    useEffect(() => {
        if (selectedBranch) localStorage.setItem('selected-branch-id', selectedBranch.id);
    }, [selectedBranch]);

    return (
        <BranchContext.Provider value={{
            selectedBranch, setSelectedBranch,
            branches,
            getBranchesWithDistance, findNearestBranch, selectNearestBranchNow,
            getBranchMenu, isItemAvailableAtBranch,
            isLoading,
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