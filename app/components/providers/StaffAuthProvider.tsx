'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { type StaffRole } from '@/types/staff';
import { clearStaffToken, getStaffToken, staffService } from '@/lib/api/services/staff.service';
import { getShiftService } from '@/lib/services/shifts/shift.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export type { StaffRole };

export interface StaffUser {
    id: string;
    name: string;
    role: StaffRole;
    branch: string;      // display name of primary branch
    branchId: string;    // system ID of primary branch
    branchIds?: string[]; // all assigned branch IDs
    email?: string;
    phone?: string;
    pin?: string;
    joinedAt?: string;
    must_reset_password?: boolean;
}

interface StaffAuthContextValue {
    staffUser: StaffUser | null;
    isLoading: boolean;
    login: (user: StaffUser) => void;
    logout: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const StaffAuthContext = createContext<StaffAuthContextValue | null>(null);

const STORAGE_KEY = 'cedibites-staff-session';

// ─── Provider ─────────────────────────────────────────────────────────────────

export function StaffAuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = getStaffToken();
        if (!token) {
            setIsLoading(false);
            return;
        }
        // Optimistic: load cached user immediately to avoid flash
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) setStaffUser(JSON.parse(stored) as StaffUser);
        } catch {
            localStorage.removeItem(STORAGE_KEY);
        }
        // Then validate token + get fresh data from API
        staffService.me().then(user => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
            setStaffUser(user);
        }).catch(() => {
            // Token invalid/expired — clear everything
            clearStaffToken();
            localStorage.removeItem(STORAGE_KEY);
            setStaffUser(null);
        }).finally(() => {
            setIsLoading(false);
        });
    }, []);

    const login = useCallback((user: StaffUser) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        setStaffUser(user);
        // Start shift tracking (kitchen/rider have no shifts)
        if (user.role !== 'kitchen' && user.role !== 'rider') {
            getShiftService().startShift(user.id, user.name, user.branchId, user.branch).catch(() => {});
        }
    }, []);

    const logout = useCallback(() => {
        // End active shift before clearing session
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const u = JSON.parse(stored) as StaffUser;
                getShiftService().getActive(u.id).then(shift => {
                    if (shift) getShiftService().endShift(shift.id).catch(() => {});
                }).catch(() => {});
            } catch { /* ignore */ }
        }
        staffService.logout().catch(() => {});
        clearStaffToken();
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('cedibites-kitchen-branchId');
        localStorage.removeItem('cedibites-om-branchId');
        localStorage.removeItem('cedibites-pos-branchId');
        setStaffUser(null);
        router.push('/staff/login');
    }, [router]);

    return (
        <StaffAuthContext.Provider value={{ staffUser, isLoading, login, logout }}>
            {children}
        </StaffAuthContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStaffAuth() {
    const ctx = useContext(StaffAuthContext);
    if (!ctx) throw new Error('useStaffAuth must be used within StaffAuthProvider');
    return ctx;
}

/** Where to redirect after login, by role. */
export function roleHomeRoute(role: StaffRole | string): string {
    if (role === 'super_admin' || role === 'admin') return '/admin/dashboard';
    if (role === 'manager') return '/staff/manager/dashboard';
    if (role === 'branch_partner') return '/partner/dashboard';
    if (role === 'call_center' || role === 'employee') return '/staff/sales/dashboard';
    // kitchen and rider have no portal — redirect to login
    return '/staff/login';
}

// ─── Route helper hook ────────────────────────────────────────────────────────

/** Returns role-correct internal navigation URLs for the logged-in staff member. */
export function useStaffRoutes() {
    const { staffUser } = useStaffAuth();
    const isManager = staffUser?.role === 'manager' || staffUser?.role === 'super_admin';
    return {
        dashboard: isManager ? '/staff/manager/dashboard' : '/staff/sales/dashboard',
        orders:    isManager ? '/staff/manager/orders'    : '/staff/sales/orders',
        newOrder:  isManager ? '/staff/manager/new-order' : '/staff/sales/new-order',
    };
}
