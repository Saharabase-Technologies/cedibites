// ─── Staff Service Interface ─────────────────────────────────────────────────
// Swap MockStaffService → ApiStaffService when backend is ready.

import type { StaffRole } from '@/types/order';
import { MockStaffService } from './staff.service.mock';

export type StaffStatus = 'active' | 'inactive' | 'archived';

export interface StaffMember {
    id: string;
    name: string;
    role: StaffRole;
    branch: string | string[];
    branchIds: string[];
    status: StaffStatus;
    email: string;
    phone: string;
    password: string;
    pin: string;
    posAccess: boolean;
    joinedAt: string;
    lastLogin: string;
    ordersToday: number;
}

export interface StaffUser {
    id: string;
    name: string;
    role: StaffRole;
    branch: string;
}

export interface StaffFilter {
    branchId?: string;
    role?: StaffRole;
    status?: StaffStatus;
}

export interface StaffService {
    resolveByCredentials(identifier: string, password: string): Promise<StaffUser | null>;
    resolveByPin(pin: string): Promise<StaffMember | null>;
    getAll(filter?: StaffFilter): Promise<StaffMember[]>;
    getById(id: string): Promise<StaffMember | null>;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

let _instance: StaffService | null = null;

export function getStaffService(): StaffService {
    if (!_instance) {
        _instance = new MockStaffService();
    }
    return _instance;
}
