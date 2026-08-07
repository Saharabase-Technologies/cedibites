import apiClient from '../client';
import type {
    Campaign,
    CampaignPreview,
    CampaignStatus,
    SaveCampaignPayload,
    SegmentsResponse,
} from '@/types/marketing';

/**
 * SMS campaigns — what replaces logging into the Hubtel dashboard.
 *
 * Composing and sending are separate calls on purpose. Nothing here spends money
 * except `send`, and `send` is only reached through `preview`.
 */

function unwrap<T>(response: unknown): T {
    const r = response as { data?: T };
    return (r?.data ?? response) as T;
}

function unwrapList<T>(response: unknown): { items: T[]; total: number } {
    const outer = response as { data?: { data?: T[]; total?: number; meta?: { total?: number } } };
    const inner = outer?.data;
    return {
        items: inner?.data ?? (Array.isArray(inner) ? (inner as T[]) : []),
        total: inner?.total ?? inner?.meta?.total ?? 0,
    };
}

export const campaignService = {
    /** The six segments with a live headcount each, plus the safety settings. */
    getSegments: async (): Promise<SegmentsResponse> => {
        const response = await apiClient.get('/admin/campaigns/segments');
        return unwrap<SegmentsResponse>(response);
    },

    getCampaigns: async (
        params: { status?: CampaignStatus; per_page?: number } = {},
    ): Promise<{ items: Campaign[]; total: number }> => {
        const response = await apiClient.get('/admin/campaigns', { params });
        return unwrapList<Campaign>(response);
    },

    getCampaign: async (id: number): Promise<Campaign> => {
        const response = await apiClient.get(`/admin/campaigns/${id}`);
        return unwrap<Campaign>(response);
    },

    createCampaign: async (payload: SaveCampaignPayload): Promise<Campaign> => {
        const response = await apiClient.post('/admin/campaigns', payload);
        return unwrap<Campaign>(response);
    },

    /** Refused once the campaign has gone out — copy it into a new one instead. */
    updateCampaign: async (id: number, payload: SaveCampaignPayload): Promise<Campaign> => {
        const response = await apiClient.patch(`/admin/campaigns/${id}`, payload);
        return unwrap<Campaign>(response);
    },

    deleteCampaign: async (id: number): Promise<void> => {
        await apiClient.delete(`/admin/campaigns/${id}`);
    },

    /**
     * The confirm step: recipients, characters, billed segments, projected cost.
     *
     * Every figure resolved live on the server, so what is shown is what the send
     * will actually use — not what the segment held when the draft was written.
     */
    previewCampaign: async (id: number): Promise<CampaignPreview> => {
        const response = await apiClient.get(`/admin/campaigns/${id}/preview`);
        return unwrap<CampaignPreview>(response);
    },

    /** The only call in this file that spends money. */
    sendCampaign: async (id: number): Promise<Campaign> => {
        const response = await apiClient.post(`/admin/campaigns/${id}/send`);
        return unwrap<Campaign>(response);
    },

    cancelCampaign: async (id: number): Promise<Campaign> => {
        const response = await apiClient.post(`/admin/campaigns/${id}/cancel`);
        return unwrap<Campaign>(response);
    },
};
