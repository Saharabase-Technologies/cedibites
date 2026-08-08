/**
 * Automation rules — messages that fire when something happens to an order,
 * instead of when somebody presses send.
 *
 * Mirrors backend App\Models\AutomationRule. Plan of record:
 * docs/AUTOMATION_TRIGGERS_PLAN.md.
 */

/** Mirrors backend App\Enums\AutomationEvent. */
export type AutomationEventValue =
    | 'first_order'
    | 'first_at_branch'
    | 'first_order_type'
    | 'tried_something_new'
    | 'nth_order'
    | 'returned_after_gap'
    | 'high_value_order';

export interface AutomationEventOption {
    value: AutomationEventValue;
    label: string;
    description: string;
    /** Settings this event cannot work without — see AutomationRule.event_config. */
    config_keys: string[];
}

export interface AutomationRule {
    id: number;
    name: string;

    event: AutomationEventValue;
    event_label: string;
    event_description: string;
    event_config: Record<string, number | string | null>;
    required_config: string[];

    audience_rules: Record<string, unknown> | null;
    /** The conditions as sentences, from the same describer campaigns use. */
    audience_description: string[];

    message: string;
    short_link?: { id: number; label: string; sms_url: string } | null;

    delay_minutes: number;
    is_active: boolean;
    priority: number;

    /** What the rule asked for, and what it will actually get. */
    cooldown_days: number | null;
    effective_cooldown_days: number;

    max_per_customer: number | null;
    sample_rate: number;

    /**
     * Every firing, including suppressed ones. The gap between this and
     * `sent_count` IS the guardrails working — showing only the sends would
     * read as a rule that barely fires.
     */
    matched_count: number;
    sent_count: number;
    answered_count: number;
    /** Null until something has gone out. 0% and "nothing sent yet" differ. */
    response_rate: number | null;

    created_by?: string | null;
    created_at: string | null;
}

export interface AutomationRuleDetail extends AutomationRule {
    suppression_breakdown: Record<string, number>;
}

export interface AutomationOptions {
    events: AutomationEventOption[];
    merge_fields: { field: string; description: string }[];
    /** The global kill switch. A live rule sends nothing while this is false. */
    automation_enabled: boolean;
    cooldown_days: number;
    rate_per_segment: number;
}

/**
 * What a rule would have done against real history, having sent nothing.
 *
 * `would_send` ignores other rules, so it is a ceiling — the safe direction for
 * a number somebody is about to approve.
 */
export interface AutomationDryRun {
    days: number;
    orders_examined: number;
    matched: number;
    would_send: number;
    suppressed: Record<string, number>;
    estimated_cost: number;
    segments_per_message: number;
    people_reached: number;
    /** The most any one person would have received. Judges the cooldown. */
    busiest_recipient: number;
    sample: { phone: string; name: string | null; order_id: number; at: string | null }[];
}

export interface SaveAutomationRulePayload {
    name: string;
    event: AutomationEventValue;
    event_config?: Record<string, number | null>;
    message: string;
    short_link_id?: number | null;
    delay_minutes?: number;
    priority?: number;
    cooldown_days?: number | null;
    max_per_customer?: number | null;
    sample_rate?: number;
}
