import apiClient from '../client';
import type { SaveShortLinkPayload, ShortLink } from '@/types/marketing';

/**
 * Short links.
 *
 * Only the admin end lives here. The public end — resolving a token to its
 * target — is called server-side by the route handler at app/r/[token]/route.ts
 * and never goes through this client.
 */

function unwrap<T>(response: unknown): T {
    const r = response as { data?: T };
    return (r?.data ?? response) as T;
}

/** Laravel paginators arrive as { data: { data: [], meta } }. */
function unwrapList<T>(response: unknown): { items: T[]; total: number } {
    const outer = response as { data?: { data?: T[]; total?: number; meta?: { total?: number } } };
    const inner = outer?.data;
    return {
        items: inner?.data ?? (Array.isArray(inner) ? (inner as T[]) : []),
        total: inner?.total ?? inner?.meta?.total ?? 0,
    };
}

export interface LinkListParams {
    search?: string;
    per_page?: number;
}

export const linkService = {
    getLinks: async (params: LinkListParams = {}): Promise<{ items: ShortLink[]; total: number }> => {
        const response = await apiClient.get('/admin/links', { params });
        return unwrapList<ShortLink>(response);
    },

    createLink: async (payload: SaveShortLinkPayload): Promise<ShortLink> => {
        const response = await apiClient.post('/admin/links', payload);
        return unwrap<ShortLink>(response);
    },

    /**
     * Rename, re-date, or repoint.
     *
     * Repointing a live link is deliberate, not an oversight — it is why the
     * redirect answers 302 rather than 301. A mistyped target on a link already
     * sitting in 28,000 inboxes is fixable here instead of being a wasted send.
     */
    updateLink: async (id: number, payload: SaveShortLinkPayload): Promise<ShortLink> => {
        const response = await apiClient.patch(`/admin/links/${id}`, payload);
        return unwrap<ShortLink>(response);
    },

    deleteLink: async (id: number): Promise<void> => {
        await apiClient.delete(`/admin/links/${id}`);
    },
};
