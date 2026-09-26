import apiClient from '../client';
import type {
    AdminOpeningRow,
    BranchOpening,
    ChecklistItem,
    CheckAnswer,
    OpeningAnswer,
} from '@/types/opening';

/** The response interceptor already returns the body, so this is one unwrap. */
function extractData<T>(response: unknown): T {
    const r = response as { data?: T };
    return (r?.data ?? response) as T;
}

/** Which screen the manager is on, for the record: the till or the staff portal. */
export type OpeningVia = 'pos' | 'portal';

export interface AnswerPayload {
    answer?: CheckAnswer | null;
    value?: string | number | null;
    note?: string | null;
}

export const openingService = {
    // ── The manager ────────────────────────────────────────────────────────
    get: async (branchId: number): Promise<BranchOpening> =>
        extractData(await apiClient.get(`/manager/branches/${branchId}/opening`)),

    start: async (branchId: number, via: OpeningVia): Promise<BranchOpening> =>
        extractData(await apiClient.post(`/manager/branches/${branchId}/opening`, { via })),

    answer: async (branchId: number, answerId: number, payload: AnswerPayload): Promise<OpeningAnswer> =>
        extractData(await apiClient.patch(`/manager/branches/${branchId}/opening/answers/${answerId}`, payload)),

    /** "Yes to all" for one set. Returns the lines it changed. */
    answerGroup: async (branchId: number, section: string, group: string | null): Promise<OpeningAnswer[]> =>
        extractData(await apiClient.post(`/manager/branches/${branchId}/opening/answer-group`, { section, group })),

    complete: async (branchId: number, via: OpeningVia, note?: string): Promise<BranchOpening> =>
        extractData(await apiClient.post(`/manager/branches/${branchId}/opening/complete`, { via, note: note || null })),

    resolve: async (branchId: number, answerId: number, note: string): Promise<OpeningAnswer> =>
        extractData(await apiClient.post(`/manager/branches/${branchId}/opening/answers/${answerId}/resolve`, { note })),

    addPhoto: async (branchId: number, answerId: number, file: File): Promise<OpeningAnswer> => {
        const form = new FormData();
        form.append('file', file);
        // The client defaults to JSON; axios fills in the boundary once it sees FormData.
        const response = await apiClient.post(`/manager/branches/${branchId}/opening/answers/${answerId}/photos`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return extractData(response);
    },

    removePhoto: async (branchId: number, photoId: number): Promise<OpeningAnswer> =>
        extractData(await apiClient.delete(`/manager/branches/${branchId}/opening/photos/${photoId}`)),

    // ── Anyone at the branch ───────────────────────────────────────────────
    status: async (branchId: number): Promise<BranchOpening> =>
        extractData(await apiClient.get(`/employee/branches/${branchId}/opening`)),

    // ── Head office ────────────────────────────────────────────────────────
    listForDay: async (date?: string): Promise<{ business_date: string; today: string; can_reset?: boolean; branches: AdminOpeningRow[] }> =>
        extractData(await apiClient.get('/admin/openings', { params: date ? { date } : {} })),

    show: async (openingId: number): Promise<BranchOpening> =>
        extractData(await apiClient.get(`/admin/openings/${openingId}`)),

    openWithoutChecklist: async (branchId: number, reason: string): Promise<BranchOpening> =>
        extractData(await apiClient.post(`/admin/branches/${branchId}/open-without-checklist`, { reason })),

    /** Beta only: throw today's opening away so the morning can be run again. */
    reset: async (branchId: number): Promise<void> => {
        await apiClient.post(`/admin/branches/${branchId}/opening/reset`);
    },

    setRequirement: async (branchId: number, required: boolean): Promise<{ requires_opening_checklist: boolean }> =>
        extractData(await apiClient.patch(`/admin/branches/${branchId}/opening-requirement`, { required })),

    checklist: async (): Promise<ChecklistItem[]> =>
        extractData(await apiClient.get('/admin/opening-checklist')),

    updateItem: async (id: number, patch: Partial<ChecklistItem>): Promise<ChecklistItem> =>
        extractData(await apiClient.patch(`/admin/opening-checklist/${id}`, patch)),

    createItem: async (item: Pick<ChecklistItem, 'section' | 'group' | 'label' | 'short' | 'help' | 'kind' | 'weight' | 'allows_na'>): Promise<ChecklistItem> =>
        extractData(await apiClient.post('/admin/opening-checklist', item)),
};
