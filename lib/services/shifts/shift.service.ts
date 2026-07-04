// ─── Shift Service ────────────────────────────────────────────────────────────
// Swap MockShiftService → ApiShiftService when backend is ready.

import { ApiShiftService } from './shift.service.api';

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
    totalSales: number;       // gross: goods + third-party delivery fees
    goodsSales: number;       // restaurant revenue = totalSales − deliveryFees
    deliveryFees: number;     // third-party delivery, pass-through (not revenue)
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
        _instance = new ApiShiftService();
    }
    return _instance;
}
