// ─── Mock Staff Service ──────────────────────────────────────────────────────
// Wraps the existing MOCK_STAFF + auth helpers from lib/data/mockStaff.ts.
// When backend is ready, replace with ApiStaffService.

import type { StaffService, StaffMember, StaffUser, StaffFilter } from './staff.service';
import {
    MOCK_STAFF,
    resolveByCredentials as _resolveByCredentials,
    resolveByPin as _resolveByPin,
} from '@/lib/data/mockStaff';

export class MockStaffService implements StaffService {
    async resolveByCredentials(identifier: string, password: string): Promise<StaffUser | null> {
        return _resolveByCredentials(identifier, password);
    }

    async resolveByPin(pin: string): Promise<StaffMember | null> {
        return _resolveByPin(pin);
    }

    async getAll(filter?: StaffFilter): Promise<StaffMember[]> {
        let staff = [...MOCK_STAFF];

        if (filter?.branchId) {
            staff = staff.filter(s => s.branchIds.includes(filter.branchId!));
        }
        if (filter?.role) {
            staff = staff.filter(s => s.role === filter.role);
        }
        if (filter?.status) {
            staff = staff.filter(s => s.status === filter.status);
        }

        return staff;
    }

    async getById(id: string): Promise<StaffMember | null> {
        return MOCK_STAFF.find(s => s.id === id) ?? null;
    }
}
