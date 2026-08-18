import type { StaffMember, StaffRole } from '@/types/staff';

/**
 * How the roster is divided up.
 *
 * The directory used to be one flat list behind ten filter tabs, which answered
 * "show me every rider" and nothing else. The question actually being asked of
 * it is "who works at Lakeside" — so the top level is now the parts of the
 * business, and the roles sit inside them.
 *
 * Every one of the ten roles belongs to exactly one group. That is deliberate:
 * the counts on the cards add up to the headcount, so a card reading 0 means
 * nobody, not "they are filed somewhere else". `ROLE_PLACEMENT` below is what
 * holds that together.
 */

export type StaffGroupKind =
    | 'head-office'
    | 'warehouse'
    | 'general'
    | 'branch'
    | 'unassigned'
    | 'former';

export interface StaffGroup {
    /** URL segment — /admin/staff/group/<id>. */
    id: string;
    name: string;
    /** One line under the title, saying who is in here and why. */
    blurb: string;
    kind: StaffGroupKind;
    members: StaffMember[];
    /** Still employed but not currently working — suspended or on leave. */
    needsAttention: number;
}

/**
 * Where each role is filed. This is the whole grouping rule — the lists below
 * are derived from it, so there is one place to change and no second copy to
 * fall out of step.
 *
 * Typed as a total `Record<StaffRole, …>`, which is what actually enforces the
 * promise above it: add a case to `StaffRole` and this stops compiling until
 * the new role is given a home. A missing entry would otherwise produce
 * somebody who is in the headcount and on no card.
 *
 *   head-office — no shift, no till: admins and the partners who own branches
 *   warehouse   — the central stores and buying function, serving every branch
 *   general     — company-wide floor staff, tied to no single branch. A rider
 *                 can cover several at once and would otherwise be listed on
 *                 each of them
 *   branch      — rooted at exactly one branch. The manager is one of these:
 *                 a branch manager runs a branch, so they belong with their own
 *                 team rather than filed under head office away from it
 */
export const ROLE_PLACEMENT: Record<StaffRole, StaffGroupKind> = {
    admin: 'head-office',
    tech_admin: 'head-office',
    branch_partner: 'head-office',
    warehouse_manager: 'warehouse',
    purchasing_clerk: 'warehouse',
    call_center: 'general',
    rider: 'general',
    manager: 'branch',
    sales_staff: 'branch',
    kitchen: 'branch',
};

function rolesPlacedIn(kind: StaffGroupKind): StaffRole[] {
    return (Object.keys(ROLE_PLACEMENT) as StaffRole[])
        .filter(role => ROLE_PLACEMENT[role] === kind);
}

const HEAD_OFFICE_ROLES = rolesPlacedIn('head-office');
const WAREHOUSE_ROLES = rolesPlacedIn('warehouse');
const GENERAL_ROLES = rolesPlacedIn('general');
const BRANCH_ROLES = rolesPlacedIn('branch');

export interface BranchLike {
    id: string | number;
    name: string;
}

/** Roles are listed in this order inside a group, most senior first. */
const ROLE_ORDER: StaffRole[] = [
    'tech_admin', 'admin', 'branch_partner', 'manager',
    'warehouse_manager', 'purchasing_clerk',
    'call_center', 'sales_staff', 'kitchen', 'rider',
];

export function branchGroupId(branchId: string | number): string {
    return `branch-${branchId}`;
}

export function groupHref(groupId: string): string {
    return `/admin/staff/group/${groupId}`;
}

/**
 * Sort a group's members: by role seniority, then alphabetically. So a branch
 * card opens with its manager rather than with whoever the API happened to
 * return first.
 */
export function sortMembers(members: StaffMember[]): StaffMember[] {
    return [...members].sort((a, b) => {
        const rank = ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role);
        return rank !== 0 ? rank : a.name.localeCompare(b.name);
    });
}

