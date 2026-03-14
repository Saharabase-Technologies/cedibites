// ─── Shared Staff Types & Data ────────────────────────────────────────────────
// Single source of truth for all staff across the app.
// Staff Portal login: email/phone + password   (resolveByCredentials)
// POS terminal login: 4-digit PIN              (resolveByPin)

export type StaffRole =
    | 'super_admin'     // God mode — full platform access, creates sub-admins
    | 'branch_partner'  // Read-only investor scoped to their branch(es)
    | 'manager'         // Branch manager — full ops for their branch
    | 'call_center'     // Places orders, cannot advance order status
    | 'kitchen'         // KDS display only, no portal login
    | 'rider';          // Dormant for now

export type StaffStatus = 'active' | 'inactive' | 'archived'; // kept for archive workflow

export type EmploymentStatus = 'active' | 'on_leave' | 'resigned';

export type SystemAccess = 'enabled' | 'disabled';

export interface StaffPermissions {
    canPlaceOrders:   boolean;   // call_center, manager, super_admin
    canAdvanceOrders: boolean;   // manager, super_admin by default; exception-granted for call_center
    canAccessPOS:     boolean;   // staff with a PIN who work at the counter
    canViewReports:   boolean;   // manager, super_admin, branch_partner
    canManageMenu:    boolean;   // manager (if delegated), super_admin
    canManageStaff:   boolean;   // manager (if delegated), super_admin
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
    status:           StaffStatus;           // for archive/delete workflow
    /** Is this person still employed? */
    employmentStatus: EmploymentStatus;
    /** Can this person log in to the portal or POS? */
    systemAccess:     SystemAccess;
    /** Granular permission overrides. */
    permissions:      StaffPermissions;
    /** 4-digit POS PIN — empty string means no POS terminal access. */
    pin:              string;
    /** Staff-portal password. */
    password:         string;
    joinedAt:         string;
    lastLogin:        string;
    ordersToday:      number;
    // ── HR fields (all optional) ───────────────────────────────────────────
    ssnit?:           string;
    ghanaCard?:       string;
    tinNumber?:       string;
    photoUrl?:        string;
    emergencyContact?: { name: string; phone: string; relationship: string };
    nationality?:     string;
    dateOfBirth?:     string;
}

// ─── Role default permissions ─────────────────────────────────────────────────

