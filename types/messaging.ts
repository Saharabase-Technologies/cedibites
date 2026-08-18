/**
 * Staff messaging — mirrors the Laravel resources in
 * app/Http/Resources/StaffMessaging.
 */

/** What a message is, which decides how hard it is allowed to push. */
export type StaffMessageKind = 'notice' | 'caution' | 'direct' | 'staff_query';

/** Who a rule messages when it fires. Composable. */
export type StaffMessageTargetType =
    | 'actor'
    | 'branch_managers'
    | 'branch_staff'
    | 'roles'
    | 'admins';

export type StaffMessageEventKey =
    | 'order_stalled'
    | 'suspicious_customer_phone'
    | 'repeated_customer_phone'
    | 'staff_cancellation_spike'
    | 'no_charge_spike'
    | 'shift_left_open';

/** Who a hand-written message goes to. */
export interface StaffAudience {
    everyone?: boolean;
    roles?: string[];
    branch_ids?: number[];
    user_ids?: number[];
    /**
     * Head office, the warehouse and the call centre hold no branch. Default
     * true — leaving them out of a branch send is the unusual choice, not the
     * safe one.
     */
    include_company_wide?: boolean;
}

/**
 * The recipient's own copy. Keyed by the RECIPIENT row id, not the message id —
 * every action a staff member takes is against their own copy.
 */
export interface InboxMessage {
    id: number;
    message_id: number;
    kind: StaffMessageKind;
    kind_label: string;
    /** True only for a caution — the one kind allowed to take over the screen. */
    interrupts: boolean;
    subject: string | null;
    body: string;
    sender_name: string;
    /** A rule sent it, not a person. Shown as "Automatic" rather than a name. */
    is_automatic: boolean;
    sent_at: string | null;
    expires_at: string | null;

    requires_acknowledgement: boolean;
    allow_custom_reply: boolean;
    quick_replies: string[];

    read_at: string | null;
    acknowledged_at: string | null;
    quick_reply: string | null;
    reply_body: string | null;
    replied_at: string | null;

    thread?: ThreadReply[];
}

export interface ThreadReply {
    id: number;
    body: string;
    sender_name: string;
    is_automatic: boolean;
    sent_at: string | null;
}

export interface InboxSummary {
    unread: number;
    /**
     * Cautions awaiting an acknowledgement, bodies included. Full bodies so the
     * interstitial can render the instant the till goes idle — a second round
     * trip at that moment would flash an empty modal.
     */
    pending: InboxMessage[];
}

/** The sender's view. Carries the delivery figures. */
export interface StaffMessage {
    id: number;
    kind: StaffMessageKind;
    kind_label: string;
    subject: string | null;
    body: string;
    audience: StaffAudience | null;
    requires_acknowledgement: boolean;
    allow_custom_reply: boolean;
    quick_replies: string[];
    sms_fallback_after_minutes: number | null;
    expires_at: string | null;
    sent_at: string | null;
    created_at: string | null;
    recipient_count: number;
    sender?: { id: number | null; name: string | null };
    rule_id: number | null;
    is_automatic: boolean;
    stats?: StaffMessageStats;
    recipients?: StaffMessageReceipt[];
}

export interface StaffMessageStats {
    total: number;
    read: number;
    /** Counted against those required to acknowledge, not against everyone. */
    acknowledged: number;
    replied: number;
    sms_sent: number;
}

export interface StaffMessageReceipt {
    id: number;
    user: { id: number | null; name: string | null; role: string | null };
    branch?: { id: number | null; name: string | null };
    delivered_at: string | null;
    read_at: string | null;
    acknowledged_at: string | null;
    quick_reply: string | null;
    reply_body: string | null;
    replied_at: string | null;
    sms_sent_at: string | null;
    sms_status: string | null;
}

export interface StaffMessageRule {
    id: number;
    name: string;
    description: string | null;
    event: StaffMessageEventKey;
    event_label: string;
    conditions: Record<string, string | number>;
    target: { types: StaffMessageTargetType[]; roles?: string[] };
    kind: StaffMessageKind;
    subject: string | null;
    body_template: string;
    merge_fields: string[];
    requires_acknowledgement: boolean;
    allow_custom_reply: boolean;
    quick_replies: string[];
    sms_fallback_after_minutes: number | null;
    cooldown_minutes: number;
    priority: number;
    is_active: boolean;
    /**
     * The global kill switch, reported beside every rule. A screen full of live
     * rules sending nothing is otherwise impossible to explain.
     */
    automation_enabled: boolean;
    stats: { matched: number; sent: number; held_back: number };
    created_at: string | null;
}

export interface RuleOptions {
    events: {
        value: StaffMessageEventKey;
        label: string;
        required_conditions: string[];
        merge_fields: string[];
    }[];
    targets: { value: StaffMessageTargetType; label: string }[];
    order_statuses: string[];
}

export interface DryRunResult {
    rule: string;
    event: string;
    days: number;
    matched: number;
    would_send: number;
    /** The gap between matched and would_send is the cooldown doing its job. */
    held_back: number;
    people_reached: number;
    /**
     * The number that decides whether a rule is safe to switch on. Totals hide
     * the difference between reaching 3 people 40 times and 300 people 40 times.
     */
    busiest_recipient: number;
    samples: { to: string; body: string }[];
    /** The hourly cap and competing rules are not modelled. Always a ceiling. */
    is_ceiling: boolean;
}

export interface AudiencePreview {
    count: number;
    sample: { id: number; name: string; role: string | null }[];
}
