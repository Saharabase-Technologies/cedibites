import type { StaffRole } from './order';

export type { StaffRole };

export type StaffStatus = 'active' | 'inactive' | 'archived';

export type EmploymentStatus = 'active' | 'on_leave' | 'resigned';

export type SystemAccess = 'enabled' | 'disabled';

export interface StaffPermissions {
    canPlaceOrders:   boolean;
    canAdvanceOrders: boolean;
    canAccessPOS:     boolean;
    canViewReports:   boolean;
    canManageMenu:    boolean;
    canManageStaff:   boolean;
}

export interface StaffMember {
    id:               string;
    name:             string;
    email:            string;
    phone:            string;
    role:             StaffRole;
    /** Display branch name(s). */
    branch:           string | string[];
    /** System branch IDs (matches BRANCHES in BranchProvider). */
    branchIds:        string[];
    status:           StaffStatus;
    employmentStatus: EmploymentStatus;
    systemAccess:     SystemAccess;
    permissions:      StaffPermissions;
    /** 4-digit POS PIN — empty string means no POS terminal access. */
    pin:              string;
    /** Staff-portal password. */
    password:         string;
    joinedAt:         string;
    lastLogin:        string;
    ordersToday:      number;
    ssnit?:           string;
    ghanaCard?:       string;
    tinNumber?:       string;
    photoUrl?:        string;
    emergencyContact?: { name: string; phone: string; relationship: string };
    nationality?:     string;
    dateOfBirth?:     string;
}

export function defaultPermissions(role: StaffRole): StaffPermissions {
    switch (role) {
        case 'admin':
        case 'super_admin':
            return { canPlaceOrders: true,  canAdvanceOrders: true,  canAccessPOS: true,  canViewReports: true,  canManageMenu: true,  canManageStaff: true  };
        case 'branch_partner':
            return { canPlaceOrders: false, canAdvanceOrders: false, canAccessPOS: false, canViewReports: true,  canManageMenu: false, canManageStaff: false };
        case 'manager':
            return { canPlaceOrders: true,  canAdvanceOrders: true,  canAccessPOS: true,  canViewReports: true,  canManageMenu: true,  canManageStaff: true  };
        case 'call_center':
            return { canPlaceOrders: true,  canAdvanceOrders: false, canAccessPOS: true,  canViewReports: false, canManageMenu: false, canManageStaff: false };
        case 'employee':
            return { canPlaceOrders: true,  canAdvanceOrders: true,  canAccessPOS: true,  canViewReports: false, canManageMenu: false, canManageStaff: false };
        case 'kitchen':
        case 'rider':
            return { canPlaceOrders: false, canAdvanceOrders: false, canAccessPOS: false, canViewReports: false, canManageMenu: false, canManageStaff: false };
    }
}

export function roleDisplayName(role: StaffRole): string {
    const map: Record<StaffRole, string> = {
        admin:          'Admin',
        super_admin:    'Super Admin',
        branch_partner: 'Branch Partner',
        manager:        'Branch Manager',
        call_center:    'Call Center',
        employee:       'Employee',
        kitchen:        'Kitchen Staff',
        rider:          'Rider',
    };
    return map[role];
}

export function employmentStatusLabel(s: EmploymentStatus): string {
    return s === 'active' ? 'Active' : s === 'on_leave' ? 'On Leave' : 'Resigned';
}