/** Suspended and on-leave staff are still employed, but are not at work. */
function countNeedingAttention(members: StaffMember[]): number {
    return members.filter(m => m.status === 'suspended' || m.status === 'on_leave').length;
}

/**
 * Build every card, in display order.
 *
 * Branch cards are built from the branch list, not from the staff — a branch
 * that has just been opened and has nobody in it yet still gets a card reading
 * 0, which is the thing you would want to see. Filing them off the staff list
 * would have made an unstaffed branch invisible.
 */
export function buildStaffGroups(staff: StaffMember[], branches: BranchLike[]): StaffGroup[] {
    const former = staff.filter(s => s.status === 'terminated');
    const current = staff.filter(s => s.status !== 'terminated');

    const inRoles = (roles: StaffRole[]) => current.filter(s => roles.includes(s.role));

    const branchStaff = inRoles(BRANCH_ROLES);
    const knownBranchIds = new Set(branches.map(b => String(b.id)));

    // A branch role with no branch attached, or one pointing at a branch that
    // no longer exists. Neither should happen — the server enforces exactly one
    // — but if it does, the person still has a login, so they get a card of
    // their own rather than dropping out of the directory unnoticed.
    const unassigned = branchStaff.filter(s => {
        const id = s.branchIds?.[0];
        return !id || !knownBranchIds.has(String(id));
    });

    const groups: StaffGroup[] = [
        makeGroup({
            id: 'head-office',
            name: 'Head Office & Partners',
            blurb: 'Admins, platform admins and the branch partners who own them.',
            kind: 'head-office',
            members: inRoles(HEAD_OFFICE_ROLES),
        }),
        makeGroup({
            id: 'warehouse',
            name: 'Warehouse & Purchasing',
            blurb: 'The central stores and buying function. Serves every branch, belongs to none.',
            kind: 'warehouse',
            members: inRoles(WAREHOUSE_ROLES),
        }),
        makeGroup({
            id: 'general',
            name: 'General',
            blurb: 'Call centre and riders. Company-wide staff who are not tied to one branch.',
            kind: 'general',
            members: inRoles(GENERAL_ROLES),
        }),
        ...branches.map(branch =>
            makeGroup({
                id: branchGroupId(branch.id),
                name: branch.name,
                blurb: 'Manager, sales staff and kitchen based at this branch.',
                kind: 'branch',
                members: branchStaff.filter(s => String(s.branchIds?.[0]) === String(branch.id)),
            }),
        ),
    ];

    // Both of these are hidden when empty — an exceptions card that is always
    // there and always says 0 is noise.
    if (unassigned.length > 0) {
        groups.push(makeGroup({
            id: 'unassigned',
            name: 'No branch assigned',
            blurb: 'Branch roles with no branch on the account. Open each one and set their branch.',
            kind: 'unassigned',
            members: unassigned,
        }));
    }

    if (former.length > 0) {
        groups.push(makeGroup({
            id: 'former',
            name: 'Former staff',
            blurb: 'Terminated accounts. Kept so past orders still credit a name.',
            kind: 'former',
            members: former,
        }));
    }

    return groups;
}

function makeGroup(input: Omit<StaffGroup, 'members' | 'needsAttention'> & { members: StaffMember[] }): StaffGroup {
    return {
        ...input,
        members: sortMembers(input.members),
        needsAttention: countNeedingAttention(input.members),
    };
}

export function findGroup(groups: StaffGroup[], id: string): StaffGroup | undefined {
    return groups.find(g => g.id === id);
}

/** How many of each role are in this group, in seniority order. For the card. */
export function roleBreakdown(members: StaffMember[]): { role: StaffRole; count: number }[] {
    const counts = new Map<StaffRole, number>();
    members.forEach(m => counts.set(m.role, (counts.get(m.role) ?? 0) + 1));

    return ROLE_ORDER
        .filter(role => counts.has(role))
        .map(role => ({ role, count: counts.get(role)! }));
}

