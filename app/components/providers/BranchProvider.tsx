'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from './LocationProvider';
import { calculateDistance, estimateDeliveryTime } from '@/lib/utils/distance';
import { useBranches } from '@/lib/api/hooks/useBranches';
import { getEcho } from '@/lib/echo';
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
    isActive: boolean;
    extendedStaffAccess: boolean;
    extendedOrderAccess: boolean;
    staffAccessAllowed: boolean;
    orderTypes: Record<string, { is_enabled: boolean }>;
    paymentMethods: Record<string, { is_enabled: boolean }>;
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
    // Extract delivery settings
    const deliverySettings = apiBranch.delivery_settings;
    const deliveryRadius = deliverySettings?.delivery_radius_km ?? 10; // Default 10km
    const deliveryFee = 0; // Delivery fees temporarily disabled
    
    // Convert operating hours object to string representation
    const operatingHours = apiBranch.operating_hours 
        ? Object.entries(apiBranch.operating_hours)
            .map(([day, hours]) => {
                if (!hours.is_open) return `${day}: Closed`;
                return `${day}: ${hours.open_time || '00:00'} - ${hours.close_time || '23:59'}`;
            })
            .join(', ')
        : 'Hours not available';

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
        deliveryRadius,
        deliveryFee,
        operatingHours,
        isOpen: apiBranch.is_open ?? apiBranch.is_active,
        isActive: apiBranch.is_active,
        extendedStaffAccess: apiBranch.extended_staff_access ?? false,
        extendedOrderAccess: apiBranch.extended_order_access ?? false,
        staffAccessAllowed: apiBranch.staff_access_allowed ?? (apiBranch.is_open ?? apiBranch.is_active),
        orderTypes: apiBranch.order_types ?? {},
        paymentMethods: apiBranch.payment_methods ?? {},
        menuItemIds: apiBranch.menu_items?.map(item => String(item.id)) ?? [],
    };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BranchProvider({ children }: { children: ReactNode }) {
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const { coordinates } = useLocation();
    const previousCoordinatesRef = useRef<{ latitude: number; longitude: number } | null>(null);

    // Fetch branches from API
    const { branches: apiBranches, isLoading } = useBranches();
    const queryClient = useQueryClient();

    // Listen for real-time branch access updates via Reverb
    useEffect(() => {
        if (!selectedBranch) return;

        const echo = getEcho();
        if (!echo) return;

        const channel = echo.private(`orders.branch.${selectedBranch.id}`);

        channel.listen('.branch.access.updated', () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });
        });

        return () => {
            // Only stop listening for this event — don't leave the channel
            // (other listeners like useOrderChannel may still be active)
            channel.stopListening('.branch.access.updated');
        };
    }, [selectedBranch?.id, queryClient]);

    // Convert API branches to local format
    const branches = useMemo(() => {
        return apiBranches.map(mapApiBranchToLocal);
    }, [apiBranches]);

    const getBranchesWithDistance = useCallback((lat: number, lon: number): BranchWithDistance[] => {
        return branches.map((branch: any) => {
            const distance = calculateDistance(lat, lon, branch.coordinates.latitude, branch.coordinates.longitude);
            return {
                ...branch,
                distance,
                deliveryTime: estimateDeliveryTime(distance),
                isWithinRadius: distance <= branch.deliveryRadius,
            };
        }).sort((a: any, b: any) => a.distance - b.distance);
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
        return branches.find((b: any) => b.id === branchId)?.menuItemIds ?? [];
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
        if (!selectedBranch) {
            const branch = (savedId && branches.find(b => b.id === savedId)) || branches[0];
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
