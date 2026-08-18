export type StaffRole =
    | 'tech_admin'
    | 'admin'
    | 'branch_partner'
    | 'manager'
    | 'call_center'
    | 'sales_staff'
    | 'kitchen'
    | 'rider'
    | 'warehouse_manager'
    | 'purchasing_clerk';

/** Maps 1:1 with backend EmployeeStatus enum values. */
export type StaffStatus = 'active' | 'on_leave' | 'suspended' | 'terminated';

export type EmploymentStatus = 'active' | 'on_leave' | 'suspended' | 'terminated';

export type SystemAccess = 'enabled' | 'disabled';

// ─── Role rules ───────────────────────────────────────────────────────────────

/** Mirrors backend App\Enums\BranchRule. */
export type BranchRule = 'none' | 'exactly_one' | 'one_or_more';

export interface RoleRule {
    /** How many branches this role is assigned. */
    branch: BranchRule;
    /**
     * Whether the staff editor may hand this role out. Only `tech_admin` may
     * not: it carries the platform tools, and separating it from `admin` is
     * worth nothing if the staff editor will grant it. It is issued from the
     * platform portal, behind a passcode, by someone who already holds it.
     */
    assignable: boolean;
    /** Where this role lands after signing in. */
    portal: string;
    /** Plain-language summary shown under the role picker. Not authorisation —
     *  the server decides that from the role. This is so the person filling the
     *  form knows what they are handing over. */
    can: string[];
}

/**
 * The single source of truth for what a role means, mirroring backend
 * App\Enums\Role::branchRule() and ::isAssignableByAdmin().
 *
 * This replaces `defaultPermissions()`, which returned a per-role permission
 * matrix the editor wrote back to the server as direct grants. That matrix went
 * stale the moment the manager's powers were narrowed, and every save re-granted
 * the removed ones. Permissions now come from the role on the server and are
 * never sent from here.
 */
export const ROLE_RULES: Record<StaffRole, RoleRule> = {
    tech_admin: {
        branch: 'none',
        assignable: false,
        portal: 'Platform + Admin',
        can: ['Everything an Admin can, plus the platform tools: password vault, maintenance mode, error logs, and adding other platform admins.'],
    },
    admin: {
        branch: 'none',
        assignable: true,
        portal: 'Admin Portal',
        can: [
            'Run the whole business: menu and prices, branches, staff, customers',
            'Full reporting across every branch',
            'Everything in inventory',
        ],
    },
    manager: {
        branch: 'exactly_one',
        assignable: true,
        portal: 'Manager Portal',
        can: [
            'Take and advance orders at their branch',
            'Mark a dish sold out at their branch (not the price)',
            'Open and close their branch',
            'Keep private notes on their own staff',
            'Requisitions, transfers, wastage and daily closing',
        ],
    },
    sales_staff: {
        branch: 'exactly_one',
        assignable: true,
        portal: 'Sales Portal + POS',
        can: [
            'Take and advance orders at their branch',
            'POS terminal, kitchen display and order manager',
            'Their own shifts and sales',
        ],
    },
    kitchen: {
        branch: 'exactly_one',
        assignable: true,
        portal: 'Kitchen Display',
        can: ['See and advance orders on the kitchen display'],
    },
    call_center: {
        branch: 'none',
        assignable: true,
        portal: 'Sales Portal',
        can: [
            'Take orders for any branch by phone',
            'Create and update customer records',
            'Their own shifts and sales',
        ],
    },
    rider: {
        branch: 'one_or_more',
        assignable: true,
        portal: 'Order Manager',
        can: ['See and advance delivery orders for the branches they cover'],
    },
    branch_partner: {
        branch: 'one_or_more',
        assignable: true,
        portal: 'Partner Portal',
        can: ['Read-only view of the branches they hold: orders, takings and performance'],
    },
    warehouse_manager: {
        branch: 'none',
        assignable: true,
        portal: 'Inventory Portal',
        can: [
            'Run the mother kitchen: transfers, requisitions, wastage, production',
            'Curate the item catalog, categories and units',
            'Reconciliation and daily closing across every location',
        ],
    },
    purchasing_clerk: {
        branch: 'none',
        assignable: true,
        portal: 'Inventory Portal',
        can: [
            'Maintain the supplier list',
            'Raise and manage purchase orders (Admin approves over ₵10k)',
            'Record receipts, including an urgent market buy',
        ],
    },
};

