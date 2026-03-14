// ─── Shift Service ────────────────────────────────────────────────────────────
// Swap MockShiftService → ApiShiftService when backend is ready.

import { MockShiftService } from './shift.service.mock';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StaffShift {
    id: string;
    staffId: string;
    staffName: string;
    branchId: string;
    branchName: string;
    loginAt: number;          // Unix ms timestamp
    logoutAt?: number;        // undefined = still active
    orderIds: string[];       // orders placed during this shift
    totalSales: number;       // sum of non-cancelled order totals
    orderCount: number;
}

export interface ShiftService {
    getAll(): Promise<StaffShift[]>;
    getActive(staffId: string): Promise<StaffShift | null>;
    startShift(staffId: string, staffName: string, branchId: string, branchName: string): Promise<StaffShift>;
    endShift(shiftId: string): Promise<StaffShift>;
    addOrder(shiftId: string, orderId: string, orderTotal: number): Promise<void>;
    getByDate(date: string): Promise<StaffShift[]>;     // date: 'YYYY-MM-DD'
    getByStaff(staffId: string): Promise<StaffShift[]>;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

let _instance: ShiftService | null = null;

export function getShiftService(): ShiftService {
    if (!_instance) {
        _instance = new MockShiftService();
    }
    return _instance;
}
