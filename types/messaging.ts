/**
 * Staff messaging — mirrors the Laravel resources in
 * app/Http/Resources/StaffMessaging.
 */

/** What a message is, which decides how hard it is allowed to push. */
export type StaffMessageKind = 'notice' | 'caution' | 'release' | 'direct' | 'staff_query';

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
/**
 * Which moment is allowed to put a message on screen.
 *
 * Enforced by the client, because every case turns on something only the
 * browser knows. The server has already applied the `visible_from` floor by
 * keeping anything early out of the pending set, so a message that arrives here
 * is on time and waiting only on the event.
 */
export type StaffMessageTrigger = 'immediate' | 'next_sign_in' | 'window_active';

export interface InboxMessage {
    id: number;
    message_id: number;
    kind: StaffMessageKind;
    kind_label: string;
    /** True for the kinds allowed to take over the screen: cautions and releases. */
    interrupts: boolean;
    subject: string | null;
    body: string;
    /** Markdown subset — see lib/utils/messageMarkdown.tsx. */
    image_url: string | null;
    /**
     * Always the team ("CediBites IT"), never the individual who pressed send.
     * The real sender stays on the record and is shown throughout the admin side.
     */
    sender_name: string;
    /** A rule sent it, not a person. Shown as "Automatic" rather than a name. */
    is_automatic: boolean;
    sent_at: string | null;
    expires_at: string | null;

    /** Absent on an older backend, which is why the client falls back to immediate. */
    display_trigger?: StaffMessageTrigger;

    /** First time this took the person's screen. Null until it has. */
    shown_at: string | null;

    requires_acknowledgement: boolean;
    allow_custom_reply: boolean;
    quick_replies: string[];

    read_at: string | null;
    acknowledged_at: string | null;
    quick_reply: string | null;
    reply_body: string | null;
    replied_at: string | null;

    /**
     * Slides, for a release. `null` on every other kind, so "not a walkthrough"
     * is distinguishable from "a walkthrough with nothing in it".
     */
    steps: ReleaseStep[] | null;

    thread?: ThreadReply[];
}

/** One slide of a release walkthrough. */
export interface ReleaseStep {
    id: number;
    position: number;
    title: string | null;
    /** Markdown subset — see lib/utils/messageMarkdown.tsx. */
    body: string;
    image_url: string | null;
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
    image_url: string | null;
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
    /** Reached a screen. The only honest reach figure for an interrupting kind. */
    shown: number;
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
    /** First and last time the message was actually on this person's screen. */
    shown_at: string | null;
    last_shown_at: string | null;
    /** How many times it has taken their screen. High with no ack means dismissed. */
    shown_count: number;
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

/**
 * One consideration a rule made about one person — sent or held back.
 *
 * Held-back rows are included deliberately: "why did Kwame not get this?" is
 * the question that gets asked, and only the suppressed rows answer it.
 */
export interface RuleActivityRow {
    id: number;
    fired_at: string | null;
    user: { id: number | null; name: string; role: string | null };
    /** What it was about, e.g. "Order #1042". Null for the spike rules. */
    about: string | null;
    sent: boolean;
    held_back_reason: string | null;
    held_back_label: string | null;
    message_id: number | null;
    body: string | null;
    read_at: string | null;
    acknowledged_at: string | null;
    quick_reply: string | null;
    reply_body: string | null;
    sms_status: string | null;
}
