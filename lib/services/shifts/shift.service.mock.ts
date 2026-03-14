// ─── Mock Shift Service ───────────────────────────────────────────────────────

import type { ShiftService, StaffShift } from './shift.service';

const STORAGE_KEY = 'cedibites-shifts';

function loadShifts(): StaffShift[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as StaffShift[];
    } catch {
        return [];
    }
}

function saveShifts(shifts: StaffShift[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shifts));
}

function nanoid(): string {
    return Math.random().toString(36).slice(2, 11);
}

function toDateStr(ts: number): string {
    return new Date(ts).toISOString().slice(0, 10);
}

export class MockShiftService implements ShiftService {
    async getAll(): Promise<StaffShift[]> {
        return loadShifts();
    }

    async getActive(staffId: string): Promise<StaffShift | null> {
        return loadShifts().find(s => s.staffId === staffId && !s.logoutAt) ?? null;
    }

    async startShift(staffId: string, staffName: string, branchId: string, branchName: string): Promise<StaffShift> {
        // Close any open shift for this staff first
        const shifts = loadShifts();
        const open = shifts.find(s => s.staffId === staffId && !s.logoutAt);
        if (open) {
            open.logoutAt = Date.now();
        }

        const shift: StaffShift = {
            id: nanoid(),
            staffId,
            staffName,
            branchId,
            branchName,
            loginAt: Date.now(),
            orderIds: [],
            totalSales: 0,
            orderCount: 0,
        };
        shifts.push(shift);
        saveShifts(shifts);
        return shift;
    }

    async endShift(shiftId: string): Promise<StaffShift> {
        const shifts = loadShifts();
        const shift = shifts.find(s => s.id === shiftId);
        if (!shift) throw new Error(`Shift ${shiftId} not found`);
        shift.logoutAt = Date.now();
        saveShifts(shifts);
        return shift;
    }

    async addOrder(shiftId: string, orderId: string, orderTotal: number): Promise<void> {
        const shifts = loadShifts();
        const shift = shifts.find(s => s.id === shiftId);
        if (!shift) return;
        if (!shift.orderIds.includes(orderId)) {
            shift.orderIds.push(orderId);
            shift.totalSales += orderTotal;
            shift.orderCount += 1;
        }
        saveShifts(shifts);
    }

    async getByDate(date: string): Promise<StaffShift[]> {
        return loadShifts().filter(s => toDateStr(s.loginAt) === date);
    }

    async getByStaff(staffId: string): Promise<StaffShift[]> {
        return loadShifts().filter(s => s.staffId === staffId);
    }
}
