'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { type StaffRole } from '@/types/staff';
import { clearStaffToken, getStaffToken, staffService, type StaffBranch } from '@/lib/api/services/staff.service';
import { ApiError } from '@/lib/api/client';
import { disconnectEcho, getEcho } from '@/lib/echo';
import { getShiftService } from '@/lib/services/shifts/shift.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export type { StaffRole };

export type { StaffBranch };

export interface StaffUser {
    id: string;
    name: string;
    role: StaffRole;
    branches: StaffBranch[];
    permissions: string[];
    email?: string;
    phone?: string;
    joinedAt?: string;
    must_reset_password?: boolean;
}

interface StaffAuthContextValue {
    staffUser: StaffUser | null;
    isLoading: boolean;
    login: (user: StaffUser) => void;
    logout: (redirectTo?: string) => void;
    can: (permission: string) => boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const StaffAuthContext = createContext<StaffAuthContextValue | null>(null);

const STORAGE_KEY = 'cedibites-staff-session';

// ─── Provider ─────────────────────────────────────────────────────────────────

export function StaffAuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // ── Session hydration + background validation ──
    useEffect(() => {
        const token = getStaffToken();
        if (!token) {
            setIsLoading(false);
            return;
        }
        // Optimistic: load cached user immediately to avoid flash
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as StaffUser;
                // Guard against old cached sessions that predate the branches/permissions fields
                if (!parsed.branches) parsed.branches = [];
                if (!parsed.permissions) parsed.permissions = [];
                setStaffUser(parsed);
            }
        } catch {
            localStorage.removeItem(STORAGE_KEY);
        }
        // Then validate token + get fresh data from API
        staffService.me().then(user => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
            setStaffUser(user);
        }).catch((error: unknown) => {
            // Only clear the session on 401 — for network errors or transient
            // server failures, keep the cached user so we don't log out needlessly.
            if (error instanceof ApiError && error.status === 401) {
                clearStaffToken();
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem('cedibites-kitchen-branchId');
                localStorage.removeItem('cedibites-om-branchId');
                localStorage.removeItem('cedibites-pos-branchId');
                setStaffUser(null);
            }
        }).finally(() => {
            setIsLoading(false);
        });
    }, []);

    // ── Reverb session sync ──
    useEffect(() => {
        if (!staffUser) return;

        const echo = getEcho();
        if (!echo) return;

        const channel = echo.private(`App.Models.User.${staffUser.id}`);

        channel.listen('.staff.session', (event: { type: string; user?: StaffUser }) => {
            if (event.type === 'session.revoked') {
                clearStaffToken();
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem('cedibites-kitchen-branchId');
                localStorage.removeItem('cedibites-om-branchId');
                localStorage.removeItem('cedibites-pos-branchId');
                setStaffUser(null);
                router.push('/staff/login');
            } else if (event.type === 'user.updated' && event.user) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(event.user));
                setStaffUser(event.user);
            }
        });

        return () => {
            echo.leave(`App.Models.User.${staffUser.id}`);
        };
    }, [staffUser?.id, router]); // eslint-disable-line react-hooks/exhaustive-deps

    const login = useCallback((user: StaffUser) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        setStaffUser(user);
        // Start shift tracking for staff/manager/admin portals (not kitchen/rider)
        const portalPermissions = ['access_manager_portal', 'access_sales_portal', 'access_admin_panel'];
        if (user.permissions?.some(p => portalPermissions.includes(p))) {
            getShiftService().startShift(user.id, user.name, user.branches[0]?.id ?? '', user.branches[0]?.name ?? '').catch(() => {});
        }
    }, []);

    const logout = useCallback((redirectTo = '/staff/login') => {
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
        disconnectEcho();
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('cedibites-kitchen-branchId');
        localStorage.removeItem('cedibites-om-branchId');
        localStorage.removeItem('cedibites-pos-branchId');
        setStaffUser(null);
        router.push(redirectTo);
    }, [router]);

    const can = useCallback(
        (permission: string) => staffUser?.permissions?.includes(permission) ?? false,
        [staffUser]
    );

    return (
        <StaffAuthContext.Provider value={{ staffUser, isLoading, login, logout, can }}>
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

/** Where to redirect after login, based on permissions. */
export function permissionsHomeRoute(permissions: string[]): string {
    const has = (p: string) => permissions.includes(p);
    if (has('access_admin_panel'))    return '/admin/dashboard';
    if (has('access_manager_portal')) return '/staff/manager/dashboard';
    if (has('access_partner_portal')) return '/partner/dashboard';
    if (has('access_sales_portal'))   return '/staff/sales/dashboard';
    if (has('access_kitchen'))        return '/kitchen/display';
    if (has('access_order_manager'))  return '/order-manager';
    return '/staff/login';
}

/** @deprecated Use permissionsHomeRoute instead. */
export function roleHomeRoute(role: StaffRole | string): string {
    if (role === 'super_admin' || role === 'admin') return '/admin/dashboard';
    if (role === 'manager') return '/staff/manager/dashboard';
    if (role === 'branch_partner') return '/partner/dashboard';
    if (role === 'call_center' || role === 'employee') return '/staff/sales/dashboard';
    return '/staff/login';
}

// ─── Route helper hook ────────────────────────────────────────────────────────

/** Returns permission-correct internal navigation URLs for the logged-in staff member. */
export function useStaffRoutes() {
    const { can } = useStaffAuth();
    const isManager = can('access_manager_portal');
    return {
        dashboard: isManager ? '/staff/manager/dashboard' : '/staff/sales/dashboard',
        orders:    isManager ? '/staff/manager/orders'    : '/staff/sales/orders',
        newOrder:  isManager ? '/staff/manager/new-order' : '/staff/sales/new-order',
    };
}
