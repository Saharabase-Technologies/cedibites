'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type StaffRole, resolveByCredentials } from '@/lib/data/mockStaff';

// ─── Types ────────────────────────────────────────────────────────────────────

export type { StaffRole };

export interface StaffUser {
    id: string;
    name: string;
    role: StaffRole;
    branch: string;
}

interface StaffAuthContextValue {
    staffUser: StaffUser | null;
    isLoading: boolean;
    login: (user: StaffUser) => void;
    logout: () => void;
}

// ─── Auth helper (re-exported for the login page) ─────────────────────────────

export { resolveByCredentials as resolveMockStaff };

// ─── Context ──────────────────────────────────────────────────────────────────

const StaffAuthContext = createContext<StaffAuthContextValue | null>(null);

const STORAGE_KEY = 'cedibites-staff-session';

// ─── Provider ─────────────────────────────────────────────────────────────────

export function StaffAuthProvider({ children }: { children: ReactNode }) {
    const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) setStaffUser(JSON.parse(stored) as StaffUser);
        } catch {
            localStorage.removeItem(STORAGE_KEY);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = useCallback((user: StaffUser) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        setStaffUser(user);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setStaffUser(null);
    }, []);

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
export function roleHomeRoute(role: StaffRole): string {
    if (role === 'admin')   return '/admin/dashboard';
    if (role === 'manager') return '/staff/manager/dashboard';
    return '/staff/sales/dashboard';
}

// ─── Route helper hook ────────────────────────────────────────────────────────

/** Returns role-correct internal navigation URLs for the logged-in staff member. */
export function useStaffRoutes() {
    const { staffUser } = useStaffAuth();
    const isManager = staffUser?.role === 'manager' || staffUser?.role === 'admin';
    return {
        dashboard: isManager ? '/staff/manager/dashboard' : '/staff/sales/dashboard',
        orders:    isManager ? '/staff/manager/orders'    : '/staff/sales/orders',
        newOrder:  isManager ? '/staff/manager/new-order' : '/staff/sales/new-order',
    };
}
