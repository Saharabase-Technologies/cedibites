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
    canManageShifts:  boolean;
    canManageSettings: boolean;
    canViewMyShifts:  boolean;
    canViewMySales:   boolean;
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
            return { canPlaceOrders: true,  canAdvanceOrders: true,  canAccessPOS: true,  canViewReports: true,  canManageMenu: true,  canManageStaff: true,  canManageShifts: true,  canManageSettings: true,  canViewMyShifts: true,  canViewMySales: true  };
        case 'manager':
            return { canPlaceOrders: true,  canAdvanceOrders: true,  canAccessPOS: true,  canViewReports: true,  canManageMenu: true,  canManageStaff: true,  canManageShifts: true,  canManageSettings: true,  canViewMyShifts: true,  canViewMySales: false };
        case 'branch_partner':
            return { canPlaceOrders: false, canAdvanceOrders: false, canAccessPOS: false, canViewReports: true,  canManageMenu: false, canManageStaff: false, canManageShifts: false, canManageSettings: false, canViewMyShifts: false, canViewMySales: false };
        case 'call_center':
            return { canPlaceOrders: true,  canAdvanceOrders: false, canAccessPOS: false, canViewReports: false, canManageMenu: false, canManageStaff: false, canManageShifts: false, canManageSettings: false, canViewMyShifts: true,  canViewMySales: true  };
        case 'sales_staff':
            return { canPlaceOrders: true,  canAdvanceOrders: true,  canAccessPOS: true,  canViewReports: false, canManageMenu: false, canManageStaff: false, canManageShifts: false, canManageSettings: false, canViewMyShifts: true,  canViewMySales: true  };
        case 'kitchen':
        case 'rider':
            return { canPlaceOrders: false, canAdvanceOrders: false, canAccessPOS: false, canViewReports: false, canManageMenu: false, canManageStaff: false, canManageShifts: false, canManageSettings: false, canViewMyShifts: false, canViewMySales: false };
    }
}

export function roleDisplayName(role: StaffRole): string {
    const map: Record<StaffRole, string> = {
        admin:          'Admin',
        super_admin:    'Super Admin',
        branch_partner: 'Branch Partner',
        manager:        'Branch Manager',
        call_center:    'Call Center',
        sales_staff:    'Sales Staff',
        kitchen:        'Kitchen Staff',
        rider:          'Rider',
    };
    return map[role];
}

export function employmentStatusLabel(s: EmploymentStatus): string {
    return s === 'active' ? 'Active' : s === 'on_leave' ? 'On Leave' : 'Resigned';
}
