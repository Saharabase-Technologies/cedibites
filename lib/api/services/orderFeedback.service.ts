import apiClient from '../client';
import type {
    CustomerFeedback,
    CustomerFeedbackSummary,
    FeedbackPrompt,
    FeedbackSubmission,
} from '@/types/order-feedback';

/**
 * Post-order feedback: the customer's form and what came back.
 *
 * The public calls need no auth — the token in the URL is the only credential —
 * but they go through the same client so a closed link surfaces as an ordinary
 * ApiError rather than a raw axios rejection.
 *
 * The API path is `order-feedback`, not `feedback`: that prefix already belongs
 * to the in-app bug reporter. The customer-facing URL is still /f/{token}.
 */

function unwrap<T>(response: unknown): T {
    const r = response as { data?: T };
    return (r?.data ?? response) as T;
}

export const orderFeedbackService = {
    // ─── Public ──────────────────────────────────────────────────────────────

    /** Throws on a closed link; expired and never-existed answer identically. */
    getPrompt: async (token: string): Promise<FeedbackPrompt> => {
        const response = await apiClient.get(`/order-feedback/${token}`);
        return unwrap<FeedbackPrompt>(response);
    },

    submit: async (token: string, payload: FeedbackSubmission): Promise<void> => {
        await apiClient.post(`/order-feedback/${token}`, payload);
    },

    // ─── Admin ───────────────────────────────────────────────────────────────

    getFeedback: async (
        params: { branch_id?: number; unhappy_only?: boolean; per_page?: number } = {},
    ): Promise<{ items: CustomerFeedback[]; summary: CustomerFeedbackSummary }> => {
        const response = await apiClient.get('/admin/customer-feedback', { params });
        const data = unwrap<{ data?: CustomerFeedback[]; summary: CustomerFeedbackSummary }>(response);

        return {
            items: data?.data ?? [],
            summary: data?.summary ?? {
                sent: 0, answered: 0, response_rate: null,
                average_overall: null, average_food: null, average_service: null,
            },
        };
    },
};
