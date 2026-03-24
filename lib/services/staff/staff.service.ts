// ─── Staff Service Interface ─────────────────────────────────────────────────

import { ApiStaffService } from './staff.service.api';

export type { StaffMember, StaffStatus, StaffRole } from '@/types/staff';
import type { StaffMember, StaffStatus, StaffRole } from '@/types/staff';

export interface StaffBranch {
    id: string;
    name: string;
    address: string;
}

export interface StaffUser {
    id: string;
    name: string;
    role: StaffRole;
    branches: StaffBranch[];
}

export interface StaffFilter {
    branchId?: string;
    role?: StaffRole;
    status?: StaffStatus;
}

export interface StaffService {
    resolveByCredentials(identifier: string, password: string): Promise<StaffUser | null>;
    getAll(filter?: StaffFilter): Promise<StaffMember[]>;
    getById(id: string): Promise<StaffMember | null>;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

let _instance: StaffService | null = null;

export function getStaffService(): StaffService {
    if (!_instance) {
        _instance = new ApiStaffService();
    }
    return _instance;
}
