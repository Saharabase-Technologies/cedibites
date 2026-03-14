// ─── Mock Branch Service ─────────────────────────────────────────────────────
// Wraps the existing BRANCHES array from BranchProvider.
// When backend is ready, replace with ApiBranchService.

import type { Branch } from '@/types/branch';
import type { BranchService } from './branch.service';
import { sampleMenuItems } from '@/lib/data/SampleMenu';

// ─── Branch data (canonical source) ─────────────────────────────────────────

const ALL_ITEMS = sampleMenuItems.map(item => item.id);

const SPINTEX_ITEMS = [
    'fried-rice', 'jollof', 'noodles', 'banku',
    'jollof-bowl', 'fried-rice-bowl',
    'banku-tilapia-combo', 'street-budget-fr-jollof', 'street-budget-assorted',
    'rotisserie-quarter', 'chicken-basket-10',
    'sobolo', 'bottled-water',
];

export const BRANCHES: Branch[] = [
    {
        id: '1', name: 'Osu', address: '123 Oxford Street, Osu', area: 'Osu',
        phone: '+233 24 123 4567', coordinates: { latitude: 5.5557, longitude: -0.1769 },
        deliveryRadius: 5, deliveryFee: 15, operatingHours: '8:00 AM – 10:00 PM',
        isOpen: true, menuItemIds: ALL_ITEMS,
    },
    {
        id: '2', name: 'East Legon', address: '45 American House, East Legon', area: 'East Legon',
        phone: '+233 50 987 6543', coordinates: { latitude: 5.6465, longitude: -0.1549 },
        deliveryRadius: 5, deliveryFee: 15, operatingHours: '8:00 AM – 11:00 PM',
        isOpen: true, menuItemIds: ALL_ITEMS,
    },
    {
        id: '3', name: 'Spintex', address: '78 Spintex Road', area: 'Spintex',
        phone: '+233 20 555 1234', coordinates: { latitude: 5.6372, longitude: -0.0924 },
        deliveryRadius: 4, deliveryFee: 12, operatingHours: '9:00 AM – 9:00 PM',
        isOpen: false, menuItemIds: SPINTEX_ITEMS,
    },
    {
        id: '4', name: 'Tema', address: 'Community 1, Tema', area: 'Tema',
        phone: '+233 24 777 8888', coordinates: { latitude: 5.6698, longitude: -0.0166 },
        deliveryRadius: 6, deliveryFee: 18, operatingHours: '8:00 AM – 10:00 PM',
        isOpen: true, menuItemIds: ALL_ITEMS,
    },
    {
        id: '5', name: 'Madina', address: 'Remy Junction, Madina', area: 'Madina',
        phone: '+233 55 444 3333', coordinates: { latitude: 5.6805, longitude: -0.1665 },
        deliveryRadius: 5, deliveryFee: 15, operatingHours: '8:00 AM – 10:00 PM',
        isOpen: true, menuItemIds: ALL_ITEMS,
    },
    {
        id: '6', name: 'La Paz', address: 'Abeka-Lapaz, Near Lapaz Market', area: 'La Paz',
        phone: '+233 24 789 1234', coordinates: { latitude: 5.6095, longitude: -0.2508 },
        deliveryRadius: 5, deliveryFee: 15, operatingHours: '8:00 AM – 10:00 PM',
        isOpen: true, menuItemIds: ALL_ITEMS,
    },
    {
        id: '7', name: 'Dzorwulu', address: 'Dzorwulu, Near US Embassy', area: 'Dzorwulu',
        phone: '+233 50 123 9876', coordinates: { latitude: 5.6141, longitude: -0.1956 },
        deliveryRadius: 5, deliveryFee: 15, operatingHours: '8:00 AM – 11:00 PM',
        isOpen: true, menuItemIds: ALL_ITEMS,
    },
];

// ─── Implementation ─────────────────────────────────────────────────────────

export class MockBranchService implements BranchService {
    async getAll(): Promise<Branch[]> {
        return BRANCHES;
    }

    async getById(id: string): Promise<Branch | null> {
        return BRANCHES.find(b => b.id === id) ?? null;
    }

    async getByName(name: string): Promise<Branch | null> {
        return BRANCHES.find(b => b.name.toLowerCase() === name.toLowerCase()) ?? null;
    }

    async getMenuItemIds(branchId: string): Promise<string[]> {
        const branch = BRANCHES.find(b => b.id === branchId);
        return branch?.menuItemIds ?? ALL_ITEMS;
    }

    async isItemAvailable(itemId: string, branchId: string): Promise<boolean> {
        const ids = await this.getMenuItemIds(branchId);
        return ids.includes(itemId);
    }
}
