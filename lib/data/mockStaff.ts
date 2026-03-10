// ─── Shared Staff Types & Data ────────────────────────────────────────────────
// Single source of truth for all staff across the app.
// Staff Portal login: email/phone + password   (resolveByCredentials)
// POS terminal login: 4-digit PIN              (resolveByPin)

export type StaffRole =
    | 'admin'
    | 'manager'
    | 'sales'
    | 'kitchen'
    | 'rider'
    | 'call_center';

export type StaffStatus = 'active' | 'inactive' | 'archived';

export interface StaffMember {
    id:          string;
    name:        string;
    email:       string;
    phone:       string;
    role:        StaffRole;
    /** Display branch name(s). */
    branch:      string | string[];
    /** System branch IDs (matches BRANCHES in BranchProvider). */
    branchIds:   string[];
    status:      StaffStatus;
    /** 4-digit POS PIN — empty string means no POS access. */
    pin:         string;
    /** Staff-portal password. */
    password:    string;
    /** Can log in to the POS terminal. */
    posAccess:   boolean;
    joinedAt:    string;
    lastLogin:   string;
    ordersToday: number;
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export function roleDisplayName(role: StaffRole): string {
    const map: Record<StaffRole, string> = {
        admin:       'Admin',
        manager:     'Branch Manager',
        sales:       'Sales Staff',
        kitchen:     'Kitchen Staff',
        rider:       'Rider',
        call_center: 'Call Center',
    };
    return map[role];
}

// ─── Mock data ────────────────────────────────────────────────────────────────
// Branch IDs: '1'=Osu · '2'=East Legon · '3'=Spintex

export const MOCK_STAFF: StaffMember[] = [

    // ── Admins ────────────────────────────────────────────────────────────────
    {
        id: 'u1',  name: 'Nana Kwame Adjei',
        email: 'admin@cedibites.com',     phone: '0244123456',
        role: 'admin',  branch: 'All Branches', branchIds: ['1','2','3'],
        posAccess: false, pin: '',        password: 'admin123',
        status: 'active',   joinedAt: 'Jan 2024', lastLogin: '2 mins ago',  ordersToday: 0,
    },

    // ── Managers ──────────────────────────────────────────────────────────────
    {
        id: 'u2',  name: 'Ama Boateng',
        email: 'manager@cedibites.com',   phone: '0201987654',
        role: 'manager', branch: 'East Legon', branchIds: ['2'],
        posAccess: false, pin: '',        password: 'manager123',
        status: 'active',   joinedAt: 'Feb 2024', lastLogin: '1 hr ago',    ordersToday: 0,
    },
    {
        id: 'u3',  name: 'Kwame Asante',
        email: 'kwame.mgr@cedibites.com', phone: '0277456789',
        role: 'manager', branch: 'Osu',       branchIds: ['1'],
        posAccess: false, pin: '',        password: 'manager123',
        status: 'active',   joinedAt: 'Feb 2024', lastLogin: '3 hrs ago',   ordersToday: 0,
    },
    {
        id: 'u4',  name: 'Abena Ofori',
        email: 'abena.mgr@cedibites.com', phone: '0265321789',
        role: 'manager', branch: 'Spintex',   branchIds: ['3'],
        posAccess: false, pin: '',        password: 'manager123',
        status: 'active',   joinedAt: 'Mar 2024', lastLogin: 'Yesterday',   ordersToday: 0,
    },

    // ── Sales Staff ───────────────────────────────────────────────────────────
    {
        id: 'u5',  name: 'Kofi Mensah',
        email: 'sales@cedibites.com',     phone: '0244100001',
        role: 'sales',   branch: 'East Legon', branchIds: ['2'],
        posAccess: true,  pin: '1234',    password: 'sales123',
        status: 'active',   joinedAt: 'Mar 2024', lastLogin: '30 mins ago', ordersToday: 7,
    },
    {
        id: 'u6',  name: 'Esi Darko',
        email: 'esi@cedibites.com',       phone: '0556123456',
        role: 'sales',   branch: 'East Legon', branchIds: ['2'],
        posAccess: true,  pin: '2345',    password: 'sales123',
        status: 'active',   joinedAt: 'Apr 2024', lastLogin: '45 mins ago', ordersToday: 6,
    },
    {
        id: 'u7',  name: 'Kwame Darko',
        email: 'kwamed@cedibites.com',    phone: '0270789456',
        role: 'sales',   branch: 'Osu',       branchIds: ['1'],
        posAccess: true,  pin: '3456',    password: 'sales123',
        status: 'active',   joinedAt: 'Apr 2024', lastLogin: '2 hrs ago',   ordersToday: 7,
    },
    {
        id: 'u8',  name: 'Kofi Acheampong',
        email: 'kofia@cedibites.com',     phone: '0249654321',
        role: 'sales',   branch: 'Osu',       branchIds: ['1'],
        posAccess: true,  pin: '4567',    password: 'sales123',
        status: 'active',   joinedAt: 'Mar 2024', lastLogin: '30 mins ago', ordersToday: 12,
    },
    {
        id: 'u9',  name: 'Akosua Osei',
        email: 'akosua@cedibites.com',    phone: '0270789001',
        role: 'sales',   branch: 'Spintex',   branchIds: ['3'],
        posAccess: true,  pin: '5678',    password: 'sales123',
        status: 'active',   joinedAt: 'Apr 2024', lastLogin: '2 hrs ago',   ordersToday: 7,
    },
    {
        id: 'u10', name: 'Nana Agyemang',
        email: 'nana@cedibites.com',      phone: '0200112233',
        role: 'sales',   branch: 'East Legon', branchIds: ['2'],
        posAccess: true,  pin: '6789',    password: 'sales123',
        status: 'inactive', joinedAt: 'Jan 2025', lastLogin: '2 weeks ago', ordersToday: 0,
    },
    {
        id: 'u11', name: 'Kweku Baiden',
        email: 'kweku.old@cedibites.com', phone: '0201456789',
        role: 'sales',   branch: 'East Legon', branchIds: ['2'],
        posAccess: false, pin: '',        password: 'sales123',
        status: 'inactive', joinedAt: 'Jan 2024', lastLogin: '2 weeks ago', ordersToday: 0,
    },
    {
        id: 'u12', name: 'Adjoa Nyarko',
        email: 'adjoa.arch@cedibites.com', phone: '0277654123',
        role: 'sales',   branch: 'Osu',       branchIds: ['1'],
        posAccess: false, pin: '',        password: 'sales123',
        status: 'archived', joinedAt: 'Dec 2023', lastLogin: '3 months ago', ordersToday: 0,
    },

    // ── Kitchen Staff ─────────────────────────────────────────────────────────
    {
        id: 'u13', name: 'Kwame Frimpong',
        email: 'kwamef@cedibites.com',    phone: '0277654321',
        role: 'kitchen', branch: 'East Legon', branchIds: ['2'],
        posAccess: false, pin: '',        password: 'kitchen123',
        status: 'active',   joinedAt: 'Jan 2025', lastLogin: 'Today',       ordersToday: 0,
    },
    {
        id: 'u14', name: 'Abena Osei',
        email: 'abenao@cedibites.com',    phone: '0551234567',
        role: 'kitchen', branch: 'East Legon', branchIds: ['2'],
        posAccess: false, pin: '',        password: 'kitchen123',
        status: 'active',   joinedAt: 'Nov 2024', lastLogin: 'Today',       ordersToday: 0,
    },
    {
        id: 'u15', name: 'Adjoa Appiah',
        email: 'adjoaa@cedibites.com',    phone: '0244567890',
        role: 'kitchen', branch: 'East Legon', branchIds: ['2'],
        posAccess: false, pin: '',        password: 'kitchen123',
        status: 'inactive', joinedAt: 'Jan 2026', lastLogin: 'Never',       ordersToday: 0,
    },

    // ── Riders ────────────────────────────────────────────────────────────────
    {
        id: 'u16', name: 'Yaw Asante',
        email: 'yaw@cedibites.com',       phone: '0266778899',
        role: 'rider',   branch: 'East Legon', branchIds: ['2'],
        posAccess: false, pin: '',        password: 'rider123',
        status: 'active',   joinedAt: 'Sep 2024', lastLogin: 'Today',       ordersToday: 4,
    },
    {
        id: 'u17', name: 'Akua Boateng',
        email: 'akuab@cedibites.com',     phone: '0245678901',
        role: 'rider',   branch: 'East Legon', branchIds: ['2'],
        posAccess: false, pin: '',        password: 'rider123',
        status: 'active',   joinedAt: 'Dec 2024', lastLogin: 'Today',       ordersToday: 3,
    },

    // ── Call Center ───────────────────────────────────────────────────────────
    {
        id: 'u18', name: 'Yaa Asantewaa',
        email: 'yaa@cedibites.com',       phone: '0244789123',
        role: 'call_center', branch: ['Osu', 'East Legon', 'Spintex'], branchIds: ['1','2','3'],
        posAccess: false, pin: '',        password: 'callcenter123',
        status: 'active',   joinedAt: 'May 2024', lastLogin: '1 hr ago',    ordersToday: 0,
    },
];

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Resolve a staff member for the Staff Portal login (email or phone + password).
 * Only active accounts are returned.
 */
export function resolveByCredentials(
    identifier: string,
    password: string,
): { id: string; name: string; role: StaffRole; branch: string } | null {
    const lower   = identifier.toLowerCase().trim();
    const cleaned = lower.replace(/\s/g, '');

    const found = MOCK_STAFF.find(s => {
        if (s.status !== 'active')  return false;
        if (s.password !== password) return false;

        const emailMatch = s.email.toLowerCase() === lower;

        const phoneRaw   = s.phone.replace(/\s/g, '');
        const phoneMatch =
            phoneRaw === cleaned ||
            // 0XX → +233XX  e.g. "0244…" typed, stored "+233244…"
            (cleaned.startsWith('0')    && '+233' + cleaned.slice(1) === phoneRaw) ||
            // +233XX → 0XX  e.g. "+233244…" typed, stored "0244…"
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
 * Only active accounts with posAccess are returned.
 */
export function resolveByPin(pin: string): StaffMember | null {
    return MOCK_STAFF.find(s => s.pin === pin && s.posAccess && s.status === 'active') ?? null;
}
