// ─── CediBites Unified Branch Types ──────────────────────────────────────────
// Single source of truth for branch data shape.
// Used by: BranchProvider, POS, Staff, Admin, Customer

export interface Branch {
    id: string;
    name: string;
    address: string;
    area: string;
    phone: string;
    coordinates: { latitude: number; longitude: number };
    deliveryRadius: number;     // in kilometers
    deliveryFee: number;        // in GHS
    operatingHours: string;
    isOpen: boolean;
    menuItemIds: string[];      // SampleMenu item IDs available at this branch
}

export interface BranchWithDistance extends Branch {
    distance: number;           // km from user
    deliveryTime: string;       // estimated delivery time string
    isWithinRadius: boolean;
}
