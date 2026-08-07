/**
 * Post-order feedback — the customer's verdict on one order.
 *
 * Deliberately named apart from `types/feedback.ts`, which is the in-app beta
 * bug reporter, and from MenuItemRating, which is per-dish stars. Mirrors
 * backend App\Models\OrderFeedback.
 */

/** What the public form is told before it asks for anything. */
export interface FeedbackPrompt {
    /**
     * True when they have already answered. Distinguished from an expired link
     * on purpose — somebody tapping their own link twice should read "thanks,
     * we have it", not be told their feedback vanished.
     */
    already_submitted: boolean;
    order_number?: string | null;
    branch_name?: string | null;
    ordered_at?: string | null;
    expires_at?: string | null;
}

export interface FeedbackSubmission {
    /** The only required answer. One tap is a complete response. */
    rating_overall: number;
    rating_food?: number | null;
    rating_service?: number | null;
    comment?: string | null;
}

/** One row in the admin list. Carries no phone number and no address. */
export interface CustomerFeedback {
    id: number;
    order_number: string | null;
    branch_name: string | null;
    customer_name: string | null;
    rating_overall: number | null;
    rating_food: number | null;
    rating_service: number | null;
    comment: string | null;
    submitted_at: string | null;
}

export interface CustomerFeedbackSummary {
    sent: number;
    answered: number;
    /** Answered over sent. Null before anything has gone out. */
    response_rate: number | null;
    average_overall: number | null;
    average_food: number | null;
    average_service: number | null;
}
