/**
 * Opening the branch for the day. Mirrors the Laravel resources
 * BranchOpeningResource and BranchOpeningAnswerResource.
 */

/**
 * Where a branch stands today.
 *
 *   not_required           the branch does not use the checklist
 *   closed_today           it does, but it is not trading today
 *   not_started            nobody has started today's checklist
 *   in_progress            started, not yet opened
 *   opened_by_head_office  selling, the checklist still to be completed
 *   open_with_problems     selling, with problems not yet fixed
 *   open                   selling
 *   not_opened             a past day nobody opened (history only)
 */
export type OpeningStatus =
    | 'not_required'
    | 'closed_today'
    | 'not_started'
    | 'in_progress'
    | 'opened_by_head_office'
    | 'open_with_problems'
    | 'open'
    | 'not_opened';

/** What every branch listing carries, customers included. No names, no problems. */
export interface BranchOpeningSummary {
    required: boolean;
    status: OpeningStatus;
    /** True when the branch may sell (or has no checklist today). */
    opened: boolean;
    /** Not opened yet, but an online order placed now will wait for it. */
    getting_ready: boolean;
    business_date?: string;
    opens_at?: string | null;
    checklist_from?: string | null;
}

export type AnswerKind = 'check' | 'number' | 'text';

/** must_pass: a failure keeps the branch shut. can_open: admit it and open. record: a number or a note. */
export type AnswerWeight = 'must_pass' | 'can_open' | 'record';

export type CheckAnswer = 'ok' | 'problem' | 'na';

/** When a line is asked. See lib/utils/openingRelevance.ts. */
export type ShowIf =
    | { when: string; is?: CheckAnswer }
    | { any_problem: string[] };

export interface OpeningPhoto {
    id: number;
    /** The problem as found, or the fix. Decided by the server. */
    stage: 'reported' | 'fixed';
    url: string;
    thumb_url: string;
    mime_type: string | null;
    uploaded_by: number | null;
    created_at: string;
}

export interface OpeningAnswer {
    id: number;
    key: string;
    section: string;
    group: string | null;
    label: string;
    short: string;
    help: string | null;
    kind: AnswerKind;
    weight: AnswerWeight;
    allows_na: boolean;
    show_if?: ShowIf | null;
    /** Asked, given the answers so far, as the server last worked it out. */
    relevant?: boolean;
    answer: CheckAnswer | null;
    value: string | null;
    note: string | null;
    answered_at: string | null;
    answered_by?: string | null;
    resolved_at: string | null;
    resolved_by?: string | null;
    resolution_note: string | null;
    photos?: OpeningPhoto[];
}

export interface BranchOpening {
    id: number | null;
    branch: { id: number; name: string };
    business_date: string;
    required: boolean;
    status: OpeningStatus;
    schedule: {
        trading_day: boolean;
        opens_at: string | null;
        closes_at: string | null;
        checklist_from: string | null;
        late_at: string | null;
    };
    is_late: boolean;
    started_at: string | null;
    started_by: string | null;
    completed_at: string | null;
    completed_by: string | null;
    opened_at: string | null;
    opened_by: string | null;
    opened_via: 'pos' | 'portal' | 'admin' | null;
    is_override: boolean;
    override_reason: string | null;
    unresolved_note: string | null;
    grace_ends_at: string | null;
    problems_resolved_at: string | null;
    progress: { answered: number; total: number };
    problems: {
        total: number;
        outstanding: number;
        items: { id: number; short: string; note: string | null; resolved_at: string | null }[];
    };
    answers: OpeningAnswer[];
}

/** One branch's row on head office's openings page. */
export interface AdminOpeningRow extends BranchOpening {
    requires_opening_checklist: boolean;
}

export interface ChecklistItem {
    id: number;
    key: string;
    section: string;
    group: string | null;
    label: string;
    short: string;
    help: string | null;
    kind: AnswerKind;
    weight: AnswerWeight;
    allows_na: boolean;
    position: number;
    is_active: boolean;
    /** Asked only after another answer. Set by the seeder, not edited on screen. */
    show_if?: ShowIf | null;
}

/** A refusal from the opening endpoints: `code` says which, and some carry more. */
export interface OpeningRefusal {
    code?: string;
    message?: string;
    unanswered?: number[];
    items?: number[];
    checklist_from?: string;
}