/** The roles the staff editor may offer, in the order they should be listed. */
export const ASSIGNABLE_ROLES: StaffRole[] = (Object.keys(ROLE_RULES) as StaffRole[])
    .filter(role => ROLE_RULES[role].assignable);

export function branchRuleFor(role: StaffRole): BranchRule {
    return ROLE_RULES[role].branch;
}

/** Whether this role takes a branch assignment at all. */
export function roleNeedsBranch(role: StaffRole): boolean {
    return ROLE_RULES[role].branch !== 'none';
}

/** Whether this role may hold more than one branch. */
export function roleAllowsManyBranches(role: StaffRole): boolean {
    return ROLE_RULES[role].branch === 'one_or_more';
}

export function branchRuleLabel(role: StaffRole): string {
    switch (ROLE_RULES[role].branch) {
        case 'none':        return 'Company-wide, no branch';
        case 'exactly_one': return 'One branch';
        case 'one_or_more': return 'One or more branches';
    }
}

/** Validate a branch selection against the role's rule. Null when it is fine. */
export function validateBranchSelection(role: StaffRole, branchIds: string[]): string | null {
    switch (ROLE_RULES[role].branch) {
        case 'none':
            return null;
        case 'exactly_one':
            return branchIds.length === 1 ? null : 'Select exactly one branch for this role.';
        case 'one_or_more':
            return branchIds.length >= 1 ? null : 'Select at least one branch for this role.';
    }
}

// ─── Staff member ─────────────────────────────────────────────────────────────

export interface StaffMember {
    /** EMPLOYEE id. Not the users-table id — see `userId`. */
    id:               string;
    /**
     * users-table id.
     *
     * The only correct handle for anything that addresses the person rather
     * than the employment: message audiences, "was this me?" checks, permission
     * lookups. `id` above is the employee row and the two are not
     * interchangeable — mixing them silently messages the wrong person, because
     * both are small integers and one will usually resolve to somebody.
     *
     * Optional because the staff editor builds a blank draft before the account
     * exists, and at that point there genuinely is no user to point at. Every
     * record that came back from the API has one.
     */
    userId?:          number;
    name:             string;
    email:            string;
    phone:            string;
    /** Only set during creation — not persisted in the list. */
    password?:        string;
    /** Controls password handling during creation: auto, custom, or prompt. */
    passwordMode?:    'auto' | 'custom' | 'prompt';
    role:             StaffRole;
    /** Display branch name(s). Empty for a company-wide role. */
    branch:           string | string[];
    /** System branch IDs (matches BRANCHES in BranchProvider). */
    branchIds:        string[];
    status:           StaffStatus;
    employmentStatus: EmploymentStatus;
    systemAccess:     SystemAccess;
    /**
     * Backend permission names, read-only. Shown so an admin can see what a
     * person actually holds; never edited here and never sent back. What
     * someone can do is decided by their role on the server.
     */
    permissions:      string[];
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

export function roleDisplayName(role: StaffRole): string {
    const map: Record<StaffRole, string> = {
        tech_admin:     'Platform Admin',
        admin:          'Admin',
        branch_partner: 'Branch Partner',
        manager:        'Branch Manager',
        call_center:    'Call Center',
        sales_staff:    'Sales Staff',
        kitchen:           'Kitchen Staff',
        rider:             'Rider',
        warehouse_manager: 'Warehouse Manager',
        purchasing_clerk:  'Purchasing Clerk',
    };
    return map[role] ?? role;
}

/** Turn a backend permission name into something readable, for display only. */
export function permissionDisplayName(name: string): string {
    return name
        .replace(/[._]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
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
