import apiClient from '../client';
import type {
    AudiencePreview,
    DryRunResult,
    InboxMessage,
    InboxSummary,
    RuleOptions,
    StaffAudience,
    StaffMessage,
    StaffMessageKind,
    StaffMessageRule,
    StaffMessageTrigger,
    RuleActivityRow,
} from '@/types/messaging';

/** Body of a hand-written send. */
export interface SendMessagePayload {
    kind: StaffMessageKind;
    subject?: string | null;
    body: string;
    /** A path issued by uploadImage — never a URL chosen by the client. */
    image_path?: string | null;
    audience: StaffAudience;
    requires_acknowledgement?: boolean;
    allow_custom_reply?: boolean;
    quick_replies?: string[];
    sms_fallback_after_minutes?: number | null;
    expires_at?: string | null;
    /** Nothing appears before this. Null means no delay. */
    visible_from?: string | null;
    display_trigger?: StaffMessageTrigger;

    /**
     * A stable name for a release, so the same announcement cannot go out
     * twice. Rejected as a duplicate by the API rather than silently accepted.
     */
    release_key?: string | null;

    /** Slides. Only a release may carry them; the API refuses them elsewhere. */
    steps?: Array<{
        title?: string | null;
        body: string;
        image_path?: string | null;
    }>;
}

/**
 * The staff member's own inbox. No permission required — receiving a message
 * is the job, not a privilege.
 */
export const inboxService = {
    list: (unreadOnly = false): Promise<{ data: InboxMessage[] }> =>
        apiClient.get('/messages/inbox', { params: { unread_only: unreadOnly ? 1 : 0 } }),

    /** Bell count and the pending cautions in one call. */
    summary: (): Promise<{ data: InboxSummary }> => apiClient.get('/messages/inbox/summary'),

    /** Opening it is what reading means — the server stamps read_at here. */
    show: (recipientId: number): Promise<{ data: InboxMessage }> =>
        apiClient.get(`/messages/inbox/${recipientId}`),

    acknowledge: (recipientId: number): Promise<{ data: InboxMessage }> =>
        apiClient.post(`/messages/inbox/${recipientId}/acknowledge`),

    /**
     * Tell the server this just went on screen.
     *
     * The only thing that can report it. The server knows when it wrote a
     * receipt; it cannot know whether the till was showing the modal or sitting
     * in an empty room behind a locked screen.
     */
    markShown: (recipientId: number): Promise<void> =>
        apiClient.post(`/messages/inbox/${recipientId}/shown`),

    reply: (
        recipientId: number,
        payload: { quick_reply?: string; body?: string },
    ): Promise<{ data: InboxMessage }> =>
        apiClient.post(`/messages/inbox/${recipientId}/reply`, payload),

    /** The upward direction — goes to every admin, not one named person. */
    raise: (payload: { subject?: string; body: string }): Promise<void> =>
        apiClient.post('/messages/raise', payload),

    raised: (): Promise<{ data: unknown[] }> => apiClient.get('/messages/raised'),
};

/** Admin and tech_admin only — gated on `staff_messages.manage`. */
export const messagingAdminService = {
    list: (params: Record<string, string | number> = {}): Promise<{ data: StaffMessage[] }> =>
        apiClient.get('/admin/messages', { params }),

    show: (id: number): Promise<{ data: StaffMessage }> => apiClient.get(`/admin/messages/${id}`),

    /** How many people this reaches, before the send button is pressed. */
    preview: (audience: StaffAudience): Promise<{ data: AudiencePreview }> =>
        apiClient.post('/admin/messages/preview', { audience }),

    send: (payload: SendMessagePayload): Promise<{ data: StaffMessage }> =>
        apiClient.post('/admin/messages', payload),

    /** Store an image and get back the path to attach to a message. */
    uploadImage: (file: File): Promise<{ data: { path: string; url: string } }> => {
        const form = new FormData();
        form.append('image', file);

        return apiClient.post('/admin/messages/image', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    reply: (id: number, body: string): Promise<{ data: StaffMessage }> =>
        apiClient.post(`/admin/messages/${id}/reply`, { body }),

    withdraw: (id: number): Promise<void> => apiClient.delete(`/admin/messages/${id}`),
};

export const messagingRuleService = {
    list: (): Promise<{ data: { rules: StaffMessageRule[]; automation_enabled: boolean } }> =>
        apiClient.get('/admin/messages/rules'),

    options: (): Promise<{ data: RuleOptions }> => apiClient.get('/admin/messages/rules/options'),

    show: (id: number): Promise<{ data: StaffMessageRule }> =>
        apiClient.get(`/admin/messages/rules/${id}`),

    /** Always saved switched off. Liveness is a separate call, on purpose. */
    create: (payload: Partial<StaffMessageRule>): Promise<{ data: StaffMessageRule }> =>
        apiClient.post('/admin/messages/rules', payload),

    update: (id: number, payload: Partial<StaffMessageRule>): Promise<{ data: StaffMessageRule }> =>
        apiClient.put(`/admin/messages/rules/${id}`, payload),

    /** The only thing that starts, or stops, real messages. */
    toggle: (id: number): Promise<{ data: StaffMessageRule; message: string }> =>
        apiClient.post(`/admin/messages/rules/${id}/toggle`),

    /** Replays history. Writes nothing, sends nothing. */
    dryRun: (id: number, days = 30): Promise<{ data: DryRunResult }> =>
        apiClient.get(`/admin/messages/rules/${id}/dry-run`, { params: { days } }),

    /** Who the rule reached and what came back — held-back rows included. */
    activity: (
        id: number,
        sentOnly = false,
    ): Promise<{ data: RuleActivityRow[]; meta: { total: number; rule: { name: string; is_active: boolean } } }> =>
        apiClient.get(`/admin/messages/rules/${id}/activity`, {
            params: { sent_only: sentOnly ? 1 : 0, per_page: 100 },
        }),

    destroy: (id: number): Promise<void> => apiClient.delete(`/admin/messages/rules/${id}`),
};
