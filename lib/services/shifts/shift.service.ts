// ─── Shift Service ────────────────────────────────────────────────────────────
// Swap MockShiftService → ApiShiftService when backend is ready.

import { ApiShiftService } from './shift.service.api';
import type { MoneyGroup, MoneyLine, MoneyOnOthersOrder } from '@/lib/api/services/staff.service';

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
    /** Clock out (staff portal D29): when, and what the person confirmed. */
    clockedOutAt?: number;
    clockOut?: { money: Omit<ClockOutView, 'shift_id' | 'owing'>; owing: OwedOrder[]; note: string | null } | null;
    /** The branch manager's confirm (D30). */
    managerConfirmedAt?: number;
    managerConfirmedBy?: string | null;
    managerNote?: string | null;
}

/** One of the person's orders still owing, as Clock out lists it. */
export interface OwedOrder {
    order_id: number;
    order_number: string;
    customer: string | null;
    amount: number;
}

/** What the Clock out sheet shows, worked out by the server now. */
export interface ClockOutView {
    shift_id: number;
    money: Record<MoneyGroup, MoneyLine>;
    total: number;
    count: number;
    no_charge: MoneyLine;
    on_others_orders: MoneyOnOthersOrder[];
    owing: OwedOrder[];
}

export interface ShiftService {
    getAll(): Promise<StaffShift[]>;
    getActive(staffId: string): Promise<StaffShift | null>;
    startShift(staffId: string, staffName: string, branchId: string | null, branchName: string): Promise<StaffShift>;
    endShift(shiftId: string): Promise<StaffShift>;
    addOrder(shiftId: string, orderId: string, orderTotal: number): Promise<void>;
    getByDate(date: string): Promise<StaffShift[]>;     // date: 'YYYY-MM-DD'
    getByStaff(staffId: string): Promise<StaffShift[]>;
    /** The money one shift took, by method, from its payments. */
    getMoney(shiftId: string): Promise<Record<MoneyGroup, MoneyLine>>;
    getClockOut(shiftId: string): Promise<ClockOutView>;
    /**
     * Confirm, end the shift and sign out (D29). `seenTotal` is the total the
     * sheet showed; when the money moved since, it fails with 409 and the
     * fresh view in the error's payload.
     */
    clockOut(shiftId: string, note: string, seenTotal: number): Promise<StaffShift>;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

let _instance: ShiftService | null = null;

export function getShiftService(): ShiftService {
    if (!_instance) {
        _instance = new ApiShiftService();
    }
    return _instance;
}