export function defaultPermissions(role: StaffRole): StaffPermissions {
    switch (role) {
        case 'super_admin':
            return { canPlaceOrders: true,  canAdvanceOrders: true,  canAccessPOS: false, canViewReports: true,  canManageMenu: true,  canManageStaff: true  };
        case 'branch_partner':
            return { canPlaceOrders: false, canAdvanceOrders: false, canAccessPOS: false, canViewReports: true,  canManageMenu: false, canManageStaff: false };
        case 'manager':
            return { canPlaceOrders: true,  canAdvanceOrders: true,  canAccessPOS: true,  canViewReports: true,  canManageMenu: true,  canManageStaff: true  };
        case 'call_center':
            return { canPlaceOrders: true,  canAdvanceOrders: false, canAccessPOS: true,  canViewReports: false, canManageMenu: false, canManageStaff: false };
        case 'kitchen':
        case 'rider':
            return { canPlaceOrders: false, canAdvanceOrders: false, canAccessPOS: false, canViewReports: false, canManageMenu: false, canManageStaff: false };
    }
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export function roleDisplayName(role: StaffRole): string {
    const map: Record<StaffRole, string> = {
        super_admin:    'Super Admin',
        branch_partner: 'Branch Partner',
        manager:        'Branch Manager',
        call_center:    'Call Center',
        kitchen:        'Kitchen Staff',
        rider:          'Rider',
    };
    return map[role];
}

export function employmentStatusLabel(s: EmploymentStatus): string {
    return s === 'active' ? 'Active' : s === 'on_leave' ? 'On Leave' : 'Resigned';
}

// ─── Mock data ────────────────────────────────────────────────────────────────
// Branch IDs: '1'=Osu · '2'=East Legon · '3'=Spintex

export const MOCK_STAFF: StaffMember[] = [

    // ── Super Admins ──────────────────────────────────────────────────────────
    {
        id: 'u1',  name: 'Nana Kwame Adjei',
        email: 'admin@cedibites.com',     phone: '0244123456',
        role: 'super_admin', branch: 'All Branches', branchIds: ['1','2','3'],
        status: 'active', employmentStatus: 'active', systemAccess: 'enabled',
        permissions: defaultPermissions('super_admin'),
        pin: '', password: 'admin123',
        joinedAt: 'Jan 2024', lastLogin: '2 mins ago', ordersToday: 0,
    },

    // ── Branch Partners ───────────────────────────────────────────────────────
    {
        id: 'u0',  name: 'Kwabena Asare',
        email: 'partner@cedibites.com',   phone: '0244999888',
        role: 'branch_partner', branch: 'East Legon', branchIds: ['2'],
        status: 'active', employmentStatus: 'active', systemAccess: 'enabled',
        permissions: defaultPermissions('branch_partner'),
        pin: '', password: 'partner123',
        joinedAt: 'Jun 2024', lastLogin: 'Today', ordersToday: 0,
    },

    // ── Managers ──────────────────────────────────────────────────────────────
    {
        id: 'u2',  name: 'Ama Boateng',
        email: 'manager@cedibites.com',   phone: '0201987654',
        role: 'manager', branch: 'East Legon', branchIds: ['2'],
        status: 'active', employmentStatus: 'active', systemAccess: 'enabled',
        permissions: defaultPermissions('manager'),
        pin: '', password: 'manager123',
        joinedAt: 'Feb 2024', lastLogin: '1 hr ago', ordersToday: 0,
    },
    {
        id: 'u3',  name: 'Kwame Asante',
        email: 'kwame.mgr@cedibites.com', phone: '0277456789',
        role: 'manager', branch: 'Osu', branchIds: ['1'],
        status: 'active', employmentStatus: 'active', systemAccess: 'enabled',
        permissions: defaultPermissions('manager'),
        pin: '', password: 'manager123',
        joinedAt: 'Feb 2024', lastLogin: '3 hrs ago', ordersToday: 0,
    },
    {
        id: 'u4',  name: 'Abena Ofori',
        email: 'abena.mgr@cedibites.com', phone: '0265321789',
        role: 'manager', branch: 'Spintex', branchIds: ['3'],
        status: 'active', employmentStatus: 'active', systemAccess: 'enabled',
        permissions: defaultPermissions('manager'),
        pin: '', password: 'manager123',
        joinedAt: 'Mar 2024', lastLogin: 'Yesterday', ordersToday: 0,
    },

    // ── Call Center Staff (was: Sales) ────────────────────────────────────────
    {
        id: 'u5',  name: 'Kofi Mensah',
        email: 'sales@cedibites.com',     phone: '0244100001',
        role: 'call_center', branch: 'East Legon', branchIds: ['2'],
        status: 'active', employmentStatus: 'active', systemAccess: 'enabled',
        permissions: defaultPermissions('call_center'),
        pin: '1234', password: 'sales123',
        joinedAt: 'Mar 2024', lastLogin: '30 mins ago', ordersToday: 7,
    },
    {
        id: 'u6',  name: 'Esi Darko',
        email: 'esi@cedibites.com',       phone: '0556123456',
        role: 'call_center', branch: 'East Legon', branchIds: ['2'],
        status: 'active', employmentStatus: 'active', systemAccess: 'enabled',
        permissions: defaultPermissions('call_center'),
        pin: '2345', password: 'sales123',
        joinedAt: 'Apr 2024', lastLogin: '45 mins ago', ordersToday: 6,
    },
    {
        id: 'u7',  name: 'Kwame Darko',
        email: 'kwamed@cedibites.com',    phone: '0270789456',
        role: 'call_center', branch: 'Osu', branchIds: ['1'],
        status: 'active', employmentStatus: 'active', systemAccess: 'enabled',
        permissions: defaultPermissions('call_center'),
        pin: '3456', password: 'sales123',
        joinedAt: 'Apr 2024', lastLogin: '2 hrs ago', ordersToday: 7,
    },
    {
        id: 'u8',  name: 'Kofi Acheampong',
        email: 'kofia@cedibites.com',     phone: '0249654321',
        role: 'call_center', branch: 'Osu', branchIds: ['1'],
        status: 'active', employmentStatus: 'active', systemAccess: 'enabled',
        permissions: defaultPermissions('call_center'),
        pin: '4567', password: 'sales123',
        joinedAt: 'Mar 2024', lastLogin: '30 mins ago', ordersToday: 12,
    },
    {
        id: 'u9',  name: 'Akosua Osei',
        email: 'akosua@cedibites.com',    phone: '0270789001',
        role: 'call_center', branch: 'Spintex', branchIds: ['3'],
        status: 'active', employmentStatus: 'active', systemAccess: 'enabled',
        permissions: defaultPermissions('call_center'),
        pin: '5678', password: 'sales123',
        joinedAt: 'Apr 2024', lastLogin: '2 hrs ago', ordersToday: 7,
    },
    {
        id: 'u10', name: 'Nana Agyemang',
        email: 'nana@cedibites.com',      phone: '0200112233',
        role: 'call_center', branch: 'East Legon', branchIds: ['2'],
        status: 'inactive', employmentStatus: 'active', systemAccess: 'disabled',
        permissions: defaultPermissions('call_center'),
        pin: '6789', password: 'sales123',
        joinedAt: 'Jan 2025', lastLogin: '2 weeks ago', ordersToday: 0,
    },
    {
        id: 'u11', name: 'Kweku Baiden',
        email: 'kweku.old@cedibites.com', phone: '0201456789',
        role: 'call_center', branch: 'East Legon', branchIds: ['2'],
        status: 'inactive', employmentStatus: 'on_leave', systemAccess: 'disabled',
        permissions: defaultPermissions('call_center'),
        pin: '', password: 'sales123',
        joinedAt: 'Jan 2024', lastLogin: '2 weeks ago', ordersToday: 0,
    },
    {
        id: 'u12', name: 'Adjoa Nyarko',
        email: 'adjoa.arch@cedibites.com', phone: '0277654123',
        role: 'call_center', branch: 'Osu', branchIds: ['1'],
        status: 'archived', employmentStatus: 'resigned', systemAccess: 'disabled',
        permissions: defaultPermissions('call_center'),
        pin: '', password: 'sales123',
        joinedAt: 'Dec 2023', lastLogin: '3 months ago', ordersToday: 0,
    },

    // ── Kitchen Staff ─────────────────────────────────────────────────────────
    {
        id: 'u13', name: 'Kwame Frimpong',
        email: 'kwamef@cedibites.com',    phone: '0277654321',
        role: 'kitchen', branch: 'East Legon', branchIds: ['2'],
        status: 'active', employmentStatus: 'active', systemAccess: 'disabled',
        permissions: defaultPermissions('kitchen'),
        pin: '', password: 'kitchen123',
        joinedAt: 'Jan 2025', lastLogin: 'Today', ordersToday: 0,
    },
    {
        id: 'u14', name: 'Abena Osei',
        email: 'abenao@cedibites.com',    phone: '0551234567',
        role: 'kitchen', branch: 'East Legon', branchIds: ['2'],
        status: 'active', employmentStatus: 'active', systemAccess: 'disabled',
        permissions: defaultPermissions('kitchen'),
        pin: '', password: 'kitchen123',
        joinedAt: 'Nov 2024', lastLogin: 'Today', ordersToday: 0,
    },
    {
        id: 'u15', name: 'Adjoa Appiah',
        email: 'adjoaa@cedibites.com',    phone: '0244567890',
        role: 'kitchen', branch: 'East Legon', branchIds: ['2'],
        status: 'inactive', employmentStatus: 'on_leave', systemAccess: 'disabled',
        permissions: defaultPermissions('kitchen'),
        pin: '', password: 'kitchen123',
        joinedAt: 'Jan 2026', lastLogin: 'Never', ordersToday: 0,
    },

    // ── Riders ────────────────────────────────────────────────────────────────
    {
        id: 'u16', name: 'Yaw Asante',
        email: 'yaw@cedibites.com',       phone: '0266778899',
        role: 'rider', branch: 'East Legon', branchIds: ['2'],
        status: 'active', employmentStatus: 'active', systemAccess: 'disabled',
        permissions: defaultPermissions('rider'),
        pin: '', password: 'rider123',
        joinedAt: 'Sep 2024', lastLogin: 'Today', ordersToday: 4,
    },
    {
        id: 'u17', name: 'Akua Boateng',
        email: 'akuab@cedibites.com',     phone: '0245678901',
        role: 'rider', branch: 'East Legon', branchIds: ['2'],
        status: 'active', employmentStatus: 'active', systemAccess: 'disabled',
        permissions: defaultPermissions('rider'),
        pin: '', password: 'rider123',
        joinedAt: 'Dec 2024', lastLogin: 'Today', ordersToday: 3,
    },

    // ── Call Center (multi-branch) ─────────────────────────────────────────────
    {
        id: 'u18', name: 'Yaa Asantewaa',
        email: 'yaa@cedibites.com',       phone: '0244789123',
        role: 'call_center', branch: ['Osu', 'East Legon', 'Spintex'], branchIds: ['1','2','3'],
        status: 'active', employmentStatus: 'active', systemAccess: 'enabled',
        permissions: defaultPermissions('call_center'),
        pin: '', password: 'callcenter123',
        joinedAt: 'May 2024', lastLogin: '1 hr ago', ordersToday: 0,
    },
];

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Resolve a staff member for the Staff Portal login (email or phone + password).
 * Only accounts with systemAccess 'enabled' are returned.
 */
export function resolveByCredentials(
    identifier: string,
    password: string,
): { id: string; name: string; role: StaffRole; branch: string } | null {
    const lower   = identifier.toLowerCase().trim();
    const cleaned = lower.replace(/\s/g, '');

    const found = MOCK_STAFF.find(s => {
        if (s.systemAccess !== 'enabled') return false;
        if (s.password !== password)      return false;

        const emailMatch = s.email.toLowerCase() === lower;

        const phoneRaw   = s.phone.replace(/\s/g, '');
        const phoneMatch =
            phoneRaw === cleaned ||
            (cleaned.startsWith('0')    && '+233' + cleaned.slice(1) === phoneRaw) ||
            (cleaned.startsWith('+233') && '0' + cleaned.slice(4)    === phoneRaw);

        return emailMatch || phoneMatch;
    });

    if (!found) return null;
    return {
        id:     found.id,
        name:   found.name,
        role:   found.role,
        branch: Array.isArray(found.branch) ? found.branch[0] : found.branch,
    };
}

/**
 * Resolve a staff member for the POS PIN login.
 * Requires systemAccess 'enabled' and a matching non-empty PIN.
 */
export function resolveByPin(pin: string): StaffMember | null {
    return MOCK_STAFF.find(s =>
        s.pin === pin &&
        s.pin !== '' &&
        s.systemAccess === 'enabled'
    ) ?? null;
}
