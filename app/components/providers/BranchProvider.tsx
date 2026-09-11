'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from './LocationProvider';
import { calculateDistance, estimateDeliveryTime } from '@/lib/utils/distance';
import { useBranches } from '@/lib/api/hooks/useBranches';
import { getEcho } from '@/lib/echo';
import type { Branch as ApiBranch } from '@/types/api';
import type { WeekHours } from '@/lib/utils/branchHours';

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
    /** The week, per day, for saying when a closed branch opens. Absent when the API sends none. */
    hours?: WeekHours;
    deliveryFee: number;
    baseDeliveryFee: number;
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

/**
 * Coordinates, as a number or as nothing.
 *
 * types/api.ts declares latitude and longitude as `number`, but the API is
 * Laravel and a decimal column serialises as a string — "5.6912" — or as null
 * for a branch nobody has placed on the map yet. A string reaches the haversine
 * and every distance comes back NaN, which the UI then prints as "NaN km away";
 * `Number(null)` would be worse, quietly pinning that branch to 0,0 in the Gulf
 * of Guinea. NaN is the honest answer for a branch with no location, and
 * everything downstream can test for it.
 */
function coordinate(value: unknown): number {
    const n = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : NaN;
    return Number.isFinite(n) ? n : NaN;
}

// Helper to convert API Branch to local Branch format
function mapApiBranchToLocal(apiBranch: ApiBranch): Branch {
    // Extract delivery settings
    const deliverySettings = apiBranch.delivery_settings;
    const deliveryRadius = deliverySettings?.delivery_radius_km ?? 10; // Default 10km
    const deliveryFee = 0; // Delivery fees temporarily disabled for customer flow
    const baseDeliveryFee = deliverySettings?.base_delivery_fee ?? 0; // Branch base fee (used by POS delivery)
    
    // Convert operating hours object to string representation
    const operatingHours = apiBranch.operating_hours 
        ? Object.entries(apiBranch.operating_hours)
            .map(([day, hours]) => {
                if (!hours.is_open) return `${day}: Closed`;
                return `${day}: ${hours.open_time || '00:00'} - ${hours.close_time || '23:59'}`;
            })
            .join(', ')
        : 'Hours not available';

    // The same week, kept as data. The string above cannot answer "when does it
    // open", which is the one thing a customer at a closed branch wants to know.
    const hours: WeekHours | undefined = apiBranch.operating_hours
        ? Object.fromEntries(
            Object.entries(apiBranch.operating_hours).map(([day, h]) => [day.toLowerCase(), {
                isOpen: Boolean(h.is_open),
                openTime: h.open_time ?? null,
                closeTime: h.close_time ?? null,
                // Not on the type, but sent when somebody opened or shut the
                // branch by hand, and then the timetable cannot be trusted.
                overrideOpen: (h as { manual_override_open?: boolean | null }).manual_override_open ?? null,
            }]),
        )
        : undefined;

    return {
        id: String(apiBranch.id),
        name: apiBranch.name,
        address: apiBranch.address,
        area: apiBranch.area,
        phone: apiBranch.phone,
        coordinates: {
            latitude: coordinate(apiBranch.latitude),
            longitude: coordinate(apiBranch.longitude),
        },
        deliveryRadius,
        deliveryFee,
        baseDeliveryFee,
        operatingHours,
        hours,
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

/** Set once the customer has picked a branch themselves. */
const CHOSEN_KEY = 'selected-branch-chosen';

export function BranchProvider({ children }: { children: ReactNode }) {
    /** The branch as it was when picked. Read `selectedBranch` below, never this. */
    const [pickedBranch, setSelectedBranchState] = useState<Branch | null>(null);
    const { coordinates } = useLocation();
    const previousCoordinatesRef = useRef<{ latitude: number; longitude: number } | null>(null);

    /**
     * Whether the branch on screen was the customer's own decision.
     *
     * Everything outside this provider that calls `setSelectedBranch` is a
     * customer tapping a branch in the cart sheet, the checkout sheet or the
     * header selector. So the exposed setter is the record of a deliberate
     * choice, and the automatic paths use the raw state setter instead.
     *
     * Without the distinction the nearest-branch rule cannot work: a branch
     * saved to this device looks identical whether they chose it or we guessed
     * it, so either the guess overrides their choice on every page load or
     * their choice blocks the guess forever.
     */
    const chosenRef = useRef(false);

    const setSelectedBranch = useCallback((branch: Branch | null) => {
        chosenRef.current = true;
        try { localStorage.setItem(CHOSEN_KEY, '1'); } catch { /* private window */ }
        setSelectedBranchState(branch);
    }, []);

    // Fetch branches from API
    const { branches: apiBranches, isLoading } = useBranches();
    const queryClient = useQueryClient();

    // Listen for real-time branch access updates via Reverb
    useEffect(() => {
        if (!pickedBranch) return;

        const echo = getEcho();
        if (!echo) return;

        const channel = echo.private(`orders.branch.${pickedBranch.id}`);

        channel.listen('.branch.access.updated', () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });
        });

        return () => {
            // Only stop listening for this event — don't leave the channel
            // (other listeners like useOrderChannel may still be active)
            channel.stopListening('.branch.access.updated');
        };
    }, [pickedBranch?.id, queryClient]);

    // Convert API branches to local format
    const branches = useMemo(() => {
        return apiBranches.map(mapApiBranchToLocal);
    }, [apiBranches]);

    /**
     * The chosen branch, as the server last described it.
     *
     * The state holds a copy of the branch taken at the moment it was picked,
     * and nothing ever replaced that copy. The branch list refetches on focus
     * and on every `branch.access.updated` above, but the cart and checkout read
     * this, so a branch that opened or closed while the app was open never
     * changed on the two screens that decide whether you can order from it.
     * Matching on id against the live list is what lets it reach them.
     */
    const selectedBranch = useMemo(
        () => (pickedBranch ? branches.find(b => b.id === pickedBranch.id) ?? pickedBranch : null),
        [branches, pickedBranch],
    );

    const getBranchesWithDistance = useCallback((lat: number, lon: number): BranchWithDistance[] => {
        return branches.map((branch: any) => {
            const distance = calculateDistance(lat, lon, branch.coordinates.latitude, branch.coordinates.longitude);
            return {
                ...branch,
                distance,
                deliveryTime: estimateDeliveryTime(distance),
                isWithinRadius: distance <= branch.deliveryRadius,
            };
        }).sort((a: any, b: any) => {
            // A branch with no coordinates has no distance. Sort those last
            // rather than letting NaN decide the order for everyone.
            const av = Number.isFinite(a.distance) ? a.distance : Infinity;
            const bv = Number.isFinite(b.distance) ? b.distance : Infinity;
            return av - bv;
        });
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
            // Pressed by the customer, so it counts as their choice.
            setSelectedBranch(nearest);
            previousCoordinatesRef.current = coordinates;
        }
    }, [coordinates, findNearestBranch, setSelectedBranch]);

    // Returns the menuItemIds for a given branch id
    const getBranchMenu = useCallback((branchId: string): string[] => {
        return branches.find((b: any) => b.id === branchId)?.menuItemIds ?? [];
    }, [branches]);

    // Check if a specific item is available at a branch
    const isItemAvailableAtBranch = useCallback((itemId: string, branchId: string): boolean => {
        return getBranchMenu(branchId).includes(itemId);
    }, [getBranchMenu]);

    /**
     * The nearest branch, which is the whole reason we ask for a location.
     *
     * Two things were wrong here and between them the rule almost never fired.
     *
     * The position was stamped into `previousCoordinatesRef` even when no
     * branch came back, and no branch comes back until the branch list has
     * loaded. A phone answers geolocation from a cached fix in milliseconds and
     * the branch list is a network round trip, so the usual order was: position
     * arrives, no branches yet, nothing selected, position stamped anyway.
     * Branches then load, the effect runs again, the distance from the stamped
     * position to the same position is zero, `hasChanged` is false, and it
     * never tries again. The stamp is only written now when a branch was
     * actually found.
     *
     * And the branch saved on the device was treated as gospel. The effect
     * below would set it before the location ever resolved, so `selectedBranch`
     * was already truthy and the nearest rule had nothing left to do. It now
     * only stands aside for a branch the customer picked themselves.
     */
    useEffect(() => {
        if (!coordinates || chosenRef.current) return;

        const previous = previousCoordinatesRef.current;
        const moved = previous
            ? calculateDistance(
                previous.latitude, previous.longitude,
                coordinates.latitude, coordinates.longitude,
            ) > 0.5
            : true;

        if (!moved) return;

        const nearest = findNearestBranch(coordinates.latitude, coordinates.longitude);
        if (!nearest) return; // Branches are still loading. Try again when they land.

        if (!selectedBranch || selectedBranch.id !== nearest.id) {
            setSelectedBranchState(nearest);
        }
        previousCoordinatesRef.current = coordinates;
    }, [coordinates, findNearestBranch, selectedBranch]);

    /**
     * Something on screen while the location question is still open.
     *
     * The branch last used on this device, or the first one taking orders. The
     * nearest rule above overrules this the moment a position arrives, unless
     * the customer has chosen for themselves.
     */
    useEffect(() => {
        if (branches.length === 0 || selectedBranch) return;

        try {
            chosenRef.current = localStorage.getItem(CHOSEN_KEY) === '1';
        } catch { /* private window */ }

        const savedId = localStorage.getItem('selected-branch-id');
        const branch = (savedId && branches.find(b => b.id === savedId))
            || branches.find(b => b.isOpen)
            || branches[0];

        if (branch) setSelectedBranchState(branch);
    }, [branches, selectedBranch]);

    const selectedId = selectedBranch?.id;
    useEffect(() => {
        if (selectedId) localStorage.setItem('selected-branch-id', selectedId);
    }, [selectedId]);

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
