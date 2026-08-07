/**
 * Marketing — short links, and (from phase B) SMS campaigns.
 *
 * Mirrors backend App\Models\ShortLink and App\Http\Resources\ShortLinkResource.
 */

export interface ShortLink {
    id: number;
    /** Base62, six characters by default. Random, never sequential. */
    token: string;
    label: string;
    target_url: string;

    /**
     * Two forms of the same link, and the difference costs money.
     *
     * `url` carries the scheme and is what you click out of the admin. `sms_url`
     * does not, because handsets auto-link a bare domain — `https://` is eight
     * characters of a 160-character budget, spent on nothing.
     */
    url: string;
    sms_url: string;

    /** This link wears our brand and points somewhere that is not ours. */
    is_external: boolean;

    click_count: number;

    expires_at: string | null;
    is_expired: boolean;

    created_by?: string | null;
    created_at?: string | null;
}

export interface SaveShortLinkPayload {
    label?: string;
    target_url?: string;
    /** Null clears the expiry; omitted leaves it alone. */
    expires_at?: string | null;
}

// ─── Campaigns ───────────────────────────────────────────────────────────────

/** Mirrors backend App\Enums\CampaignStatus. */
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';

/** Mirrors backend App\Enums\CampaignSegment. */
export type CampaignSegmentValue = 'all' | 'active' | 'at_risk' | 'churned' | 'loyal' | 'one_time';

export interface CampaignSegmentOption {
    value: CampaignSegmentValue;
    label: string;
    description: string;
    /** Resolved live, so "churned" means something before you pick it. */
    count: number;
}

export interface SegmentsResponse {
    segments: CampaignSegmentOption[];
    /** When on, sends go to a fixed staff list and no customer is messaged. */
    seed_mode: boolean;
    recipient_cap: number;
}

/** Mirrors backend App\Enums\GhanaNetwork. */
export type GhanaNetwork = 'mtn' | 'telecel' | 'airteltigo' | 'glo';

/**
 * An audience assembled by the operator.
 *
 * Every rule that is set must hold — they combine with AND, never OR. An empty
 * rule set is everybody, so adding a rule can only ever shrink the audience.
 * Mirrors backend App\Services\Campaigns\AudienceRules.
 */
export interface AudienceRules {
    ordered_within_days?: number | null;
    not_ordered_for_days?: number | null;
    ordered_after?: string | null;
    ordered_before?: string | null;
    menu_item_ids?: number[] | null;
    branch_ids?: number[] | null;
    networks?: GhanaNetwork[] | null;
    min_orders?: number | null;
    max_orders?: number | null;
    min_spend?: number | null;
    max_spend?: number | null;
    hour_from?: number | null;
    hour_to?: number | null;
}

export interface AudienceOption {
    value: number | string;
    label: string;
}

/** Everything the builder can filter on, served so the lists cannot go stale. */
export interface AudienceOptions {
    branches: AudienceOption[];
    menu_items: AudienceOption[];
    networks: { value: GhanaNetwork; label: string }[];
}

export interface AudienceCount {
    count: number;
    /** The rules as sentences, for the review step and the audit trail. */
    description: string[];
}

export interface Campaign {
    id: number;
    name: string;
    message: string;

    segment: CampaignSegmentValue;
    segment_label: string;

    /** Null when the campaign used a preset rather than an assembled audience. */
    audience_rules: AudienceRules | null;
    /** The audience in plain English, however it was described. */
    audience_description: string[];

    status: CampaignStatus;
    status_label: string;
    is_editable: boolean;

    scheduled_for: string | null;

    short_link?: {
        id: number;
        label: string;
        sms_url: string;
        click_count: number;
    } | null;

    /** Permanent — never recomputed from the prunable attempt rows. */
    recipient_count: number;
    sent_count: number;
    failed_count: number;

    segments_per_message: number;
    estimated_cost: number;
    /** Null until Hubtel says what it charged. Not zero — unmeasured is not free. */
    actual_cost: number | null;

    /** Null when the campaign carried no link, because 0% would read as nobody clicked. */
    click_through_rate: number | null;

    created_by?: string | null;
    approved_by?: string | null;

    started_at: string | null;
    completed_at: string | null;
    created_at: string | null;
}

export interface SaveCampaignPayload {
    name?: string;
    message?: string;
    segment?: CampaignSegmentValue;
    /** Omit or send empty to fall back to the preset named by `segment`. */
    audience_rules?: AudienceRules | null;
    short_link_id?: number | null;
    scheduled_for?: string | null;
}

/** The confirm screen, resolved live rather than read off the draft. */
export interface CampaignPreview {
    /** What the segment holds. */
    recipient_count: number;
    /** What is actually about to be messaged — the seed list, in seed mode. */
    effective_recipient_count: number;
    seed_mode: boolean;

    characters: number;
    segments: number;
    encoding: 'GSM_7BIT' | 'UCS_2';
    non_gsm_characters: string[];

    estimated_cost: number;

    cap: number;
    over_cap: boolean;
}

/**
 * How many billed segments a message of this length costs.
 *
 * SMS billing is a step function, not a slope: one segment is 160 GSM-7
 * characters, and concatenated parts are 153 each — so 161 characters buys 306,
 * not 320. Any character outside GSM-7 (a curly quote, an emoji, an accented
 * letter) collapses the whole message to 70 per part.
 *
 * Mirrors backend App\Services\Campaigns\MessageMeter, which is the authority.
 * This copy exists so the counter can move as you type without a round trip.
 */
export interface MessageMeasurement {
    characters: number;
    segments: number;
    encoding: 'GSM_7BIT' | 'UCS_2';
    /** Characters left before the next segment starts costing. */
    remaining_in_segment: number;
    /** The non-GSM characters that forced UCS-2, if any. */
    non_gsm_characters: string[];
}
