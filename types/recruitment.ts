import type { StaffRole } from './staff';
import { ROLE_RULES } from './staff';

/**
 * Recruitment — the public form and the review queue.
 *
 * Mirrors backend App\Enums\RecruitmentLinkKind and
 * App\Enums\RecruitmentApplicationStatus.
 */

/** Mirrors backend App\Enums\RecruitmentLinkKind. */
export type RecruitmentLinkKind = 'branch' | 'call_center';

/** Mirrors backend App\Enums\RecruitmentApplicationStatus. */
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface AssignableRole {
    value: StaffRole;
    label: string;
}

export interface RecruitmentLink {
    id: number;
    token: string;
    kind: RecruitmentLinkKind;
    kind_label: string;
    /** "Lakeside", or "Call Centre" when the posting carries no branch. */
    posting: string;
    branch?: { id: number; name: string } | null;
    label: string | null;
    assignable_roles: AssignableRole[];
    expires_at: string;
    is_expired: boolean;
    applications_count?: number;
    pending_applications_count?: number;
    created_by?: string;
    created_at?: string;
}

export interface RecruitmentApplication {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    status: ApplicationStatus;
    status_label: string;
    link?: {
        id: number;
        kind: RecruitmentLinkKind;
        posting: string;
        label: string | null;
        assignable_roles: AssignableRole[];
    };
    ghana_card_id?: string | null;
    date_of_birth?: string | null;
    nationality?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    emergency_contact_relationship?: string | null;
    reviewed_by?: string | null;
    reviewed_at?: string | null;
    created_user_id?: number | null;
    submitted_at?: string;
}

/** What the public form is told before it asks for anything. */
export interface RecruitmentPosting {
    kind: RecruitmentLinkKind;
    posting: string;
    branch_name: string | null;
    label: string | null;
    expires_at: string;
}

export interface CreateLinkPayload {
    kind: RecruitmentLinkKind;
    branch_id?: number | null;
    label?: string | null;
    expires_at: string;
}

/**
 * What can change on a posting that is already out there.
 *
 * Not the kind and not the branch: people have the URL, and some may have
 * applied through it. Moving the branch would hand pending applicants to a
 * branch they never chose, and nothing on screen would look wrong.
 */
export interface UpdateLinkPayload {
    label?: string | null;
    /** A date in the past closes it — that is the close button. */
    expires_at?: string;
}

export interface ApplicationFormPayload {
    name: string;
    phone: string;
    phone_confirmation: string;
    email?: string;
    password: string;
    password_confirmation: string;
    ghana_card_id?: string;
    date_of_birth?: string;
    nationality?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relationship?: string;
}

/**
 * The roles a posting of this kind may appoint, derived from ROLE_RULES rather
 * than listed by hand — the same split the backend makes in
 * RecruitmentLinkKind::allows().
 *
 * A branch posting appoints anything that takes a branch. A call-centre posting
 * appoints exactly one role: `call_center` is company-wide, and admin, warehouse
 * and purchasing are head-office hires made by hand, not things you send a form
 * out for.
 *
 * The server is still the authority — this only decides what the picker offers,
 * and every response carries its own `assignable_roles` to prefer over this.
 */
export function rolesForKind(kind: RecruitmentLinkKind): StaffRole[] {
    if (kind === 'call_center') return ['call_center'];

    return (Object.keys(ROLE_RULES) as StaffRole[]).filter(
        (role) => ROLE_RULES[role].assignable && ROLE_RULES[role].branch !== 'none',
    );
}
