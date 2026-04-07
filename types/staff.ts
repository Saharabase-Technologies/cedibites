export type StaffRole =
    | 'tech_admin'
    | 'admin'
    | 'branch_partner'
    | 'manager'
    | 'call_center'
    | 'sales_staff'
    | 'kitchen'
    | 'rider';

/** Maps 1:1 with backend EmployeeStatus enum values. */
export type StaffStatus = 'active' | 'on_leave' | 'suspended' | 'terminated';

export type EmploymentStatus = 'active' | 'on_leave' | 'suspended' | 'terminated';

export type SystemAccess = 'enabled' | 'disabled';

export interface StaffPermissions {
    // Order permissions
    canViewOrders:    boolean;
    canPlaceOrders:   boolean;
    canAdvanceOrders: boolean;
    canDeleteOrders:  boolean;
    // Menu permissions
    canViewMenu:      boolean;
    canManageMenu:    boolean;
    // Branch permissions
    canViewBranches:  boolean;
    canManageBranches: boolean;
    // Customer permissions
    canViewCustomers: boolean;
    canManageCustomers: boolean;
    // Employee permissions
    canViewEmployees: boolean;
    canManageStaff:   boolean;
    // Analytics & Audit
    canViewReports:   boolean;
    canViewActivityLog: boolean;
    // Portal access
    canAccessAdminPanel:    boolean;
    canAccessManagerPortal: boolean;
    canAccessSalesPortal:   boolean;
    canAccessPartnerPortal: boolean;
    canAccessPOS:     boolean;
    canAccessKitchen: boolean;
    canAccessOrderManager: boolean;
    // Feature flags
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
    /** Only set during creation — not persisted in the list. */
    password?:        string;
    /** Controls password handling during creation: auto, custom, or prompt. */
    passwordMode?:    'auto' | 'custom' | 'prompt';
    role:             StaffRole;
    /** Display branch name(s). */
    branch:           string | string[];
    /** System branch IDs (matches BRANCHES in BranchProvider). */
    branchIds:        string[];
    status:           StaffStatus;
    employmentStatus: EmploymentStatus;
    systemAccess:     SystemAccess;
    permissions:      StaffPermissions;
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

const ALL_FALSE: StaffPermissions = {
    canViewOrders: false, canPlaceOrders: false, canAdvanceOrders: false, canDeleteOrders: false,
    canViewMenu: false, canManageMenu: false,
    canViewBranches: false, canManageBranches: false,
    canViewCustomers: false, canManageCustomers: false,
    canViewEmployees: false, canManageStaff: false,
    canViewReports: false, canViewActivityLog: false,
    canAccessAdminPanel: false, canAccessManagerPortal: false, canAccessSalesPortal: false,
    canAccessPartnerPortal: false, canAccessPOS: false, canAccessKitchen: false, canAccessOrderManager: false,
    canManageShifts: false, canManageSettings: false, canViewMyShifts: false, canViewMySales: false,
};

const ALL_TRUE: StaffPermissions = Object.fromEntries(
    Object.keys(ALL_FALSE).map(k => [k, true])
) as unknown as StaffPermissions;

export function defaultPermissions(role: StaffRole): StaffPermissions {
    switch (role) {
        case 'tech_admin':
            return { ...ALL_TRUE };
        case 'admin':
            return {
                ...ALL_TRUE,
                // Admin (business owner) does not get platform-specific permissions
            };
        case 'manager':
            return {
                ...ALL_FALSE,
                canViewOrders: true, canPlaceOrders: true, canAdvanceOrders: true, canDeleteOrders: true,
                canViewMenu: true, canManageMenu: true,
                canViewBranches: true, canManageBranches: true,
                canViewCustomers: true, canManageCustomers: true,
                canViewEmployees: true, canManageStaff: true,
                canViewReports: true,
                canAccessManagerPortal: true, canAccessPOS: true, canAccessKitchen: true, canAccessOrderManager: true,
                canManageShifts: true, canManageSettings: true, canViewMyShifts: true,
            };
        case 'branch_partner':
            return {
                ...ALL_FALSE,
                canViewOrders: true, canViewMenu: true, canViewBranches: true,
                canViewCustomers: true, canViewEmployees: true, canViewReports: true,
                canAccessPartnerPortal: true,
            };
        case 'call_center':
            return {
                ...ALL_FALSE,
                canViewOrders: true, canPlaceOrders: true, canAdvanceOrders: true,
                canViewMenu: true, canViewBranches: true,
                canViewCustomers: true, canManageCustomers: true,
                canAccessSalesPortal: true,
                canViewMyShifts: true, canViewMySales: true,
            };
        case 'sales_staff':
            return {
                ...ALL_FALSE,
                canViewOrders: true, canPlaceOrders: true, canAdvanceOrders: true,
                canViewMenu: true, canViewBranches: true, canViewCustomers: true,
                canAccessSalesPortal: true, canAccessPOS: true, canAccessKitchen: true, canAccessOrderManager: true,
                canViewMyShifts: true, canViewMySales: true,
            };
        case 'kitchen':
            return {
                ...ALL_FALSE,
                canViewOrders: true, canAdvanceOrders: true,
                canViewMenu: true,
                canAccessKitchen: true,
            };
        case 'rider':
            return {
                ...ALL_FALSE,
                canViewOrders: true, canAdvanceOrders: true,
                canViewCustomers: true,
                canAccessOrderManager: true,
            };
    }
}

export function roleDisplayName(role: StaffRole): string {
    const map: Record<StaffRole, string> = {
        tech_admin:     'Tech Admin',
        admin:          'Admin',
        branch_partner: 'Branch Partner',
        manager:        'Branch Manager',
        call_center:    'Call Center',
        sales_staff:    'Sales Staff',
        kitchen:        'Kitchen Staff',
        rider:          'Rider',
    };
    return map[role];
}

export function staffStatusLabel(s: StaffStatus): string {
    const map: Record<StaffStatus, string> = {
        active: 'Active',
        on_leave: 'On Leave',
        suspended: 'Suspended',
        terminated: 'Terminated',
    };
    return map[s] ?? s;
}

export function employmentStatusLabel(s: EmploymentStatus): string {
    return staffStatusLabel(s as StaffStatus);
}
